import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export interface ToolInfo {
  detected: boolean;
  version: string;
  path: string;
}

export interface BuildEnvironmentDiagnostics {
  overallStatus: 'READY_FOR_REAL_ANDROID_BUILD' | 'LIMITED_BY_ENVIRONMENT' | 'ANDROID_BUILD_ENVIRONMENT_UNAVAILABLE';
  isBuildReady: boolean;
  limitationReason?: string;
  missingTools: string[];
  java: {
    detected: boolean;
    version: string;
    javaHome: string;
    path: string;
  };
  androidSdk: {
    detected: boolean;
    sdkPath: string;
    androidHome: string;
    androidSdkRoot: string;
  };
  buildTools: {
    detected: boolean;
    version: string;
    installedVersions: string[];
  };
  platform: {
    detected: boolean;
    availableApiLevels: string[];
  };
  gradle: {
    detected: boolean;
    version: string;
    path: string;
    hasWrapper: boolean;
  };
  aapt2: ToolInfo;
  d8: ToolInfo;
  apksigner: ToolInfo;
  zipalign: ToolInfo;
  system: {
    platform: string;
    arch: string;
    nodeVersion: string;
    pathEnv: string;
  };
}

function probeCommand(cmd: string, timeout = 3000): Promise<ToolInfo> {
  return new Promise((resolve) => {
    exec(`which ${cmd}`, (err, stdout) => {
      if (err || !stdout.trim()) {
        resolve({ detected: false, version: 'Not detected', path: '' });
      } else {
        const binPath = stdout.trim();
        exec(`${cmd} --version || ${cmd} -version || ${cmd} version`, { timeout }, (vErr, vOut, vStderr) => {
          const firstLine = (vOut || vStderr || '').split('\n')[0].trim();
          resolve({
            detected: true,
            version: firstLine || 'Detected',
            path: binPath,
          });
        });
      }
    });
  });
}

/**
 * Automatically inspects the container environment without guessing or inventing fake paths.
 * Auto-resolves JAVA_HOME, ANDROID_HOME, and PATH if tools exist on disk.
 */
export async function detectBuildEnvironment(workspaceDir?: string): Promise<BuildEnvironmentDiagnostics> {
  // 1. Check/Auto-detect JAVA_HOME and JDK
  let javaHome = process.env.JAVA_HOME || '';
  if (!javaHome || !fs.existsSync(javaHome)) {
    // Check standard Linux JVM directories
    const candidateJvmRoots = [
      '/usr/lib/jvm/java-17-openjdk-amd64',
      '/usr/lib/jvm/default-java',
      '/usr/lib/jvm/java-21-openjdk-amd64',
      '/usr/lib/jvm/java-11-openjdk-amd64',
      '/usr/lib/jvm',
      '/opt/java',
      '/opt/jdk',
    ];

    for (const cRoot of candidateJvmRoots) {
      if (fs.existsSync(cRoot)) {
        // If it contains bin/java or bin/javac
        if (fs.existsSync(path.join(cRoot, 'bin', 'java')) || fs.existsSync(path.join(cRoot, 'bin', 'javac'))) {
          javaHome = cRoot;
          process.env.JAVA_HOME = javaHome;
          break;
        } else {
          // Check subdirectories
          try {
            const subs = fs.readdirSync(cRoot);
            for (const sub of subs) {
              const subPath = path.join(cRoot, sub);
              if (fs.existsSync(path.join(subPath, 'bin', 'javac')) || fs.existsSync(path.join(subPath, 'bin', 'java'))) {
                javaHome = subPath;
                process.env.JAVA_HOME = javaHome;
                break;
              }
            }
          } catch (e) {
            // ignore
          }
          if (javaHome) break;
        }
      }
    }
  }

  // 2. Check/Auto-detect ANDROID_HOME / ANDROID_SDK_ROOT
  let androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || '';
  const candidateSdkDirs = [
    androidHome,
    '/usr/lib/android-sdk',
    '/opt/android-sdk',
    path.join(process.env.HOME || '/root', 'Android', 'Sdk'),
    '/android-sdk',
    '/opt/android',
  ].filter(Boolean);

  let detectedSdkDir = '';
  for (const cDir of candidateSdkDirs) {
    if (fs.existsSync(cDir)) {
      detectedSdkDir = cDir;
      if (!process.env.ANDROID_HOME) process.env.ANDROID_HOME = detectedSdkDir;
      if (!process.env.ANDROID_SDK_ROOT) process.env.ANDROID_SDK_ROOT = detectedSdkDir;
      androidHome = detectedSdkDir;
      break;
    }
  }

  // Auto-augment PATH if Android SDK was detected
  if (detectedSdkDir) {
    const extraPaths = [
      path.join(detectedSdkDir, 'platform-tools'),
      path.join(detectedSdkDir, 'cmdline-tools', 'latest', 'bin'),
    ];
    const buildToolsDir = path.join(detectedSdkDir, 'build-tools');
    if (fs.existsSync(buildToolsDir)) {
      try {
        const btEntries = fs.readdirSync(buildToolsDir).filter(e => fs.statSync(path.join(buildToolsDir, e)).isDirectory());
        if (btEntries.length > 0) {
          extraPaths.push(path.join(buildToolsDir, btEntries.sort().reverse()[0]));
        }
      } catch (e) {
        // ignore
      }
    }

    const currentPath = process.env.PATH || '';
    for (const ep of extraPaths) {
      if (fs.existsSync(ep) && !currentPath.includes(ep)) {
        process.env.PATH = `${ep}:${process.env.PATH}`;
      }
    }
  }

  // Probe tools in PATH
  const [
    javaProbe,
    javacProbe,
    gradleProbe,
    aapt2Probe,
    d8Probe,
    apksignerProbe,
    zipalignProbe,
  ] = await Promise.all([
    probeCommand('java'),
    probeCommand('javac'),
    probeCommand('gradle'),
    probeCommand('aapt2'),
    probeCommand('d8'),
    probeCommand('apksigner'),
    probeCommand('zipalign'),
  ]);

  // Inspect installed Platforms
  const availableApiLevels: string[] = [];
  if (detectedSdkDir) {
    const platformsDir = path.join(detectedSdkDir, 'platforms');
    if (fs.existsSync(platformsDir)) {
      try {
        const entries = fs.readdirSync(platformsDir);
        for (const e of entries) {
          if (e.startsWith('android-')) {
            availableApiLevels.push(e);
          }
        }
      } catch (e) {
        // ignore
      }
    }
  }

  // Inspect installed Build-Tools
  const installedBuildTools: string[] = [];
  if (detectedSdkDir) {
    const buildToolsDir = path.join(detectedSdkDir, 'build-tools');
    if (fs.existsSync(buildToolsDir)) {
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
  }

  // Check gradlew in workspace or current directory
  let hasWrapper = fs.existsSync(path.join(process.cwd(), 'gradlew'));
  if (workspaceDir && !hasWrapper) {
    try {
      if (fs.existsSync(workspaceDir)) {
        const projects = fs.readdirSync(workspaceDir);
        for (const p of projects) {
          if (fs.existsSync(path.join(workspaceDir, p, 'gradlew'))) {
            hasWrapper = true;
            break;
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  // Missing tools tracking
  const missingTools: string[] = [];
  const javaDetected = javaProbe.detected || javacProbe.detected;
  if (!javaDetected) {
    missingTools.push('Java/JDK (JDK 17+ belum terpasang)');
  }
  const sdkDetected = Boolean(detectedSdkDir);
  if (!sdkDetected) {
    missingTools.push('Android SDK (ANDROID_HOME belum ditemukan)');
  }
  const buildToolsDetected = installedBuildTools.length > 0;
  if (!buildToolsDetected) {
    missingTools.push('Build Tools (misal: 34.0.0)');
  }
  const platformsDetected = availableApiLevels.length > 0;
  if (!platformsDetected) {
    missingTools.push('Android Platform API (misal: android-34)');
  }
  const gradleDetected = gradleProbe.detected || hasWrapper;
  if (!gradleDetected) {
    missingTools.push('Gradle / gradlew wrapper');
  }
  if (!aapt2Probe.detected) missingTools.push('AAPT2');
  if (!d8Probe.detected) missingTools.push('D8/R8 compiler');
  if (!apksignerProbe.detected) missingTools.push('apksigner');
  if (!zipalignProbe.detected) missingTools.push('zipalign');

  // Determine overall status
  let overallStatus: 'READY_FOR_REAL_ANDROID_BUILD' | 'LIMITED_BY_ENVIRONMENT' | 'ANDROID_BUILD_ENVIRONMENT_UNAVAILABLE';
  let limitationReason: string | undefined;

  const coreToolsAvailable = javaDetected && sdkDetected && buildToolsDetected && platformsDetected;

  if (coreToolsAvailable) {
    overallStatus = 'READY_FOR_REAL_ANDROID_BUILD';
  } else if (javaDetected || sdkDetected || gradleDetected) {
    overallStatus = 'LIMITED_BY_ENVIRONMENT';
    limitationReason = `Toolchain Android sebagian tersedia di lingkungan sistem, tetapi komponen berikut belum terpasang: ${missingTools.join(', ')}.`;
  } else {
    overallStatus = 'ANDROID_BUILD_ENVIRONMENT_UNAVAILABLE';
    limitationReason = 'Lingkungan build Android riil (JDK 17+ dan Android SDK) tidak tersedia di sandbox kontainer. Operasi build native dibatasi oleh lingkungan host.';
  }

  return {
    overallStatus,
    isBuildReady: overallStatus === 'READY_FOR_REAL_ANDROID_BUILD',
    limitationReason,
    missingTools,
    java: {
      detected: javaDetected,
      version: javaProbe.version || (javacProbe.detected ? javacProbe.version : 'Not detected'),
      javaHome: javaHome || (javaDetected ? 'Auto-detected in PATH' : 'Not detected'),
      path: javaProbe.path || javacProbe.path || '',
    },
    androidSdk: {
      detected: sdkDetected,
      sdkPath: detectedSdkDir || 'Not detected',
      androidHome: process.env.ANDROID_HOME || (detectedSdkDir || 'Not detected'),
      androidSdkRoot: process.env.ANDROID_SDK_ROOT || (detectedSdkDir || 'Not detected'),
    },
    buildTools: {
      detected: buildToolsDetected,
      version: installedBuildTools.sort().reverse()[0] || 'Not detected',
      installedVersions: installedBuildTools,
    },
    platform: {
      detected: platformsDetected,
      availableApiLevels,
    },
    gradle: {
      detected: gradleDetected,
      version: gradleProbe.version,
      path: gradleProbe.path,
      hasWrapper,
    },
    aapt2: aapt2Probe,
    d8: d8Probe,
    apksigner: apksignerProbe,
    zipalign: zipalignProbe,
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pathEnv: process.env.PATH || '',
    },
  };
}
