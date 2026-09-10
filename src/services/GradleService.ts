import { ProjectFile } from '../types';

export interface GradleSyncResult {
  success: boolean;
  status: 'SUCCESS' | 'FAILED' | 'LIMITED_BY_ENVIRONMENT';
  syncStatus: string;
  message?: string;
  reason?: string;
  limitationReason?: string;
  details?: { stdout?: string; stderr?: string; exitCode?: number; [key: string]: any };
  durationMs?: number;
  stdout?: string;
  stderr?: string;
  logs: string[];
  timestamp: string;
}

export interface DeclaredDependency {
  scope: string;
  notation: string;
  group?: string;
  name?: string;
  version?: string;
  isCatalogRef: boolean;
}

export interface VersionCatalogData {
  versions: Record<string, string>;
  libraries: Array<{
    alias: string;
    group: string;
    name: string;
    versionRef?: string;
    version?: string;
  }>;
  plugins: Array<{
    alias: string;
    id: string;
    versionRef?: string;
  }>;
}

export interface DependenciesResponse {
  success: boolean;
  projectDir: string;
  buildGradlePath: string;
  declaredDependencies: DeclaredDependency[];
  hasVersionCatalog: boolean;
  versionCatalog: VersionCatalogData;
}

export class GradleService {
  static async syncProject(projectName: string, files?: ProjectFile[]): Promise<GradleSyncResult> {
    try {
      const res = await fetch('/api/gradle/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, files }),
      });
      return await res.json();
    } catch (err: any) {
      return {
        success: false,
        status: 'LIMITED_BY_ENVIRONMENT',
        syncStatus: 'LIMITED_BY_ENVIRONMENT',
        reason: 'Network or server error during Gradle Sync: ' + err.message,
        logs: [`[GradleSync] Exception: ${err.message}`],
        timestamp: new Date().toISOString(),
      };
    }
  }

  static async getDependencies(projectName: string): Promise<DependenciesResponse> {
    try {
      const res = await fetch(`/api/gradle/dependencies?projectName=${encodeURIComponent(projectName)}`);
      return await res.json();
    } catch (err) {
      return {
        success: false,
        projectDir: '',
        buildGradlePath: '',
        declaredDependencies: [],
        hasVersionCatalog: false,
        versionCatalog: { versions: {}, libraries: [], plugins: [] },
      };
    }
  }
}
