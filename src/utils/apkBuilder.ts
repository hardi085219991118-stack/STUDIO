import { ProjectFile, ProjectConfig, BuildResult, BuildLogEntry } from '../types';

/**
 * assembleAndroidApk
 * 
 * ANTI-FAKE POLICY COMPLIANCE:
 * - NO synthetic JSZip container generation.
 * - NO synthetic classes.dex, resources.arsc, or mock CERT.RSA.
 * - NO fabricated apksigner or D8 success claims.
 * 
 * This module probes the real build environment. If native Android toolchain
 * (JDK 17+, Gradle, Android SDK platforms;android-34) is present, it invokes
 * the genuine backend Gradle compiler. If absent, it truthfully reports
 * BUILD_LIMITED_BY_ENVIRONMENT with exact missing dependencies.
 */
export async function assembleAndroidApk(
  config: ProjectConfig,
  files: ProjectFile[],
  task: 'assembleDebug' | 'assembleRelease',
  onLog: (log: BuildLogEntry) => void
): Promise<BuildResult> {
  const startTime = Date.now();
  const logs: BuildLogEntry[] = [];

  const addLog = (
    phase: BuildLogEntry['phase'],
    level: BuildLogEntry['level'],
    message: string,
    filePath?: string,
    lineNumber?: number
  ) => {
    const entry: BuildLogEntry = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      phase,
      level,
      message,
      filePath,
      lineNumber,
    };
    logs.push(entry);
    onLog(entry);
  };

  try {
    addLog('INITIALIZATION', 'info', `Verifying Android Build Environment for project '${config.name}'...`);
    
    // 1. Probe native toolchain on server
    const envRes = await fetch('/api/build/environment');
    const envData = await envRes.json();

    const javaOk = envData.tools?.java?.available;
    const gradleOk = envData.tools?.gradle?.available;
    const sdkOk = envData.tools?.androidSdk?.available;

    addLog(
      'INITIALIZATION',
      javaOk ? 'info' : 'warn',
      `JDK: ${javaOk ? `Detected (${envData.tools.java.version})` : 'NOT FOUND (Required: OpenJDK 17+)'}`
    );
    addLog(
      'INITIALIZATION',
      gradleOk ? 'info' : 'warn',
      `Gradle: ${gradleOk ? `Detected (${envData.tools.gradle.version})` : 'NOT FOUND (Required: Gradle 8.0+)'}`
    );
    addLog(
      'INITIALIZATION',
      sdkOk ? 'info' : 'warn',
      `Android SDK: ${sdkOk ? `Detected (${envData.tools.androidSdk.path})` : 'NOT FOUND (Required: ANDROID_HOME / platforms;android-34)'}`
    );

    // If native build toolchain is missing: return BUILD_LIMITED_BY_ENVIRONMENT
    if (!envData.isBuildReady) {
      const missingTools: string[] = [];
      if (!javaOk) missingTools.push('OpenJDK 17+');
      if (!gradleOk) missingTools.push('Gradle 8.0+');
      if (!sdkOk) missingTools.push('Android SDK (API 34, AAPT2, D8, apksigner)');

      const reason = `Native Android build toolchain incomplete in environment: missing ${missingTools.join(', ')}.`;

      addLog('FAILED', 'error', `STATUS: BUILD LIMITED BY ENVIRONMENT`);
      addLog('FAILED', 'error', reason);
      addLog('FAILED', 'warn', `Under Anti-Fake rules, no synthetic ZIP/APK will be fabricated. Native toolchain execution is required to produce real .apk artifacts.`);

      return {
        success: false,
        task,
        durationMs: Date.now() - startTime,
        logs,
        errorSummary: {
          file: 'build.gradle.kts',
          line: 1,
          message: 'BUILD LIMITED BY ENVIRONMENT: ' + reason,
          stackTrace: 'Native execution blocked: Install JDK and Android SDK Command-Line Tools to enable compilation.',
        },
      };
    }

    // 2. If toolchain is ready, invoke real Gradle build on server
    addLog('COMPILATION', 'info', `Executing genuine Gradle task: ${task}...`);
    const gradRes = await fetch('/api/build/gradle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        task,
        projectName: config.name,
      }),
    });

    const gradData = await gradRes.json();
    const duration = Date.now() - startTime;

    if (gradData.success) {
      addLog('SUCCESS', 'success', `BUILD SUCCESSFUL in ${(duration / 1000).toFixed(1)}s`);
      if (gradData.apkPath) {
        addLog('SUCCESS', 'success', `Verified Artifact: ${gradData.apkPath} (${gradData.apkSizeFormatted})`);
      }
      return {
        success: true,
        task,
        durationMs: duration,
        apkName: gradData.apkName,
        apkPath: gradData.apkPath,
        apkSizeFormatted: gradData.apkSizeFormatted,
        apkSizeBytes: gradData.apkSizeBytes,
        logs: [...logs, ...(gradData.logs || [])],
      };
    } else {
      addLog('FAILED', 'error', `BUILD FAILED: ${gradData.error || gradData.reason || 'Process exited with error'}`);
      return {
        success: false,
        task,
        durationMs: duration,
        logs: [...logs, ...(gradData.logs || [])],
        errorSummary: {
          file: 'build.gradle.kts',
          line: 1,
          message: gradData.error || gradData.reason || 'Gradle task failed',
          stackTrace: gradData.stderr || gradData.stdout || '',
        },
      };
    }
  } catch (err: any) {
    const duration = Date.now() - startTime;
    addLog('FAILED', 'error', `Build execution error: ${err.message}`);
    return {
      success: false,
      task,
      durationMs: duration,
      logs,
      errorSummary: {
        file: 'build.gradle.kts',
        line: 1,
        message: err.message || 'Build server request error',
        stackTrace: err.stack || '',
      },
    };
  }
}
