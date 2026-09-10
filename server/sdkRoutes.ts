import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export function createSdkRouter(workspaceDir: string): Router {
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

  // Known standard Android API platform catalog for reference
  const PLATFORM_CATALOG = [
    { apiLevel: 35, version: 'Android 15 (Vanilla Ice Cream)', revision: 1, releaseDate: '2024' },
    { apiLevel: 34, version: 'Android 14 (Upside Down Cake)', revision: 3, releaseDate: '2023' },
    { apiLevel: 33, version: 'Android 13 (Tiramisu)', revision: 3, releaseDate: '2022' },
    { apiLevel: 32, version: 'Android 12L (Sv2)', revision: 1, releaseDate: '2022' },
    { apiLevel: 31, version: 'Android 12 (Snow Cone)', revision: 1, releaseDate: '2021' },
    { apiLevel: 30, version: 'Android 11 (Red Velvet Cake)', revision: 3, releaseDate: '2020' },
    { apiLevel: 29, version: 'Android 10 (Quince Tart)', revision: 5, releaseDate: '2019' },
    { apiLevel: 28, version: 'Android 9.0 (Pie)', revision: 6, releaseDate: '2018' },
    { apiLevel: 26, version: 'Android 8.0 (Oreo)', revision: 2, releaseDate: '2017' },
    { apiLevel: 24, version: 'Android 7.0 (Nougat)', revision: 2, releaseDate: '2016' },
    { apiLevel: 21, version: 'Android 5.0 (Lollipop)', revision: 2, releaseDate: '2014' },
  ];

  // 1. GET /api/sdk/status
  // Comprehensive, real inspection of Android SDK and host toolchains
  router.get('/status', async (req, res) => {
    try {
      const androidHomeEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '';
      const candidateSdkDirs = [
        androidHomeEnv,
        '/usr/lib/android-sdk',
        '/opt/android-sdk',
        path.join(process.env.HOME || '/root', 'Android', 'Sdk'),
        '/android-sdk',
      ].filter(Boolean);

      let detectedSdkDir = '';
      for (const cDir of candidateSdkDirs) {
        if (fs.existsSync(cDir)) {
          detectedSdkDir = cDir;
          break;
        }
      }

      const hasSdk = Boolean(detectedSdkDir);
      const platformsDir = hasSdk ? path.join(detectedSdkDir, 'platforms') : '';
      const buildToolsDir = hasSdk ? path.join(detectedSdkDir, 'build-tools') : '';

      const installedPlatforms: string[] = [];
      if (platformsDir && fs.existsSync(platformsDir)) {
        try {
          const entries = fs.readdirSync(platformsDir);
          for (const e of entries) {
            if (e.startsWith('android-')) {
              installedPlatforms.push(e);
            }
          }
        } catch (e) {
          // ignore
        }
      }

      const installedBuildTools: string[] = [];
      if (buildToolsDir && fs.existsSync(buildToolsDir)) {
        try {
          const entries = fs.readdirSync(buildToolsDir);
          for (const e of entries) {
            if (fs.statSync(path.join(buildToolsDir, e)).isDirectory()) {
              installedBuildTools.push(e);
            }
          }
        } catch (e) {
          // ignore
        }
      }

      const [javaInfo, gradleInfo, adbInfo, aapt2Info, d8Info, apksignerInfo, zipalignInfo, sdkmanagerInfo] = await Promise.all([
        probeCommand('java'),
        probeCommand('gradle'),
        probeCommand('adb'),
        probeCommand('aapt2'),
        probeCommand('d8'),
        probeCommand('apksigner'),
        probeCommand('zipalign'),
        probeCommand('sdkmanager'),
      ]);

      const javaHome = process.env.JAVA_HOME || '';
      const isEnvironmentLimited = !hasSdk || !javaInfo.available || !sdkmanagerInfo.available;

      const limitationReasons: string[] = [];
      if (!javaInfo.available) {
        limitationReasons.push('Java Development Kit (JDK 17+) is not installed in the container environment.');
      }
      if (!hasSdk) {
        limitationReasons.push('Android SDK directory (ANDROID_HOME) is not found in standard system paths.');
      }
      if (!sdkmanagerInfo.available) {
        limitationReasons.push('sdkmanager binary is not available in PATH; direct package downloads are limited by sandbox.');
      }

      res.json({
        success: true,
        status: isEnvironmentLimited ? 'LIMITED_BY_ENVIRONMENT' : 'AVAILABLE',
        isEnvironmentLimited,
        limitationReason: limitationReasons.length > 0 ? limitationReasons.join(' ') : undefined,
        limitationDetails: limitationReasons,
        sdkLocation: detectedSdkDir || null,
        environmentVariables: {
          ANDROID_HOME: process.env.ANDROID_HOME || 'Not Set',
          ANDROID_SDK_ROOT: process.env.ANDROID_SDK_ROOT || 'Not Set',
          JAVA_HOME: javaHome || 'Not Set',
        },
        scannedDirectories: candidateSdkDirs,
        platforms: {
          count: installedPlatforms.length,
          installed: installedPlatforms,
        },
        buildTools: {
          count: installedBuildTools.length,
          installed: installedBuildTools,
        },
        tools: {
          java: javaInfo,
          gradle: gradleInfo,
          adb: adbInfo,
          sdkmanager: sdkmanagerInfo,
          aapt2: aapt2Info,
          d8: d8Info,
          apksigner: apksignerInfo,
          zipalign: zipalignInfo,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. GET /api/sdk/packages
  // Returns list of platform catalogs with strictly verified installation status on disk
  router.get('/packages', (req, res) => {
    try {
      const androidHomeEnv = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '';
      const candidateSdkDirs = [
        androidHomeEnv,
        '/usr/lib/android-sdk',
        '/opt/android-sdk',
        path.join(process.env.HOME || '/root', 'Android', 'Sdk'),
        '/android-sdk',
      ].filter(Boolean);

      let detectedSdkDir = '';
      for (const cDir of candidateSdkDirs) {
        if (fs.existsSync(cDir)) {
          detectedSdkDir = cDir;
          break;
        }
      }

      const platformsDir = detectedSdkDir ? path.join(detectedSdkDir, 'platforms') : '';
      const installedOnDisk: Set<number> = new Set();

      if (platformsDir && fs.existsSync(platformsDir)) {
        try {
          const entries = fs.readdirSync(platformsDir);
          for (const e of entries) {
            const match = e.match(/^android-(\d+)$/);
            if (match) {
              installedOnDisk.add(parseInt(match[1], 10));
            }
          }
        } catch (e) {
          // ignore
        }
      }

      const platforms = PLATFORM_CATALOG.map(p => ({
        ...p,
        packagePath: `platforms;android-${p.apiLevel}`,
        isInstalled: installedOnDisk.has(p.apiLevel),
        status: installedOnDisk.has(p.apiLevel) ? 'INSTALLED' : 'NOT_INSTALLED',
      }));

      res.json({
        success: true,
        sdkLocation: detectedSdkDir || null,
        hasInstalledPackages: installedOnDisk.size > 0,
        platforms,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. POST /api/sdk/install
  // Honest package installation handler — will not pretend to install if sdkmanager is missing
  router.post('/install', async (req, res) => {
    const { packagePath } = req.body;
    if (!packagePath) {
      return res.status(400).json({ success: false, error: 'packagePath is required' });
    }

    const sdkmanagerProbe = await probeCommand('sdkmanager');
    if (!sdkmanagerProbe.available) {
      return res.status(400).json({
        success: false,
        status: 'LIMITED_BY_ENVIRONMENT',
        error: 'INSTALLATION LIMITED BY CONTAINER SANDBOX',
        reason: 'The "sdkmanager" command-line tool is not installed in the current environment. Packages cannot be downloaded automatically.',
        packagePath,
      });
    }

    // If sdkmanager is available, execute with license accept
    exec(`yes | sdkmanager "${packagePath}"`, { timeout: 120000 }, (err, stdout, stderr) => {
      if (err) {
        return res.status(500).json({
          success: false,
          status: 'FAILED',
          error: err.message,
          stdout,
          stderr,
        });
      }
      res.json({
        success: true,
        status: 'INSTALLED',
        packagePath,
        stdout,
      });
    });
  });

  return router;
}
