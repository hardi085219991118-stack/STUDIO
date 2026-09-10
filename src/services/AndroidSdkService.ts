export interface SdkToolInfo {
  available: boolean;
  version: string;
  path: string;
}

export interface SdkStatusResponse {
  success: boolean;
  status: 'AVAILABLE' | 'LIMITED_BY_ENVIRONMENT';
  isEnvironmentLimited: boolean;
  limitationReason?: string;
  limitationDetails: string[];
  sdkLocation: string | null;
  environmentVariables: {
    ANDROID_HOME: string;
    ANDROID_SDK_ROOT: string;
    JAVA_HOME: string;
  };
  scannedDirectories: string[];
  platforms: {
    count: number;
    installed: string[];
  };
  buildTools: {
    count: number;
    installed: string[];
  };
  tools: {
    java: SdkToolInfo;
    gradle: SdkToolInfo;
    adb: SdkToolInfo;
    sdkmanager: SdkToolInfo;
    aapt2: SdkToolInfo;
    d8: SdkToolInfo;
    apksigner: SdkToolInfo;
    zipalign: SdkToolInfo;
  };
}

export interface SdkPlatformItem {
  apiLevel: number;
  version: string;
  revision: number;
  releaseDate: string;
  packagePath: string;
  isInstalled: boolean;
  status: 'INSTALLED' | 'NOT_INSTALLED';
}

export interface SdkPackagesResponse {
  success: boolean;
  sdkLocation: string | null;
  hasInstalledPackages: boolean;
  platforms: SdkPlatformItem[];
}

export class AndroidSdkService {
  static async getStatus(): Promise<SdkStatusResponse> {
    try {
      const res = await fetch('/api/sdk/status');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        status: 'LIMITED_BY_ENVIRONMENT',
        isEnvironmentLimited: true,
        limitationReason: 'Failed to query host SDK status: ' + err.message,
        limitationDetails: ['Unable to communicate with container backend probe.'],
        sdkLocation: null,
        environmentVariables: {
          ANDROID_HOME: 'Unreachable',
          ANDROID_SDK_ROOT: 'Unreachable',
          JAVA_HOME: 'Unreachable',
        },
        scannedDirectories: [],
        platforms: { count: 0, installed: [] },
        buildTools: { count: 0, installed: [] },
        tools: {
          java: { available: false, version: 'N/A', path: '' },
          gradle: { available: false, version: 'N/A', path: '' },
          adb: { available: false, version: 'N/A', path: '' },
          sdkmanager: { available: false, version: 'N/A', path: '' },
          aapt2: { available: false, version: 'N/A', path: '' },
          d8: { available: false, version: 'N/A', path: '' },
          apksigner: { available: false, version: 'N/A', path: '' },
          zipalign: { available: false, version: 'N/A', path: '' },
        },
      };
    }
  }

  static async getPackages(): Promise<SdkPackagesResponse> {
    try {
      const res = await fetch('/api/sdk/packages');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err) {
      return {
        success: false,
        sdkLocation: null,
        hasInstalledPackages: false,
        platforms: [],
      };
    }
  }

  static async installPackage(packagePath: string): Promise<{ success: boolean; status: string; reason?: string; error?: string }> {
    try {
      const res = await fetch('/api/sdk/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packagePath }),
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        status: 'LIMITED_BY_ENVIRONMENT',
        reason: err.message,
      };
    }
  }
}
