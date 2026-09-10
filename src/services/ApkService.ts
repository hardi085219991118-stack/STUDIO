import { ApkInfo } from '../types';

export class ApkService {
  static async listApks(projectName: string): Promise<ApkInfo[]> {
    try {
      const res = await fetch(`/api/apk/list?projectName=${encodeURIComponent(projectName)}`);
      const data = await res.json();
      return data.apks || [];
    } catch (err) {
      console.error('Failed to list APKs:', err);
      return [];
    }
  }

  static async validateApk(
    apkPath: string,
    projectName: string
  ): Promise<{ isValid: boolean; reason?: string; sizeFormatted: string }> {
    try {
      const res = await fetch('/api/apk/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apkPath, projectName }),
      });
      return await res.json();
    } catch (err: any) {
      return { isValid: false, reason: err.message, sizeFormatted: '0 B' };
    }
  }
}
