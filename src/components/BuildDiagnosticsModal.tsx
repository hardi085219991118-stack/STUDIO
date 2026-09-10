import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  X,
  Cpu,
  Layers,
  Wrench,
  Terminal,
  ShieldAlert,
  Info,
} from 'lucide-react';

export interface DiagnosticsData {
  overallStatus: 'READY_FOR_REAL_ANDROID_BUILD' | 'LIMITED_BY_ENVIRONMENT' | 'ANDROID_BUILD_ENVIRONMENT_UNAVAILABLE';
  isBuildReady: boolean;
  limitationReason?: string;
  missingTools: string[];
  java: {
    detected: boolean;
    version: string;
    javaHome: string;
    path?: string;
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
    installedVersions?: string[];
  };
  platform: {
    detected: boolean;
    availableApiLevels: string[];
  };
  gradle: {
    detected: boolean;
    version: string;
    path?: string;
    hasWrapper?: boolean;
  };
  aapt2: {
    detected: boolean;
    version: string;
    path?: string;
  };
  d8: {
    detected: boolean;
    version: string;
    path?: string;
  };
  apksigner: {
    detected: boolean;
    version: string;
    path?: string;
  };
  zipalign: {
    detected: boolean;
    version: string;
    path?: string;
  };
  system?: {
    platform: string;
    arch: string;
    nodeVersion: string;
  };
}

interface BuildDiagnosticsModalProps {
  onClose: () => void;
  onOpenSdkManager?: () => void;
}

export const BuildDiagnosticsModal: React.FC<BuildDiagnosticsModalProps> = ({
  onClose,
  onOpenSdkManager,
}) => {
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/build/environment');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error || 'Gagal memuat diagnostik lingkungan build');
      }
    } catch (e: any) {
      setError(e.message || 'Kesalahan jaringan saat memindai lingkungan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, []);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'READY_FOR_REAL_ANDROID_BUILD':
        return (
          <div className="flex items-center space-x-2 bg-[#3ddc84]/15 border border-[#3ddc84]/40 px-3 py-1.5 rounded-lg text-[#3ddc84] text-xs font-mono font-bold">
            <CheckCircle2 className="w-4 h-4 text-[#3ddc84]" />
            <span>READY_FOR_REAL_ANDROID_BUILD</span>
          </div>
        );
      case 'LIMITED_BY_ENVIRONMENT':
        return (
          <div className="flex items-center space-x-2 bg-amber-500/15 border border-amber-500/40 px-3 py-1.5 rounded-lg text-amber-300 text-xs font-mono font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>LIMITED_BY_ENVIRONMENT</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2 bg-rose-500/15 border border-rose-500/40 px-3 py-1.5 rounded-lg text-rose-300 text-xs font-mono font-bold">
            <XCircle className="w-4 h-4 text-rose-400" />
            <span>ANDROID_BUILD_ENVIRONMENT_UNAVAILABLE</span>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#1e1f22] border border-[#2b2d30] rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-[#18191c] border-b border-[#2b2d30] px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2.5">
            <Activity className="w-5 h-5 text-[#3574f0]" />
            <div>
              <h2 className="font-bold text-white text-sm">Diagnostik Environment Build</h2>
              <p className="text-[11px] text-gray-400">
                Pemeriksaan Otomatis Sistem Build Android Tanpa Mock Data
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchDiagnostics}
              disabled={loading}
              className="p-1.5 rounded-md hover:bg-[#2b2d30] text-gray-400 hover:text-white transition-colors"
              title="Segarkan Diagnostik"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-[#2b2d30] text-gray-400 hover:text-white transition-colors"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">

          {/* Overall Status Banner */}
          {data && (
            <div className="bg-[#2b2d30]/60 border border-[#393b40] rounded-xl p-3.5 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase font-mono tracking-wider text-gray-400 font-semibold">
                    Status Kesiapan Kompilasi Native
                  </div>
                  <div className="text-sm font-bold text-white">
                    {data.overallStatus === 'READY_FOR_REAL_ANDROID_BUILD'
                      ? 'Lingkungan Siap Menjalankan Build Android Riil'
                      : data.overallStatus === 'LIMITED_BY_ENVIRONMENT'
                      ? 'Toolchain Android Sebagian Tersedia'
                      : 'Lingkungan Build Android Tidak Tersedia di Host'}
                  </div>
                </div>
                <div>{getStatusBadge(data.overallStatus)}</div>
              </div>

              {data.limitationReason && (
                <div className="text-[11px] text-gray-300 pt-1 border-t border-[#393b40]/60 flex items-start space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-[#3574f0] shrink-0 mt-0.5" />
                  <span>{data.limitationReason}</span>
                </div>
              )}

              {data.missingTools && data.missingTools.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-gray-400 self-center">Komponen Belum Terpasang:</span>
                  {data.missingTools.map((t) => (
                    <span
                      key={t}
                      className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-2 py-0.5 rounded text-[10px] font-mono"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-gray-400">
              <RefreshCw className="w-7 h-7 animate-spin text-[#3574f0]" />
              <div className="text-xs font-mono">Memindai sistem build, PATH, dan toolchain host...</div>
            </div>
          ) : error ? (
            <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-xl text-rose-300 space-y-2">
              <div className="font-bold flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Gagal Memeriksa Environment</span>
              </div>
              <p className="text-[11px]">{error}</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              
              {/* Grid of Tools Diagnostic */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                
                {/* 1. Java / JDK */}
                <div className="bg-[#18191c] border border-[#2b2d30] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#2b2d30]">
                    <div className="flex items-center space-x-2">
                      <Cpu className="w-4 h-4 text-[#3574f0]" />
                      <span className="font-bold text-white text-xs">Java Development Kit (JDK)</span>
                    </div>
                    {data.java.detected ? (
                      <span className="text-[10px] bg-[#3ddc84]/15 text-[#3ddc84] border border-[#3ddc84]/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>DETECTED</span>
                      </span>
                    ) : (
                      <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span>NOT DETECTED</span>
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Versi Java:</span>
                      <span className="text-gray-200">{data.java.version}</span>
                    </div>
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-gray-400 text-[10px]">JAVA_HOME:</span>
                      <span className="text-gray-300 bg-[#2b2d30] px-2 py-1 rounded text-[10px] truncate" title={data.java.javaHome}>
                        {data.java.javaHome}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Android SDK */}
                <div className="bg-[#18191c] border border-[#2b2d30] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#2b2d30]">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-[#3ddc84]" />
                      <span className="font-bold text-white text-xs">Android SDK</span>
                    </div>
                    {data.androidSdk.detected ? (
                      <span className="text-[10px] bg-[#3ddc84]/15 text-[#3ddc84] border border-[#3ddc84]/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>DETECTED</span>
                      </span>
                    ) : (
                      <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        <span>NOT DETECTED</span>
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex flex-col space-y-0.5">
                      <span className="text-gray-400 text-[10px]">SDK Path:</span>
                      <span className="text-gray-300 bg-[#2b2d30] px-2 py-1 rounded text-[10px] truncate" title={data.androidSdk.sdkPath}>
                        {data.androidSdk.sdkPath}
                      </span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400">ANDROID_HOME:</span>
                      <span className="text-gray-300 truncate max-w-[170px]">{data.androidSdk.androidHome}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400">ANDROID_SDK_ROOT:</span>
                      <span className="text-gray-300 truncate max-w-[170px]">{data.androidSdk.androidSdkRoot}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Build Tools */}
                <div className="bg-[#18191c] border border-[#2b2d30] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#2b2d30]">
                    <div className="flex items-center space-x-2">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-xs">Build Tools</span>
                    </div>
                    {data.buildTools.detected ? (
                      <span className="text-[10px] bg-[#3ddc84]/15 text-[#3ddc84] border border-[#3ddc84]/30 px-2 py-0.5 rounded font-mono font-bold">
                        DETECTED
                      </span>
                    ) : (
                      <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-mono font-bold">
                        NOT DETECTED
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Versi Terpasang:</span>
                      <span className="text-gray-200">{data.buildTools.version}</span>
                    </div>
                    {data.buildTools.installedVersions && data.buildTools.installedVersions.length > 0 && (
                      <div className="text-[10px] text-gray-400">
                        Koleksi: {data.buildTools.installedVersions.join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Platform API */}
                <div className="bg-[#18191c] border border-[#2b2d30] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#2b2d30]">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-white text-xs">Platform Target</span>
                    </div>
                    {data.platform.detected ? (
                      <span className="text-[10px] bg-[#3ddc84]/15 text-[#3ddc84] border border-[#3ddc84]/30 px-2 py-0.5 rounded font-mono font-bold">
                        DETECTED
                      </span>
                    ) : (
                      <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-mono font-bold">
                        NOT DETECTED
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="text-gray-400">Level API Tersedia:</div>
                    <div className="text-gray-200">
                      {data.platform.availableApiLevels.length > 0
                        ? data.platform.availableApiLevels.join(', ')
                        : 'Tidak ada platform API terdeteksi'}
                    </div>
                  </div>
                </div>

                {/* 5. Gradle & Wrapper */}
                <div className="bg-[#18191c] border border-[#2b2d30] rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#2b2d30]">
                    <div className="flex items-center space-x-2">
                      <Terminal className="w-4 h-4 text-[#3574f0]" />
                      <span className="font-bold text-white text-xs">Gradle & Wrapper</span>
                    </div>
                    {data.gradle.detected ? (
                      <span className="text-[10px] bg-[#3ddc84]/15 text-[#3ddc84] border border-[#3ddc84]/30 px-2 py-0.5 rounded font-mono font-bold">
                        DETECTED
                      </span>
                    ) : (
                      <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded font-mono font-bold">
                        NOT DETECTED
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Versi Gradle:</span>
                      <span className="text-gray-200">{data.gradle.version}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-gray-400">Skrip ./gradlew:</span>
                      <span className={data.gradle.hasWrapper ? 'text-[#3ddc84]' : 'text-gray-500'}>
                        {data.gradle.hasWrapper ? 'Tersedia di Workspace' : 'Tidak Ditemukan'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 6. Binary Compiler Tools (AAPT2, D8, apksigner, zipalign) */}
                <div className="bg-[#18191c] border border-[#2b2d30] rounded-xl p-3.5 space-y-2">
                  <div className="font-bold text-white text-xs pb-1.5 border-b border-[#2b2d30]">
                    Biner Toolchain Compiler Android
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    
                    <div className="bg-[#2b2d30]/70 p-2 rounded flex items-center justify-between">
                      <span className="text-gray-300">AAPT2</span>
                      <span className={data.aapt2.detected ? 'text-[#3ddc84] font-bold' : 'text-gray-500'}>
                        {data.aapt2.detected ? 'TERSEDIA' : 'TIDAK'}
                      </span>
                    </div>

                    <div className="bg-[#2b2d30]/70 p-2 rounded flex items-center justify-between">
                      <span className="text-gray-300">D8 / R8</span>
                      <span className={data.d8.detected ? 'text-[#3ddc84] font-bold' : 'text-gray-500'}>
                        {data.d8.detected ? 'TERSEDIA' : 'TIDAK'}
                      </span>
                    </div>

                    <div className="bg-[#2b2d30]/70 p-2 rounded flex items-center justify-between">
                      <span className="text-gray-300">apksigner</span>
                      <span className={data.apksigner.detected ? 'text-[#3ddc84] font-bold' : 'text-gray-500'}>
                        {data.apksigner.detected ? 'TERSEDIA' : 'TIDAK'}
                      </span>
                    </div>

                    <div className="bg-[#2b2d30]/70 p-2 rounded flex items-center justify-between">
                      <span className="text-gray-300">zipalign</span>
                      <span className={data.zipalign.detected ? 'text-[#3ddc84] font-bold' : 'text-gray-500'}>
                        {data.zipalign.detected ? 'TERSEDIA' : 'TIDAK'}
                      </span>
                    </div>

                  </div>
                </div>

              </div>

              {/* Host Environment Note */}
              <div className="bg-[#18191c] border border-[#2b2d30] rounded-xl p-3.5 space-y-1 text-[11px] text-gray-400">
                <div className="font-bold text-gray-200 flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-[#3574f0]" />
                  <span>Kebijakan Transparansi Toolchain & Anti-Falsifikasi</span>
                </div>
                <p>
                  Sistem mendeteksi keberadaan toolchain secara otomatis langsung dari sistem berkas Linux host tanpa meminta Anda menebak path secara manual. Bila toolchain belum terpasang, sistem tidak akan berpura-pura berhasil melakukan kompilasi APK atau menghasilkan file tiruan (mock APK).
                </p>
              </div>

            </div>
          ) : null}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#18191c] border-t border-[#2b2d30] px-4 py-3 flex items-center justify-between shrink-0">
          {onOpenSdkManager ? (
            <button
              onClick={onOpenSdkManager}
              className="text-[#3574f0] hover:text-[#538eff] text-xs font-semibold hover:underline"
            >
              Buka Pengelola Android SDK →
            </button>
          ) : <div />}

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2b2d30] hover:bg-[#35373c] text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
