import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export function createGradleRouter(workspaceDir: string): Router {
  const router = Router();

  function probeCommand(cmd: string): Promise<{ available: boolean; version: string; path: string }> {
    return new Promise((resolve) => {
      exec(`which ${cmd}`, (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve({ available: false, version: 'Not Found', path: '' });
        } else {
          const binPath = stdout.trim();
          exec(`${cmd} --version || ${cmd} -version || ${cmd} version`, { timeout: 3000 }, (vErr, vOut, vStderr) => {
            const rawVersion = (vOut || vStderr || '').split('\n')[0].trim();
            resolve({
              available: true,
              version: rawVersion || 'Detected',
              path: binPath,
            });
          });
        }
      });
    });
  }

  // 1. POST /api/gradle/sync
  // Real Gradle Sync Execution & Dependency Verification
  router.post('/sync', async (req, res) => {
    const { projectName = 'MyApplication', files } = req.body;
    const safeProjectName = path.basename(projectName);
    const projectDir = path.join(workspaceDir, safeProjectName);

    // If files were supplied in request, ensure they are written to disk before sync
    if (Array.isArray(files) && files.length > 0) {
      try {
        fs.mkdirSync(projectDir, { recursive: true });
        for (const file of files) {
          if (file.path && file.content !== undefined) {
            const dest = path.join(projectDir, file.path);
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.writeFileSync(dest, file.content, 'utf-8');
          }
        }
      } catch (e: any) {
        console.warn('Failed to sync files to disk:', e.message);
      }
    }

    const [javaInfo, gradleInfo] = await Promise.all([
      probeCommand('java'),
      probeCommand('gradle'),
    ]);

    const hasGradlew = fs.existsSync(path.join(projectDir, 'gradlew'));

    // If Java is missing, Gradle sync CANNOT run natively
    if (!javaInfo.available) {
      return res.json({
        success: false,
        status: 'LIMITED_BY_ENVIRONMENT',
        syncStatus: 'LIMITED_BY_ENVIRONMENT',
        message: 'Gradle Sync cannot execute native dependency resolution.',
        reason: 'Java Development Kit (JDK 17+) is not installed in the container environment. The Gradle Daemon requires a valid JVM to resolve dependencies and build scripts.',
        logs: [
          `[GradleSync] Starting Gradle Sync for project: ${safeProjectName}`,
          `[GradleSync] Checking toolchain requirements...`,
          `[GradleSync] Java (JDK): NOT FOUND (JAVA_HOME is unset)`,
          `[GradleSync] Gradle: ${gradleInfo.available ? gradleInfo.version : 'NOT FOUND'}`,
          `[GradleSync] gradlew wrapper script: ${hasGradlew ? 'Found' : 'Not Found'}`,
          `[GradleSync] ERROR: Cannot launch Gradle daemon without JDK 17+.`,
          `[GradleSync] STATUS: LIMITED_BY_ENVIRONMENT.`,
        ],
        timestamp: new Date().toISOString(),
      });
    }

    // If Java is available, execute real gradle sync via tasks dry-run or help
    const syncCmd = hasGradlew ? `./gradlew tasks --dry-run` : `gradle tasks --dry-run`;
    const startTime = Date.now();

    exec(syncCmd, { cwd: projectDir, timeout: 60000 }, (error, stdout, stderr) => {
      const durationMs = Date.now() - startTime;
      const isSuccess = !error;

      res.json({
        success: isSuccess,
        status: isSuccess ? 'SUCCESS' : 'FAILED',
        syncStatus: isSuccess ? 'SUCCESS' : 'FAILED',
        durationMs,
        stdout,
        stderr,
        exitCode: error ? error.code || 1 : 0,
        logs: (stdout || stderr || '').split('\n').filter(Boolean),
        timestamp: new Date().toISOString(),
      });
    });
  });

  // 2. GET /api/gradle/dependencies
  // Parses declared dependencies and version catalog from project files on disk
  router.get('/dependencies', (req, res) => {
    try {
      const { projectName = 'MyApplication' } = req.query;
      const safeProjectName = path.basename(projectName as string);
      const projectDir = path.join(workspaceDir, safeProjectName);

      const candidateFiles = [
        path.join(projectDir, 'app', 'build.gradle.kts'),
        path.join(projectDir, 'app', 'build.gradle'),
        path.join(projectDir, 'build.gradle.kts'),
      ];

      let buildGradleContent = '';
      let buildGradlePath = '';
      for (const cf of candidateFiles) {
        if (fs.existsSync(cf)) {
          buildGradleContent = fs.readFileSync(cf, 'utf-8');
          buildGradlePath = cf;
          break;
        }
      }

      const versionCatalogPath = path.join(projectDir, 'gradle', 'libs.versions.toml');
      let versionCatalogContent = '';
      if (fs.existsSync(versionCatalogPath)) {
        versionCatalogContent = fs.readFileSync(versionCatalogPath, 'utf-8');
      }

      // Regex parser for build.gradle dependencies
      const declaredDependencies: Array<{
        scope: string;
        notation: string;
        group?: string;
        name?: string;
        version?: string;
        isCatalogRef: boolean;
      }> = [];

      const depRegex = /(implementation|api|compileOnly|runtimeOnly|testImplementation|androidTestImplementation|debugImplementation)\s*(?:\(\s*["']([^"']+)["']\s*\)|\s*["']([^"']+)["']|\(\s*libs\.([a-zA-Z0-9_.-]+)\s*\))/g;
      let match;
      while ((match = depRegex.exec(buildGradleContent)) !== null) {
        const scope = match[1];
        const notation = match[2] || match[3] || (match[4] ? `libs.${match[4]}` : '');
        const isCatalogRef = Boolean(match[4]);

        let group = '';
        let name = '';
        let version = '';
        if (!isCatalogRef && notation.includes(':')) {
          const parts = notation.split(':');
          group = parts[0];
          name = parts[1];
          version = parts[2] || '';
        }

        declaredDependencies.push({
          scope,
          notation,
          group,
          name,
          version,
          isCatalogRef,
        });
      }

      // Parser for libs.versions.toml
      const catalogVersions: Record<string, string> = {};
      const catalogLibraries: Array<{ alias: string; group: string; name: string; versionRef?: string; version?: string }> = [];
      const catalogPlugins: Array<{ alias: string; id: string; versionRef?: string }> = [];

      if (versionCatalogContent) {
        // [versions]
        const versionsSection = versionCatalogContent.match(/\[versions\]([\s\S]*?)(?:\[|$)/);
        if (versionsSection) {
          const lines = versionsSection[1].split('\n');
          for (const l of lines) {
            const vMatch = l.match(/^\s*([a-zA-Z0-9_-]+)\s*=\s*["']([^"']+)["']/);
            if (vMatch) {
              catalogVersions[vMatch[1]] = vMatch[2];
            }
          }
        }

        // [libraries]
        const libSection = versionCatalogContent.match(/\[libraries\]([\s\S]*?)(?:\[|$)/);
        if (libSection) {
          const lines = libSection[1].split('\n');
          for (const l of lines) {
            const lMatch = l.match(/^\s*([a-zA-Z0-9_-]+)\s*=\s*\{([\s\S]*?)\}/);
            if (lMatch) {
              const alias = lMatch[1];
              const body = lMatch[2];
              const groupM = body.match(/group\s*=\s*["']([^"']+)["']/);
              const nameM = body.match(/name\s*=\s*["']([^"']+)["']/);
              const vRefM = body.match(/version\.ref\s*=\s*["']([^"']+)["']/);
              const verM = body.match(/version\s*=\s*["']([^"']+)["']/);

              catalogLibraries.push({
                alias,
                group: groupM ? groupM[1] : '',
                name: nameM ? nameM[1] : '',
                versionRef: vRefM ? vRefM[1] : undefined,
                version: verM ? verM[1] : (vRefM && catalogVersions[vRefM[1]] ? catalogVersions[vRefM[1]] : undefined),
              });
            }
          }
        }

        // [plugins]
        const pluginSection = versionCatalogContent.match(/\[plugins\]([\s\S]*?)(?:\[|$)/);
        if (pluginSection) {
          const lines = pluginSection[1].split('\n');
          for (const l of lines) {
            const pMatch = l.match(/^\s*([a-zA-Z0-9_-]+)\s*=\s*\{([\s\S]*?)\}/);
            if (pMatch) {
              const alias = pMatch[1];
              const body = pMatch[2];
              const idM = body.match(/id\s*=\s*["']([^"']+)["']/);
              const vRefM = body.match(/version\.ref\s*=\s*["']([^"']+)["']/);

              catalogPlugins.push({
                alias,
                id: idM ? idM[1] : '',
                versionRef: vRefM ? vRefM[1] : undefined,
              });
            }
          }
        }
      }

      res.json({
        success: true,
        projectDir,
        buildGradlePath,
        declaredDependencies,
        hasVersionCatalog: Boolean(versionCatalogContent),
        versionCatalog: {
          versions: catalogVersions,
          libraries: catalogLibraries,
          plugins: catalogPlugins,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
