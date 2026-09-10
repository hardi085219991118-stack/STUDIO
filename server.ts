import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { createAdbRouter } from './server/adbRoutes';
import { createApkRouter } from './server/apkRoutes';
import { createGitRouter } from './server/gitRoutes';
import { createSdkRouter } from './server/sdkRoutes';
import { createGradleRouter } from './server/gradleRoutes';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Workspace storage directory
const WORKSPACE_DIR = path.join(process.cwd(), 'workspace', 'projects');
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

// Mount dedicated routers
app.use('/api/adb', createAdbRouter(WORKSPACE_DIR));
app.use('/api/apk', createApkRouter(WORKSPACE_DIR));
app.use('/api/git', createGitRouter(WORKSPACE_DIR));
app.use('/api/sdk', createSdkRouter(WORKSPACE_DIR));
app.use('/api/gradle', createGradleRouter(WORKSPACE_DIR));

// Helper: Safe path resolution to prevent path traversal
function resolveSafePath(projectName: string, relativePath: string): string {
  const safeProjectName = path.basename(projectName || 'MyApplication');
  const projectPath = path.join(WORKSPACE_DIR, safeProjectName);
  const resolved = path.resolve(projectPath, relativePath);
  if (!resolved.startsWith(projectPath)) {
    throw new Error('Access denied: Path traversal outside project directory');
  }
  return resolved;
}

// Helper: Check command existence and version
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

// 1. API: List Projects & Local Workspace Info
app.get('/api/projects', (req, res) => {
  try {
    const entries = fs.readdirSync(WORKSPACE_DIR, { withFileTypes: true });
    const projectList = entries
      .filter(e => e.isDirectory())
      .map(dir => {
        const pPath = path.join(WORKSPACE_DIR, dir.name);
        const configPath = path.join(pPath, 'project.json');
        let config = null;
        if (fs.existsSync(configPath)) {
          try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          } catch (e) {
            // fallback
          }
        }
        return {
          id: dir.name,
          name: config?.name || dir.name,
          path: pPath,
          config,
          lastOpened: config?.lastOpened || Date.now(),
        };
      });
    res.json({ success: true, projects: projectList });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. API: Terminal Command Execution
app.post('/api/terminal/exec', (req, res) => {
  const { command, cwd, projectName } = req.body;
  if (!command) {
    return res.status(400).json({ error: 'Command required' });
  }

  let executionCwd = process.cwd();
  if (projectName) {
    try {
      const pPath = path.join(WORKSPACE_DIR, path.basename(projectName));
      if (fs.existsSync(pPath)) {
        executionCwd = pPath;
      }
    } catch (e) {
      // fallback
    }
  } else if (cwd && fs.existsSync(cwd)) {
    executionCwd = cwd;
  }

  exec(command, { cwd: executionCwd, timeout: 30000, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
    res.json({
      stdout: stdout || '',
      stderr: stderr || '',
      exitCode: error ? error.code || 1 : 0,
      cwd: executionCwd,
    });
  });
});

// 3. API: Real Build Environment Toolchain Probe
app.get('/api/build/environment', async (req, res) => {
  try {
    const [javaInfo, gradleInfo, adbInfo, aapt2Info, d8Info, apksignerInfo, zipalignInfo] = await Promise.all([
      probeCommand('java'),
      probeCommand('gradle'),
      probeCommand('adb'),
      probeCommand('aapt2'),
      probeCommand('d8'),
      probeCommand('apksigner'),
      probeCommand('zipalign'),
    ]);

    const javaHome = process.env.JAVA_HOME || '';
    const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '';
    const hasAndroidSdk = Boolean(androidHome && fs.existsSync(androidHome));

    const isBuildReady = javaInfo.available && (gradleInfo.available || fs.existsSync(path.join(process.cwd(), 'gradlew'))) && hasAndroidSdk;
    const limitationReason = !isBuildReady
      ? 'Android build toolchain is incomplete in the current container sandbox: Java (JDK 17+), Gradle, and Android SDK (AAPT2/D8) are required for native APK compilation.'
      : undefined;

    res.json({
      success: true,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      isBuildReady,
      limitationReason,
      status: isBuildReady ? 'READY_FOR_ANDRIOD_BUILD' : 'BUILD_TOOLCHAIN_INCOMPLETE',
      tools: {
        java: {
          available: javaInfo.available,
          version: javaInfo.version,
          path: javaInfo.path,
          javaHome: javaHome || 'Not configured in environment',
          requiredVersion: '17+',
        },
        gradle: {
          available: gradleInfo.available,
          version: gradleInfo.version,
          path: gradleInfo.path,
          requiredVersion: '8.0+',
        },
        androidSdk: {
          available: hasAndroidSdk,
          path: androidHome || 'Not configured in environment (ANDROID_HOME)',
          compileSdk: 34,
        },
        aapt2: {
          available: aapt2Info.available,
          version: aapt2Info.version,
          path: aapt2Info.path,
        },
        d8: {
          available: d8Info.available,
          version: d8Info.version,
          path: d8Info.path,
        },
        apksigner: {
          available: apksignerInfo.available,
          version: apksignerInfo.version,
          path: apksignerInfo.path,
        },
        zipalign: {
          available: zipalignInfo.available,
          version: zipalignInfo.version,
          path: zipalignInfo.path,
        },
        adb: {
          available: adbInfo.available,
          version: adbInfo.version,
          path: adbInfo.path,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. API: System Info & Real ADB Status (No Fake Devices)
app.get('/api/system/status', async (req, res) => {
  const adbInfo = await probeCommand('adb');
  let adbDevices: any[] = [];
  let adbStatus: 'online' | 'limited' | 'offline' = 'limited';
  let limitationMessage = 'No physical Android device or ADB bridge daemon connected in current container sandbox.';

  if (adbInfo.available) {
    try {
      const stdout = await new Promise<string>((resolve) => {
        exec('adb devices -l', { timeout: 4000 }, (err, out) => resolve(out || ''));
      });
      const lines = stdout.split('\n').slice(1);
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('*')) {
          const parts = trimmed.split(/\s+/);
          if (parts.length >= 2) {
            adbDevices.push({
              id: parts[0],
              status: parts[1],
              name: parts[0],
              model: parts.find(p => p.startsWith('model:'))?.replace('model:', '') || 'Android Device',
              connectionType: parts[0].includes(':') ? 'Wireless ADB' : 'USB',
              isReal: true,
            });
          }
        }
      }
      if (adbDevices.length > 0) {
        adbStatus = 'online';
        limitationMessage = '';
      }
    } catch (e) {
      // ignore
    }
  }

  res.json({
    status: adbStatus,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    adbAvailable: adbInfo.available,
    limitationMessage: limitationMessage || undefined,
    devices: adbDevices, // Real devices only - empty if none connected
  });
});

// 5. API: Save File to Disk with Traversal Protection
app.post('/api/fs/write', (req, res) => {
  try {
    const { relativePath, content, projectName } = req.body;
    if (!relativePath) {
      return res.status(400).json({ success: false, error: 'relativePath is required' });
    }
    const fullPath = resolveSafePath(projectName, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content ?? '', 'utf-8');
    res.json({ success: true, path: relativePath, fullPath });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. API: Read File from Disk
app.get('/api/fs/read', (req, res) => {
  try {
    const { relativePath, projectName } = req.query;
    if (!relativePath) {
      return res.status(400).json({ success: false, error: 'relativePath is required' });
    }
    const fullPath = resolveSafePath(projectName as string, relativePath as string);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ success: true, content, path: relativePath });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. API: Delete File or Directory
app.post('/api/fs/delete', (req, res) => {
  try {
    const { relativePath, projectName } = req.body;
    if (!relativePath) {
      return res.status(400).json({ success: false, error: 'relativePath is required' });
    }
    const fullPath = resolveSafePath(projectName, relativePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'Target not found' });
    }
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    res.json({ success: true, path: relativePath });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. API: Rename File or Directory
app.post('/api/fs/rename', (req, res) => {
  try {
    const { oldRelativePath, newRelativePath, projectName } = req.body;
    if (!oldRelativePath || !newRelativePath) {
      return res.status(400).json({ success: false, error: 'oldRelativePath and newRelativePath are required' });
    }
    const oldFullPath = resolveSafePath(projectName, oldRelativePath);
    const newFullPath = resolveSafePath(projectName, newRelativePath);
    if (!fs.existsSync(oldFullPath)) {
      return res.status(404).json({ success: false, error: 'Source file does not exist' });
    }
    if (fs.existsSync(newFullPath)) {
      return res.status(400).json({ success: false, error: 'A file with that name already exists' });
    }
    fs.mkdirSync(path.dirname(newFullPath), { recursive: true });
    fs.renameSync(oldFullPath, newFullPath);
    res.json({ success: true, oldPath: oldRelativePath, newPath: newRelativePath });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. API: Create Directory (mkdir)
app.post('/api/fs/mkdir', (req, res) => {
  try {
    const { relativePath, projectName } = req.body;
    if (!relativePath) {
      return res.status(400).json({ success: false, error: 'relativePath is required' });
    }
    const fullPath = resolveSafePath(projectName, relativePath);
    fs.mkdirSync(fullPath, { recursive: true });
    res.json({ success: true, path: relativePath });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. API: Save Entire Project to Disk
app.post('/api/fs/save-project', (req, res) => {
  try {
    const { config, files } = req.body;
    if (!config || !config.name || !Array.isArray(files)) {
      return res.status(400).json({ success: false, error: 'Invalid project payload' });
    }
    const safeName = path.basename(config.name);
    const projectPath = path.join(WORKSPACE_DIR, safeName);
    fs.mkdirSync(projectPath, { recursive: true });

    // Write metadata
    fs.writeFileSync(path.join(projectPath, 'project.json'), JSON.stringify(config, null, 2), 'utf-8');

    // Write files
    for (const f of files) {
      if (f.path && f.content !== undefined) {
        const fPath = path.join(projectPath, f.path);
        fs.mkdirSync(path.dirname(fPath), { recursive: true });
        fs.writeFileSync(fPath, f.content, 'utf-8');
      }
    }
    res.json({ success: true, projectName: safeName, fileCount: files.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. API: Real Gradle Build / Build Verification (Non-Falsified)
app.post('/api/build/gradle', async (req, res) => {
  const { projectName, task = 'assembleDebug' } = req.body;
  const projectDir = path.join(WORKSPACE_DIR, path.basename(projectName || 'MyApplication'));

  const [javaInfo, gradleInfo] = await Promise.all([
    probeCommand('java'),
    probeCommand('gradle'),
  ]);

  const hasGradlew = fs.existsSync(path.join(projectDir, 'gradlew'));

  if (!javaInfo.available) {
    return res.json({
      success: false,
      status: 'BUILD_LIMITED_BY_ENVIRONMENT',
      error: 'BUILD LIMITED BY ENVIRONMENT',
      reason: 'Java Development Kit (JDK 17+) is not installed in the container environment. Android Gradle Plugin cannot execute without a valid JVM.',
      logs: [
        {
          id: 'log-1',
          timestamp: new Date().toLocaleTimeString(),
          phase: 'INITIALIZATION',
          level: 'error',
          message: 'ERROR: JAVA_HOME is not set and no "java" command could be found in your PATH.',
        },
        {
          id: 'log-2',
          timestamp: new Date().toLocaleTimeString(),
          phase: 'INITIALIZATION',
          level: 'warn',
          message: 'STATUS: BUILD LIMITED BY ENVIRONMENT. Native JDK and Android SDK toolchain missing in container.',
        },
      ],
    });
  }

  // If java is available, execute real command
  const gradleCmd = hasGradlew ? `./gradlew ${task}` : `gradle ${task}`;
  const startTime = Date.now();

  exec(gradleCmd, { cwd: projectDir, timeout: 120000 }, (error, stdout, stderr) => {
    const durationMs = Date.now() - startTime;
    const isCommandSuccess = !error;

    // Scan for actual APK artifact on disk
    const searchDirs = [
      path.join(projectDir, 'app', 'build', 'outputs', 'apk', 'debug'),
      path.join(projectDir, 'app', 'build', 'outputs', 'apk', 'release'),
      path.join(projectDir, 'build', 'outputs', 'apk'),
      path.join(WORKSPACE_DIR, 'builds'),
    ];

    let foundApk: { path: string; name: string; sizeBytes: number; sizeFormatted: string } | null = null;

    for (const sDir of searchDirs) {
      if (fs.existsSync(sDir)) {
        try {
          const files = fs.readdirSync(sDir);
          for (const f of files) {
            if (f.endsWith('.apk')) {
              const fullP = path.join(sDir, f);
              const stat = fs.statSync(fullP);
              if (stat.size > 0) {
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(stat.size) / Math.log(k));
                const formatted = parseFloat((stat.size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                foundApk = {
                  path: fullP,
                  name: f,
                  sizeBytes: stat.size,
                  sizeFormatted: formatted,
                };
                break;
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }
      if (foundApk) break;
    }

    // Strict Build Verification:
    // If task was assembleDebug/assembleRelease and no APK was generated, build is not considered successful!
    const isAssemble = task.toLowerCase().includes('assemble');
    const finalSuccess = isCommandSuccess && (!isAssemble || foundApk !== null);

    let status = 'BUILD_SUCCESSFUL';
    if (!isCommandSuccess) {
      status = 'BUILD_FAILED';
    } else if (isAssemble && !foundApk) {
      status = 'BUILD_FAILED';
    }

    res.json({
      success: finalSuccess,
      status,
      task,
      stdout,
      stderr,
      exitCode: error ? error.code || 1 : 0,
      durationMs,
      apkPath: foundApk?.path,
      apkName: foundApk?.name,
      apkSizeBytes: foundApk?.sizeBytes,
      apkSizeFormatted: foundApk?.sizeFormatted,
      error: !finalSuccess ? (error ? error.message : 'Task finished but no APK artifact was found.') : undefined,
      logs: [
        {
          id: 'log-1',
          timestamp: new Date().toLocaleTimeString(),
          phase: 'COMPILATION',
          level: finalSuccess ? 'success' : 'error',
          message: stdout || stderr || (finalSuccess ? 'BUILD SUCCESSFUL' : 'BUILD FAILED'),
        },
        ...(foundApk ? [{
          id: 'log-apk',
          timestamp: new Date().toLocaleTimeString(),
          phase: 'PACKAGING',
          level: 'success' as const,
          message: `Verified APK Artifact: ${foundApk.name} (${foundApk.sizeFormatted}) at ${foundApk.path}`,
        }] : []),
      ],
    });
  });
});

// 6. API: Download Real APK (Strict Anti-Fake - No synthetic/placeholder responses)
app.get('/api/download/apk', (req, res) => {
  const { name, projectName } = req.query;
  const fileName = (name as string) || 'app-debug.apk';
  const safeProjectName = path.basename((projectName as string) || 'MyApplication');

  const searchLocations = [
    path.join(WORKSPACE_DIR, 'builds', fileName),
    path.join(WORKSPACE_DIR, safeProjectName, 'app', 'build', 'outputs', 'apk', 'debug', fileName),
    path.join(WORKSPACE_DIR, safeProjectName, 'app', 'build', 'outputs', 'apk', 'release', fileName),
    path.join(WORKSPACE_DIR, safeProjectName, 'build', 'outputs', 'apk', fileName),
  ];

  const foundPath = searchLocations.find(p => fs.existsSync(p) && fs.statSync(p).size > 0);

  if (foundPath) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(foundPath)}"`);
    const stream = fs.createReadStream(foundPath);
    stream.pipe(res);
  } else {
    // Strictly NO fake fallback PK buffer
    res.status(404).json({
      success: false,
      status: 'APK_NOT_FOUND',
      message: 'No real APK artifact was generated.',
    });
  }
});

async function startServer() {
  // Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Android Studio Mobile Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
