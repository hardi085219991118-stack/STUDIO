import { Router } from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export function createAdbRouter(workspaceDir: string): Router {
  const router = Router();

  function probeAdb(): Promise<{ available: boolean; version: string; path: string }> {
    return new Promise((resolve) => {
      exec('which adb', (err, stdout) => {
        if (err || !stdout.trim()) {
          resolve({ available: false, version: 'Not Found', path: '' });
        } else {
          const binPath = stdout.trim();
          exec('adb version', { timeout: 3000 }, (vErr, vOut) => {
            const rawVersion = (vOut || '').split('\n')[0].trim();
            resolve({
              available: true,
              version: rawVersion || 'Android Debug Bridge',
              path: binPath,
            });
          });
        }
      });
    });
  }

  // 1. Check ADB Availability & Status
  router.get('/status', async (req, res) => {
    try {
      const adbInfo = await probeAdb();
      res.json({
        success: true,
        available: adbInfo.available,
        version: adbInfo.version,
        path: adbInfo.path,
        limitationReason: !adbInfo.available
          ? 'ADB (Android Debug Bridge) is not installed in the container environment. Physical USB and network device discovery are currently limited.'
          : undefined,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Real Device Discovery (No fake devices!)
  router.get('/devices', async (req, res) => {
    try {
      const adbInfo = await probeAdb();
      if (!adbInfo.available) {
        return res.json({
          success: true,
          available: false,
          limitationReason: 'ADB binary not found in container environment. Physical device detection is limited by environment.',
          devices: [], // Strictly no fake devices
        });
      }

      // Execute real adb devices -l
      exec('adb devices -l', { timeout: 5000 }, (err, stdout) => {
        if (err) {
          return res.json({
            success: true,
            available: true,
            limitationReason: `Failed to query ADB daemon: ${err.message}`,
            devices: [],
          });
        }

        const lines = stdout.split('\n').slice(1);
        const deviceList: any[] = [];

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('*')) {
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 2) {
              const serial = parts[0];
              const rawState = parts[1].toLowerCase();
              let status = 'OFFLINE';
              if (rawState === 'device') status = 'ONLINE';
              else if (rawState === 'unauthorized') status = 'UNAUTHORIZED';
              else if (rawState === 'offline') status = 'OFFLINE';

              const modelMatch = parts.find(p => p.startsWith('model:'));
              const productMatch = parts.find(p => p.startsWith('product:'));
              const deviceMatch = parts.find(p => p.startsWith('device:'));

              const modelName = modelMatch ? modelMatch.replace('model:', '').replace(/_/g, ' ') : serial;
              const connectionType = serial.includes(':') ? 'Wireless ADB' : 'USB';

              deviceList.push({
                id: serial,
                serial,
                name: modelName,
                model: modelName,
                androidVersion: 'Android Device',
                apiLevel: 34,
                architecture: 'arm64-v8a',
                connectionType,
                status,
                isDefault: deviceList.length === 0,
              });
            }
          }
        }

        res.json({
          success: true,
          available: true,
          devices: deviceList,
          limitationReason: deviceList.length === 0
            ? 'No physical or wireless Android device detected. Connect a device via USB with Debugging enabled or pair over Wireless ADB.'
            : undefined,
        });
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message, devices: [] });
    }
  });

  // 3. Wireless ADB Connect
  router.post('/connect', async (req, res) => {
    const { host, port } = req.body;
    if (!host || !port) {
      return res.status(400).json({ success: false, error: 'Host and port are required' });
    }

    const adbInfo = await probeAdb();
    if (!adbInfo.available) {
      return res.json({
        success: false,
        status: 'LIMITED_BY_ENVIRONMENT',
        limitationReason: 'WIRELESS ADB LIMITED BY ENVIRONMENT: adb binary is not installed in the container environment.',
      });
    }

    exec(`adb connect ${host}:${port}`, { timeout: 10000 }, (err, stdout, stderr) => {
      const output = (stdout || stderr || '').trim();
      const isConnected = output.toLowerCase().includes('connected');
      res.json({
        success: isConnected,
        output,
        host,
        port,
        error: !isConnected ? output : undefined,
      });
    });
  });

  // 4. Wireless ADB Pair
  router.post('/pair', async (req, res) => {
    const { host, port, code } = req.body;
    if (!host || !port || !code) {
      return res.status(400).json({ success: false, error: 'Host, port, and pairing code are required' });
    }

    const adbInfo = await probeAdb();
    if (!adbInfo.available) {
      return res.json({
        success: false,
        status: 'LIMITED_BY_ENVIRONMENT',
        limitationReason: 'WIRELESS ADB PAIRING LIMITED BY ENVIRONMENT: adb binary is not installed in the container.',
      });
    }

    exec(`adb pair ${host}:${port} ${code}`, { timeout: 10000 }, (err, stdout, stderr) => {
      const output = (stdout || stderr || '').trim();
      const isPaired = output.toLowerCase().includes('successfully paired');
      res.json({
        success: isPaired,
        output,
        error: !isPaired ? output : undefined,
      });
    });
  });

  // 5. Real APK Installation
  router.post('/install', async (req, res) => {
    const { serial, apkPath, projectName } = req.body;
    if (!apkPath) {
      return res.status(400).json({ success: false, error: 'apkPath is required' });
    }

    const adbInfo = await probeAdb();
    if (!adbInfo.available) {
      return res.json({
        success: false,
        status: 'LIMITED_BY_ENVIRONMENT',
        error: 'APK INSTALL LIMITED BY ENVIRONMENT',
        reason: 'Cannot install APK: ADB binary is not available in the container environment. A physical or remote ADB bridge daemon is required.',
      });
    }

    if (!serial) {
      return res.json({
        success: false,
        status: 'NO_DEVICE_CONNECTED',
        error: 'No target device selected for installation.',
      });
    }

    // Resolve real apk path
    let resolvedPath = apkPath;
    if (!path.isAbsolute(resolvedPath)) {
      resolvedPath = path.resolve(workspaceDir, projectName || '', apkPath);
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.json({
        success: false,
        status: 'FILE_NOT_FOUND',
        error: `Target APK file not found at: ${apkPath}`,
      });
    }

    exec(`adb -s ${serial} install -r "${resolvedPath}"`, { timeout: 60000 }, (err, stdout, stderr) => {
      const output = (stdout || stderr || '').trim();
      const isSuccess = output.includes('Success');

      res.json({
        success: isSuccess,
        status: isSuccess ? 'INSTALL_SUCCESS' : 'INSTALL_FAILED',
        output,
        error: !isSuccess ? output : undefined,
      });
    });
  });

  // 6. Launch App on Device
  router.post('/launch', async (req, res) => {
    const { serial, packageName, activityName, projectName } = req.body;
    if (!serial || !packageName) {
      return res.status(400).json({ success: false, error: 'serial and packageName are required' });
    }

    const adbInfo = await probeAdb();
    if (!adbInfo.available) {
      return res.json({
        success: false,
        status: 'LIMITED_BY_ENVIRONMENT',
        error: 'APP LAUNCH LIMITED BY ENVIRONMENT',
        reason: 'ADB is not installed in the container environment.',
      });
    }

    // Dynamic launcher activity detection from AndroidManifest.xml
    let resolvedActivity = activityName;
    if (!resolvedActivity && projectName) {
      try {
        const manifestPaths = [
          path.join(workspaceDir, projectName, 'app', 'src', 'main', 'AndroidManifest.xml'),
          path.join(workspaceDir, projectName, 'AndroidManifest.xml'),
        ];
        for (const mp of manifestPaths) {
          if (fs.existsSync(mp)) {
            const manifestXml = fs.readFileSync(mp, 'utf-8');
            const actRegex = /<activity\b([^>]*?)>([\s\S]*?)<\/activity>/gi;
            let m;
            while ((m = actRegex.exec(manifestXml)) !== null) {
              const body = m[2];
              if (body.includes('android.intent.action.MAIN') && body.includes('android.intent.category.LAUNCHER')) {
                const nameMatch = m[1].match(/android:name=["']([^"']+)["']/);
                if (nameMatch) {
                  resolvedActivity = nameMatch[1];
                  break;
                }
              }
            }
            if (resolvedActivity) break;
          }
        }
      } catch (e) {
        // Fallback below
      }
    }

    resolvedActivity = resolvedActivity || '.MainActivity';
    const target = resolvedActivity.startsWith('.') || resolvedActivity.includes('.')
      ? (resolvedActivity.startsWith('.') ? `${packageName}/${resolvedActivity}` : resolvedActivity.includes('/') ? resolvedActivity : `${packageName}/${resolvedActivity}`)
      : `${packageName}/.${resolvedActivity}`;

    exec(`adb -s ${serial} shell am start -n ${target}`, { timeout: 10000 }, (err, stdout, stderr) => {
      const output = (stdout || stderr || '').trim();
      const isError = err || output.toLowerCase().includes('error');
      res.json({
        success: !isError,
        status: isError ? 'LAUNCH_FAILED' : 'RUNNING',
        output,
        target,
        error: isError ? output : undefined,
      });
    });
  });

  // 7. Stop App on Device
  router.post('/stop', async (req, res) => {
    const { serial, packageName } = req.body;
    if (!serial || !packageName) {
      return res.status(400).json({ success: false, error: 'serial and packageName are required' });
    }

    const adbInfo = await probeAdb();
    if (!adbInfo.available) {
      return res.json({
        success: false,
        status: 'LIMITED_BY_ENVIRONMENT',
        reason: 'ADB is not installed in container.',
      });
    }

    exec(`adb -s ${serial} shell am force-stop ${packageName}`, { timeout: 8000 }, (err, stdout, stderr) => {
      res.json({
        success: !err,
        status: 'STOPPED',
        output: (stdout || stderr || '').trim(),
      });
    });
  });

  // 8. Real Logcat Output
  router.get('/logcat', async (req, res) => {
    const { serial, packageName, lines = '100' } = req.query;
    const adbInfo = await probeAdb();
    if (!adbInfo.available) {
      return res.json({
        success: false,
        status: 'LIMITED_BY_ENVIRONMENT',
        limitationReason: 'Real device Logcat streaming requires an active ADB daemon and connected device.',
        logs: [],
      });
    }

    if (!serial) {
      return res.json({
        success: false,
        error: 'No target device serial specified.',
        logs: [],
      });
    }

    const filterPkg = packageName ? ` --pid=$(adb -s ${serial} shell pidof -s ${packageName})` : '';
    exec(`adb -s ${serial} logcat -d -v time -t ${lines}`, { timeout: 6000 }, (err, stdout) => {
      if (err) {
        return res.json({ success: false, error: err.message, logs: [] });
      }
      res.json({
        success: true,
        output: stdout || '',
      });
    });
  });

  // 9. Execute Arbitrary ADB Shell
  router.post('/shell', async (req, res) => {
    const { serial, command } = req.body;
    if (!command) {
      return res.status(400).json({ success: false, error: 'Command is required' });
    }

    const adbInfo = await probeAdb();
    if (!adbInfo.available) {
      return res.json({
        success: false,
        limitationReason: 'ADB is not installed in the container environment.',
        output: 'LIMITED BY ENVIRONMENT: adb binary not found.',
      });
    }

    const targetDevice = serial ? `-s ${serial}` : '';
    exec(`adb ${targetDevice} shell "${command.replace(/"/g, '\\"')}"`, { timeout: 15000 }, (err, stdout, stderr) => {
      res.json({
        success: !err,
        stdout: stdout || '',
        stderr: stderr || '',
        exitCode: err ? err.code || 1 : 0,
      });
    });
  });

  return router;
}
