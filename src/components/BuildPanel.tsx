import React, { useState, useRef, useEffect } from 'react';
import { 
  CheckCircle2, XCircle, FileCheck, Download, 
  Share2, RefreshCw, AlertTriangle, ArrowRight, Smartphone,
  Cpu, Terminal, ShieldAlert, Check, Layers, Play
} from 'lucide-react';
import { BuildResult, BuildLogEntry, BuildStepPhase, BuildEnvironmentStatus, BuildTaskType } from '../types';

interface BuildPanelProps {
  buildResult: BuildResult | null;
  isBuilding: boolean;
  currentPhase: BuildStepPhase | null;
  liveLogs: BuildLogEntry[];
  onRetryBuild: (task?: BuildTaskType) => void;
  onNavigateToFile?: (file: string, line: number) => void;
  environmentStatus?: BuildEnvironmentStatus | null;
  onRefreshEnvironment?: () => void;
}

export const BuildPanel: React.FC<BuildPanelProps> = ({
  buildResult,
  isBuilding,
  currentPhase,
  liveLogs,
  onRetryBuild,
  onNavigateToFile,
  environmentStatus,
  onRefreshEnvironment,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'console' | 'environment' | 'tasks'>('console');
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [liveLogs]);

  const phases: { phase: BuildStepPhase; label: string }[] = [
    { phase: 'INITIALIZATION', label: 'Init' },
    { phase: 'CONFIGURATION', label: 'Config' },
    { phase: 'COMPILATION', label: 'Compile' },
    { phase: 'AAPT', label: 'AAPT2' },
    { phase: 'DEX', label: 'D8 Dex' },
    { phase: 'PACKAGING', label: 'Package' },
    { phase: 'SIGNING', label: 'Sign' },
  ];

  const handleDownloadApk = () => {
    if (!buildResult?.apkName) return;
    const downloadUrl = `/api/download/apk?name=${encodeURIComponent(buildResult.apkName)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = buildResult.apkName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShareApk = async () => {
    if (navigator.share && buildResult?.apkName) {
      try {
        await navigator.share({
          title: 'Android Studio Mobile APK Output',
          text: `Download compiled Android APK: ${buildResult.apkName}`,
          url: window.location.href,
        });
      } catch (err) {
        // user canceled
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('APK Link copied to clipboard!');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#18191c] text-[#bcbec4] select-none text-xs font-mono overflow-hidden">
      {/* Top Sub-navigation Bar */}
      <div className="bg-[#1e1f22] border-b border-[#2b2d30] px-3 py-1 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveSubTab('console')}
            className={`px-2.5 py-1 rounded text-xs transition-colors ${
              activeSubTab === 'console'
                ? 'bg-[#2b2d30] text-white font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Build Console
          </button>
          <button
            onClick={() => setActiveSubTab('environment')}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'environment'
                ? 'bg-[#2b2d30] text-white font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Build Environment</span>
            {environmentStatus && !environmentStatus.isBuildReady && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#f4a261]" title="Incomplete Toolchain" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab('tasks')}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
              activeSubTab === 'tasks'
                ? 'bg-[#2b2d30] text-white font-semibold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Gradle Tasks</span>
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center space-x-2">
          {activeSubTab === 'environment' && onRefreshEnvironment && (
            <button
              onClick={onRefreshEnvironment}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#2b2d30] hover:bg-[#3574f0] text-gray-200 hover:text-white text-[11px]"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Probe Toolchain</span>
            </button>
          )}

          {activeSubTab === 'console' && (
            <button
              onClick={() => onRetryBuild('assembleDebug')}
              disabled={isBuilding}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white text-[11px] font-medium disabled:opacity-40"
            >
              {isBuilding ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Building...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-white" />
                  <span>Run Build</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Areas */}
      {activeSubTab === 'console' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Build Status Bar */}
          <div className="bg-[#1e1f22]/70 border-b border-[#2b2d30] px-3 py-1.5 flex items-center justify-between text-[11px]">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-300">Target: :app:assembleDebug</span>
              {isBuilding && (
                <span className="flex items-center text-[#3574f0] font-medium gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Running Gradle check...
                </span>
              )}
              {buildResult && !isBuilding && (
                buildResult.success ? (
                  <span className="flex items-center text-[#3ddc84] font-bold gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    BUILD SUCCESSFUL ({(buildResult.durationMs / 1000).toFixed(1)}s)
                  </span>
                ) : buildResult.errorSummary?.message?.includes('ENVIRONMENT') || !environmentStatus?.isBuildReady ? (
                  <span className="flex items-center text-[#f4a261] font-bold gap-1 bg-[#f4a261]/10 px-1.5 py-0.5 rounded">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#f4a261]" />
                    BUILD LIMITED BY ENVIRONMENT
                  </span>
                ) : (
                  <span className="flex items-center text-[#f25c54] font-bold gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    BUILD FAILED ({(buildResult.durationMs / 1000).toFixed(1)}s)
                  </span>
                )
              )}
            </div>
          </div>

          {/* Environment Limitation Banner (Strict user anti-falsu requirement) */}
          {buildResult && !buildResult.success && (!environmentStatus?.isBuildReady || buildResult.errorSummary?.message?.includes('ENVIRONMENT')) && (
            <div className="bg-[#2a2418] border-b border-[#f4a261]/40 p-3 text-xs">
              <div className="flex items-start space-x-2 text-[#f4a261]">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#f4a261]" />
                <div className="space-y-1">
                  <div className="font-bold text-white text-xs">BUILD LIMITED BY ENVIRONMENT</div>
                  <div className="text-gray-300 text-[11px] leading-relaxed">
                    Android/Gradle build toolchain (JDK 17+, Android SDK 34, AAPT2, D8) is not installed in the current container sandbox.
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono bg-black/40 p-2 rounded mt-1">
                    <div>Status: BUILD TOOLCHAIN INCOMPLETE</div>
                    <div>Required: JDK 17+ (Java), Gradle 8.0+, Android SDK 34 (platforms;android-34, build-tools;34.0.0)</div>
                    <div className="text-gray-300 mt-1">Native execution command: <span className="text-[#3ddc84]">./gradlew assembleDebug</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* APK Output Box (When Successful) */}
          {buildResult?.success && (
            <div className="bg-[#121316] border-b border-[#2b2d30] p-3 text-xs">
              <div className="bg-[#1e1f22] border border-[#3ddc84]/40 rounded-lg p-3 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded bg-[#3ddc84]/20 text-[#3ddc84] flex items-center justify-center">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{buildResult.apkName || 'app-debug.apk'}</div>
                      <div className="text-[10px] text-gray-400">
                        Location: {buildResult.apkPath || 'app/build/outputs/apk/debug/app-debug.apk'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      id="btn-download-apk"
                      onClick={handleDownloadApk}
                      className="px-3 py-1.5 rounded-md bg-[#3ddc84] hover:bg-[#46e68d] text-[#121316] font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>DOWNLOAD APK</span>
                    </button>
                    <button
                      id="btn-share-apk"
                      onClick={handleShareApk}
                      className="px-2.5 py-1.5 rounded-md bg-[#2b2d30] hover:bg-[#35373c] text-gray-200 text-xs flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>SHARE</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Compilation Error Breakdown (When Real Code Syntax Fails) */}
          {buildResult && !buildResult.success && buildResult.errorSummary && !buildResult.errorSummary.message.includes('ENVIRONMENT') && (
            <div className="bg-[#2b1d1d] border-b border-[#f25c54]/30 p-3 text-xs">
              <div className="flex items-start space-x-2 text-[#f25c54]">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">
                    Build Error in {buildResult.errorSummary.file} (Line {buildResult.errorSummary.line})
                  </div>
                  <div className="text-gray-300 text-[11px] mt-0.5">{buildResult.errorSummary.message}</div>
                  {buildResult.errorSummary.stackTrace && (
                    <pre className="mt-2 text-[10px] bg-black/40 p-2 rounded text-red-300 overflow-x-auto">
                      {buildResult.errorSummary.stackTrace}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Live Log Console */}
          <div ref={logContainerRef} className="flex-1 p-3 overflow-y-auto space-y-1 font-mono text-[11px] leading-relaxed">
            {liveLogs.length === 0 && !isBuilding && (
              <div className="text-gray-500 py-6 text-center">
                Click &quot;Run Build&quot; or press Ctrl+F9 to trigger Gradle compilation.
              </div>
            )}
            {liveLogs.map(log => (
              <div
                key={log.id}
                className={`flex items-start space-x-2 ${
                  log.level === 'error'
                    ? 'text-[#f25c54]'
                    : log.level === 'warn'
                    ? 'text-[#ffc107]'
                    : log.level === 'success'
                    ? 'text-[#3ddc84] font-semibold'
                    : 'text-[#bcbec4]'
                }`}
              >
                <span className="text-[#6c707e] text-[10px] select-none shrink-0">{log.timestamp}</span>
                <span className="text-gray-500 select-none shrink-0">[{log.phase}]</span>
                <span className="break-all whitespace-pre-wrap">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Build Environment Tab (Comprehensive toolchain detection required by Tahap 3) */}
      {activeSubTab === 'environment' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-[#2b2d30]">
            <div>
              <h3 className="font-bold text-white text-sm">BUILD ENVIRONMENT</h3>
              <p className="text-[11px] text-gray-400">
                System toolchain probe and SDK capability verification
              </p>
            </div>
            <div>
              {environmentStatus?.isBuildReady ? (
                <span className="px-2.5 py-1 rounded bg-[#3ddc84]/20 text-[#3ddc84] font-bold border border-[#3ddc84]/40 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  READY FOR ANDROID BUILD
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded bg-[#f4a261]/20 text-[#f4a261] font-bold border border-[#f4a261]/40 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  BUILD TOOLCHAIN INCOMPLETE
                </span>
              )}
            </div>
          </div>

          {/* Toolchain Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Java / JDK */}
            <div className="bg-[#1e1f22] border border-[#2b2d30] rounded p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Java / JDK</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  environmentStatus?.tools?.java?.available ? 'bg-[#3ddc84]/20 text-[#3ddc84]' : 'bg-[#f25c54]/20 text-[#f25c54]'
                }`}>
                  {environmentStatus?.tools?.java?.available ? 'AVAILABLE' : 'NOT AVAILABLE'}
                </span>
              </div>
              <div className="text-gray-400 text-[11px]">
                Version: <span className="text-gray-200">{environmentStatus?.tools?.java?.version || 'Not Detected'}</span>
              </div>
              <div className="text-gray-500 text-[10px]">
                Target: JDK 17 (LTS) • Path: {environmentStatus?.tools?.java?.path || 'N/A'}
              </div>
            </div>

            {/* Gradle */}
            <div className="bg-[#1e1f22] border border-[#2b2d30] rounded p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Gradle</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  environmentStatus?.tools?.gradle?.available ? 'bg-[#3ddc84]/20 text-[#3ddc84]' : 'bg-[#f25c54]/20 text-[#f25c54]'
                }`}>
                  {environmentStatus?.tools?.gradle?.available ? 'AVAILABLE' : 'NOT AVAILABLE'}
                </span>
              </div>
              <div className="text-gray-400 text-[11px]">
                Version: <span className="text-gray-200">{environmentStatus?.tools?.gradle?.version || 'Not Detected'}</span>
              </div>
              <div className="text-gray-500 text-[10px]">
                Target: Gradle 8.7 • Gradle Wrapper: gradlew
              </div>
            </div>

            {/* Android SDK */}
            <div className="bg-[#1e1f22] border border-[#2b2d30] rounded p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Android SDK</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  environmentStatus?.tools?.androidSdk?.available ? 'bg-[#3ddc84]/20 text-[#3ddc84]' : 'bg-[#f25c54]/20 text-[#f25c54]'
                }`}>
                  {environmentStatus?.tools?.androidSdk?.available ? 'AVAILABLE' : 'NOT AVAILABLE'}
                </span>
              </div>
              <div className="text-gray-400 text-[11px]">
                Compile SDK: <span className="text-gray-200">API 34 (Android 14)</span>
              </div>
              <div className="text-gray-500 text-[10px] truncate">
                Path: {environmentStatus?.tools?.androidSdk?.path || 'ANDROID_HOME not set'}
              </div>
            </div>

            {/* AAPT2 */}
            <div className="bg-[#1e1f22] border border-[#2b2d30] rounded p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">AAPT2 (Resource Compiler)</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  environmentStatus?.tools?.aapt2?.available ? 'bg-[#3ddc84]/20 text-[#3ddc84]' : 'bg-[#f25c54]/20 text-[#f25c54]'
                }`}>
                  {environmentStatus?.tools?.aapt2?.available ? 'AVAILABLE' : 'NOT AVAILABLE'}
                </span>
              </div>
              <div className="text-gray-400 text-[11px]">
                Version: <span className="text-gray-200">{environmentStatus?.tools?.aapt2?.version || 'Not Detected'}</span>
              </div>
              <div className="text-gray-500 text-[10px]">
                Component: Android Asset Packaging Tool v2
              </div>
            </div>

            {/* D8 / R8 */}
            <div className="bg-[#1e1f22] border border-[#2b2d30] rounded p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">D8 / R8 (Dexer)</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  environmentStatus?.tools?.d8?.available ? 'bg-[#3ddc84]/20 text-[#3ddc84]' : 'bg-[#f25c54]/20 text-[#f25c54]'
                }`}>
                  {environmentStatus?.tools?.d8?.available ? 'AVAILABLE' : 'NOT AVAILABLE'}
                </span>
              </div>
              <div className="text-gray-400 text-[11px]">
                Version: <span className="text-gray-200">{environmentStatus?.tools?.d8?.version || 'Not Detected'}</span>
              </div>
              <div className="text-gray-500 text-[10px]">
                Component: Dalvik Bytecode Converter (classes.dex)
              </div>
            </div>

            {/* Operating Environment */}
            <div className="bg-[#1e1f22] border border-[#2b2d30] rounded p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Operating Environment</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#3574f0]/20 text-[#3574f0]">
                  CONTAINER
                </span>
              </div>
              <div className="text-gray-400 text-[11px]">
                Platform: <span className="text-gray-200">{environmentStatus?.platform || 'Linux'} ({environmentStatus?.arch || 'x86_64'})</span>
              </div>
              <div className="text-gray-500 text-[10px]">
                Node Runtime: {environmentStatus?.nodeVersion || 'v20+'}
              </div>
            </div>
          </div>

          {/* Explanation Box */}
          <div className="bg-[#1e1f22] border border-[#2b2d30] rounded p-3 space-y-2">
            <h4 className="font-bold text-white text-xs">Architectural Notes on Mobile Android IDE</h4>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              When Android Studio Mobile runs inside this container sandbox, external compilation requires the standard Android toolchain. In a native Android deployment (e.g. on Android hardware via Termux or native embedded AAPT2/D8 binaries), Gradle commands invoke local binaries directly without simulation.
            </p>
          </div>
        </div>
      )}

      {/* Gradle Tasks Tab */}
      {activeSubTab === 'tasks' && (
        <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono text-xs">
          <h3 className="font-bold text-white text-sm mb-2">GRADLE TASKS</h3>
          <p className="text-[11px] text-gray-400 mb-3">
            Select a Gradle task to execute against the active project
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={() => onRetryBuild('assembleDebug')}
              disabled={isBuilding}
              className="p-3 bg-[#1e1f22] hover:bg-[#2b2d30] border border-[#2b2d30] rounded text-left transition-colors group"
            >
              <div className="font-bold text-white group-hover:text-[#3574f0] flex items-center justify-between">
                <span>:app:assembleDebug</span>
                <Play className="w-3 h-3 text-[#3574f0]" />
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Assembles debug APK package with debug certificate signing.
              </div>
            </button>

            <button
              onClick={() => onRetryBuild('assembleRelease')}
              disabled={isBuilding}
              className="p-3 bg-[#1e1f22] hover:bg-[#2b2d30] border border-[#2b2d30] rounded text-left transition-colors group"
            >
              <div className="font-bold text-white group-hover:text-[#3574f0] flex items-center justify-between">
                <span>:app:assembleRelease</span>
                <Play className="w-3 h-3 text-[#3574f0]" />
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Assembles release APK (requires signing key configuration).
              </div>
            </button>

            <button
              onClick={() => onRetryBuild('clean')}
              disabled={isBuilding}
              className="p-3 bg-[#1e1f22] hover:bg-[#2b2d30] border border-[#2b2d30] rounded text-left transition-colors group"
            >
              <div className="font-bold text-white group-hover:text-[#3574f0] flex items-center justify-between">
                <span>:app:clean</span>
                <Play className="w-3 h-3 text-[#3574f0]" />
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Deletes previous build outputs in build/ and clean intermediate caches.
              </div>
            </button>

            <button
              onClick={() => onRetryBuild('lint')}
              disabled={isBuilding}
              className="p-3 bg-[#1e1f22] hover:bg-[#2b2d30] border border-[#2b2d30] rounded text-left transition-colors group"
            >
              <div className="font-bold text-white group-hover:text-[#3574f0] flex items-center justify-between">
                <span>:app:lint</span>
                <Play className="w-3 h-3 text-[#3574f0]" />
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Runs Android lint analysis across layouts, resources, and Kotlin/Java code.
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
