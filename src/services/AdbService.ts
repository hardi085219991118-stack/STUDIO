import { DeviceInfo } from '../types';

export class AdbService {
  static async getStatus(): Promise<{ available: boolean; version?: string; limitationReason?: string }> {
    try {
      const res = await fetch('/api/adb/status');
      return await res.json();
    } catch (err: any) {
      return { available: false, limitationReason: err.message };
    }
  }

  static async getDevices(): Promise<{ available: boolean; devices: DeviceInfo[]; limitationReason?: string }> {
    try {
      const res = await fetch('/api/adb/devices');
      const data = await res.json();
      return {
        available: data.available ?? false,
        devices: data.devices || [],
        limitationReason: data.limitationReason,
      };
    } catch (err: any) {
      return {
        available: false,
        devices: [],
        limitationReason: 'Failed to communicate with ADB service: ' + err.message,
      };
    }
  }

  static async connectWireless(host: string, port: string): Promise<{ success: boolean; output: string; error?: string }> {
    try {
      const res = await fetch('/api/adb/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, output: '', error: err.message };
    }
  }

  static async pairWireless(host: string, port: string, code: string): Promise<{ success: boolean; output: string; error?: string }> {
    try {
      const res = await fetch('/api/adb/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, code }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, output: '', error: err.message };
    }
  }

  static async installApk(
    serial: string,
    apkPath: string,
    projectName: string
  ): Promise<{ success: boolean; status: string; output?: string; error?: string; reason?: string }> {
    try {
      const res = await fetch('/api/adb/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial, apkPath, projectName }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, status: 'NETWORK_ERROR', error: err.message };
    }
  }

  static async launchApp(
    serial: string,
    packageName: string,
    activityName?: string
  ): Promise<{ success: boolean; status: string; output?: string; error?: string }> {
    try {
      const res = await fetch('/api/adb/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial, packageName, activityName }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, status: 'ERROR', error: err.message };
    }
  }

  static async stopApp(serial: string, packageName: string): Promise<{ success: boolean; status: string; output?: string }> {
    try {
      const res = await fetch('/api/adb/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial, packageName }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, status: 'ERROR', output: err.message };
    }
  }

  static async getLogcat(serial: string, packageName?: string, lines: number = 100): Promise<{ success: boolean; output?: string; limitationReason?: string; error?: string }> {
    try {
      const query = new URLSearchParams({
        serial,
        lines: lines.toString(),
      });
      if (packageName) query.append('packageName', packageName);

      const res = await fetch(`/api/adb/logcat?${query.toString()}`);
      return await res.json();
    } catch (err: any) {
      return { success: false, limitationReason: err.message };
    }
  }

  static async executeShell(serial: string | undefined, command: string): Promise<{ success: boolean; stdout: string; stderr: string; exitCode: number }> {
    try {
      const res = await fetch('/api/adb/shell', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serial, command }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, stdout: '', stderr: err.message, exitCode: 1 };
    }
  }
}
