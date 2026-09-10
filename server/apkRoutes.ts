import { Router } from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export function createApkRouter(workspaceDir: string): Router {
  const router = Router();

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function probeCommand(cmd: string): Promise<{ available: boolean; path: string }> {
    return new Promise((resolve) => {
      exec(`which ${cmd}`, (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve({ available: false, path: '' });
        } else {
          resolve({ available: true, path: stdout.trim() });
        }
      });
    });
  }

  // Real APK Validation using native tools (apksigner, aapt, or structural archive check)
  async function validateApkFile(fullPath: string): Promise<{
    isValid: boolean;
    status: 'NOT_FOUND' | 'FOUND' | 'UNVERIFIED' | 'VALIDATED' | 'INVALID' | 'LIMITED_BY_ENVIRONMENT';
    reason: string;
    hasZipMagic: boolean;
    hasManifest: boolean;
    hasDex: boolean;
    apksignerVerified: boolean;
    validationMethod: string;
  }> {
    if (!fs.existsSync(fullPath)) {
      return {
        isValid: false,
        status: 'NOT_FOUND',
        reason: 'APK file does not exist on disk',
        hasZipMagic: false,
        hasManifest: false,
        hasDex: false,
        apksignerVerified: false,
        validationMethod: 'Filesystem probe',
      };
    }

    const stat = fs.statSync(fullPath);
    if (stat.size === 0) {
      return {
        isValid: false,
        status: 'INVALID',
        reason: 'APK file size is 0 bytes (empty file)',
        hasZipMagic: false,
        hasManifest: false,
        hasDex: false,
        apksignerVerified: false,
        validationMethod: 'Filesystem probe',
      };
    }

    // 1. Check ZIP magic header (PK\x03\x04 -> 0x50, 0x4b, 0x03, 0x04)
    let hasZipMagic = false;
    try {
      const fd = fs.openSync(fullPath, 'r');
      const buffer = Buffer.alloc(4);
      fs.readSync(fd, buffer, 0, 4, 0);
      fs.closeSync(fd);
      hasZipMagic = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
    } catch (e: any) {
      return {
        isValid: false,
        status: 'INVALID',
        reason: `Failed to read file header: ${e.message}`,
        hasZipMagic: false,
        hasManifest: false,
        hasDex: false,
        apksignerVerified: false,
        validationMethod: 'Header check',
      };
    }

    if (!hasZipMagic) {
      return {
        isValid: false,
        status: 'INVALID',
        reason: 'Invalid file format: Missing ZIP header magic bytes (PK\\x03\\x04). File is not a valid archive.',
        hasZipMagic: false,
        hasManifest: false,
        hasDex: false,
        apksignerVerified: false,
        validationMethod: 'Header check',
      };
    }

    // 2. Check archive contents via unzip if available
    let hasManifest = false;
    let hasDex = false;
    const unzipProbe = await probeCommand('unzip');
    if (unzipProbe.available) {
      try {
        const fileListOut = await new Promise<string>((resolve) => {
          exec(`unzip -l "${fullPath}"`, { timeout: 8000 }, (err, stdout) => resolve(stdout || ''));
        });
        hasManifest = fileListOut.includes('AndroidManifest.xml');
        hasDex = fileListOut.includes('classes.dex');
      } catch (e) {
        // ignore
      }
    }

    // 3. Probe apksigner for genuine signature verification
    const apksignerProbe = await probeCommand('apksigner');
    if (apksignerProbe.available) {
      try {
        const verifyResult = await new Promise<{ code: number; stdout: string; stderr: string }>((resolve) => {
          exec(`apksigner verify --verbose "${fullPath}"`, { timeout: 15000 }, (err, stdout, stderr) => {
            resolve({ code: err ? (err.code || 1) : 0, stdout: stdout || '', stderr: stderr || '' });
          });
        });

        if (verifyResult.code === 0) {
          return {
            isValid: true,
            status: 'VALIDATED',
            reason: 'APK cryptographically verified with Android SDK apksigner (DOES verify against Android signatures).',
            hasZipMagic: true,
            hasManifest,
            hasDex,
            apksignerVerified: true,
            validationMethod: 'apksigner verify',
          };
        } else {
          return {
            isValid: false,
            status: 'INVALID',
            reason: `Signature verification failed: ${(verifyResult.stderr || verifyResult.stdout).trim() || 'Invalid signature blocks'}`,
            hasZipMagic: true,
            hasManifest,
            hasDex,
            apksignerVerified: false,
            validationMethod: 'apksigner verify',
          };
        }
      } catch (err: any) {
        return {
          isValid: false,
          status: 'INVALID',
          reason: `apksigner error: ${err.message}`,
          hasZipMagic: true,
          hasManifest,
          hasDex,
          apksignerVerified: false,
          validationMethod: 'apksigner verify',
        };
      }
    }

    // If apksigner is NOT installed in the container environment:
    // Strictly report UNVERIFIED or LIMITED_BY_ENVIRONMENT. NEVER claim "VALID APK" or "READY TO INSTALL".
    return {
      isValid: false,
      status: 'UNVERIFIED',
      reason: 'VALIDATION LIMITED BY ENVIRONMENT: apksigner tool is not available in the container. Archive contains ZIP magic bytes, but cryptographic signature and dex bytecode integrity cannot be verified.',
      hasZipMagic: true,
      hasManifest,
      hasDex,
      apksignerVerified: false,
      validationMethod: 'ZIP Header Only (apksigner missing)',
    };
  }

  // Extract metadata truthfully from APK or project source (NO hardcoded fake defaults)
  async function extractApkMetadata(
    fullPath: string,
    projectPath: string
  ): Promise<{
    packageName: string;
    versionName: string;
    versionCode: number | string;
    minSdk: number | string;
    targetSdk: number | string;
  }> {
    // 1. Try aapt / aapt2 dump badging
    const aapt2Probe = await probeCommand('aapt2');
    const aaptProbe = await probeCommand('aapt');
    const aaptBin = aapt2Probe.available ? 'aapt2 dump badging' : aaptProbe.available ? 'aapt dump badging' : null;

    if (aaptBin) {
      try {
        const dump = await new Promise<string>((resolve) => {
          exec(`${aaptBin} "${fullPath}"`, { timeout: 8000 }, (err, stdout) => resolve(stdout || ''));
        });

        const pkgMatch = dump.match(/package:\s+name='([^']+)'/);
        const vCodeMatch = dump.match(/versionCode='([^']+)'/);
        const vNameMatch = dump.match(/versionName='([^']+)'/);
        const minSdkMatch = dump.match(/sdkVersion:'([^']+)'/);
        const targetSdkMatch = dump.match(/targetSdkVersion:'([^']+)'/);

        if (pkgMatch) {
          return {
            packageName: pkgMatch[1],
            versionName: vNameMatch ? vNameMatch[1] : 'UNKNOWN',
            versionCode: vCodeMatch ? vCodeMatch[1] : 'UNKNOWN',
            minSdk: minSdkMatch ? minSdkMatch[1] : 'UNKNOWN',
            targetSdk: targetSdkMatch ? targetSdkMatch[1] : 'UNKNOWN',
          };
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. Fallback: Parse from actual project files on disk
    let packageName = 'UNKNOWN';
    let versionName = 'UNKNOWN';
    let versionCode: number | string = 'UNKNOWN';
    let minSdk: number | string = 'UNKNOWN';
    let targetSdk: number | string = 'UNKNOWN';

    // From project.json if saved
    const configPath = path.join(projectPath, 'project.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.packageName) packageName = config.packageName;
        if (config.versionName) versionName = config.versionName;
        if (config.versionCode !== undefined) versionCode = config.versionCode;
        if (config.minSdk !== undefined) minSdk = config.minSdk;
        if (config.targetSdk !== undefined) targetSdk = config.targetSdk;
      } catch (e) {
        // ignore
      }
    }

    // From AndroidManifest.xml if packageName still unknown
    const manifestPath = path.join(projectPath, 'app', 'src', 'main', 'AndroidManifest.xml');
    if (fs.existsSync(manifestPath) && packageName === 'UNKNOWN') {
      try {
        const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
        const pkgMatch = manifestContent.match(/package="([^"]+)"/);
        if (pkgMatch) packageName = pkgMatch[1];
      } catch (e) {
        // ignore
      }
    }

    // From build.gradle.kts / build.gradle
    const gradleKtsPath = path.join(projectPath, 'app', 'build.gradle.kts');
    const gradlePath = path.join(projectPath, 'app', 'build.gradle');
    const gPath = fs.existsSync(gradleKtsPath) ? gradleKtsPath : fs.existsSync(gradlePath) ? gradlePath : null;
    if (gPath) {
      try {
        const gContent = fs.readFileSync(gPath, 'utf-8');
        if (packageName === 'UNKNOWN') {
          const appIdMatch = gContent.match(/applicationId\s*=\s*"([^"]+)"/) || gContent.match(/namespace\s*=\s*"([^"]+)"/);
          if (appIdMatch) packageName = appIdMatch[1];
        }
        if (minSdk === 'UNKNOWN') {
          const minMatch = gContent.match(/minSdk\s*=\s*(\d+)/) || gContent.match(/minSdkVersion\s+(\d+)/);
          if (minMatch) minSdk = parseInt(minMatch[1], 10);
        }
        if (targetSdk === 'UNKNOWN') {
          const targetMatch = gContent.match(/targetSdk\s*=\s*(\d+)/) || gContent.match(/targetSdkVersion\s+(\d+)/);
          if (targetMatch) targetSdk = parseInt(targetMatch[1], 10);
        }
      } catch (e) {
        // ignore
      }
    }

    return {
      packageName,
      versionName,
      versionCode,
      minSdk,
      targetSdk,
    };
  }

  // 1. List Available APKs for Project
  router.get('/list', async (req, res) => {
    try {
      const { projectName } = req.query;
      const safeProjectName = path.basename((projectName as string) || 'MyApplication');
      const projectPath = path.join(workspaceDir, safeProjectName);
      const buildsDir = path.join(workspaceDir, 'builds');

      const searchDirs = [
        path.join(projectPath, 'app', 'build', 'outputs', 'apk', 'debug'),
        path.join(projectPath, 'app', 'build', 'outputs', 'apk', 'release'),
        path.join(projectPath, 'build', 'outputs', 'apk'),
        buildsDir,
      ];

      const foundApks: any[] = [];
      const seenPaths = new Set<string>();

      for (const dir of searchDirs) {
        if (fs.existsSync(dir)) {
          try {
            const files = fs.readdirSync(dir);
            for (const file of files) {
              if (file.endsWith('.apk')) {
                const fullPath = path.join(dir, file);
                if (seenPaths.has(fullPath)) continue;
                seenPaths.add(fullPath);

                const stat = fs.statSync(fullPath);
                const validation = await validateApkFile(fullPath);
                const metadata = await extractApkMetadata(fullPath, projectPath);

                const isDebug = file.toLowerCase().includes('debug');
                const isRelease = file.toLowerCase().includes('release');
                const buildVariant = isDebug ? 'debug' : isRelease ? 'release' : 'custom';

                foundApks.push({
                  fileName: file,
                  relativePath: path.relative(workspaceDir, fullPath),
                  fullPath,
                  sizeBytes: stat.size,
                  sizeFormatted: formatBytes(stat.size),
                  buildVariant,
                  packageName: metadata.packageName,
                  versionName: metadata.versionName,
                  versionCode: metadata.versionCode,
                  buildTime: stat.mtime.toLocaleString(),
                  status: validation.status,
                  isValid: validation.isValid,
                  validationDetails: {
                    hasZipMagic: validation.hasZipMagic,
                    hasManifest: validation.hasManifest,
                    hasDex: validation.hasDex,
                    apksignerVerified: validation.apksignerVerified,
                    validationMethod: validation.validationMethod,
                    reason: validation.reason,
                    minSdk: metadata.minSdk,
                    targetSdk: metadata.targetSdk,
                  },
                });
              }
            }
          } catch (e) {
            // ignore dir read error
          }
        }
      }

      res.json({
        success: true,
        apks: foundApks,
        count: foundApks.length,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message, apks: [] });
    }
  });

  // 2. Validate a specific APK
  router.post('/validate', async (req, res) => {
    try {
      const { apkPath, projectName } = req.body;
      if (!apkPath) {
        return res.status(400).json({ success: false, error: 'apkPath is required' });
      }

      let resolvedPath = apkPath;
      if (!path.isAbsolute(resolvedPath)) {
        resolvedPath = path.resolve(workspaceDir, projectName || '', apkPath);
      }

      const validation = await validateApkFile(resolvedPath);
      let stat = null;
      if (fs.existsSync(resolvedPath)) {
        stat = fs.statSync(resolvedPath);
      }

      res.json({
        success: true,
        path: resolvedPath,
        status: validation.status,
        isValid: validation.isValid,
        reason: validation.reason,
        hasZipMagic: validation.hasZipMagic,
        hasManifest: validation.hasManifest,
        hasDex: validation.hasDex,
        apksignerVerified: validation.apksignerVerified,
        validationMethod: validation.validationMethod,
        sizeBytes: stat?.size || 0,
        sizeFormatted: stat ? formatBytes(stat.size) : '0 B',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
