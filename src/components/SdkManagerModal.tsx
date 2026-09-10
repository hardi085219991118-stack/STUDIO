import React, { useState, useEffect } from 'react';
import { 
  Cpu, Layers, CheckCircle2, XCircle, AlertTriangle, RefreshCw, 
  X, Download, Terminal, Folder, ExternalLink, ShieldAlert, Check
} from 'lucide-react';
import { AndroidSdkService, SdkStatusResponse, SdkPlatformItem, SdkToolInfo } from '../services/AndroidSdkService';

interface SdkManagerModalProps {
  onClose: () => void;
  onTriggerGradleSync?: () => void;
}

export const SdkManagerModal: React.FC<SdkManagerModalProps> = ({
  onClose,
  onTriggerGradleSync,
}) => {
  const [activeTab, setActiveTab] = useState<'platforms' | 'tools' | 'location'>('platforms');
  const [loading, setLoading] = useState<boolean>(true);
  const [sdkStatus, setSdkStatus] = useState<SdkStatusResponse | null>(null);
  const [platforms, setPlatforms] = useState<SdkPlatformItem[]>([]);
  const [installingPackage, setInstallingPackage] = useState<string | null>(null);
  const [installNotice, setInstallNotice] = useState<{ type: 'info' | 'error'; message: string } | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setInstallNotice(null);
    try {
      const [statusRes, packagesRes] = await Promise.all([
        AndroidSdkService.getStatus(),
        AndroidSdkService.getPackages(),
      ]);
      setSdkStatus(statusRes);
      setPlatforms(packagesRes.platforms || []);
    } catch (err: any) {
      console.error('Failed to load SDK info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleInstall = async (packagePath: string) => {
    setInstallingPackage(packagePath);
    setInstallNotice(null);
    try {
      const res = await AndroidSdkService.installPackage(packagePath);
      if (res.status === 'LIMITED_BY_ENVIRONMENT') {
        setInstallNotice({
          type: 'error',
          message: res.reason || 'Installation cannot proceed because the host environment lacks sdkmanager or root privileges.',
        });
      } else if (res.success) {
        setInstallNotice({
          type: 'info',
          message: `Package ${packagePath} successfully installed!`,
        });
        await fetchStatus();
      } else {
        setInstallNotice({
          type: 'error',
          message: res.error || 'Failed to install SDK package.',
        });
      }
    } catch (err: any) {
      setInstallNotice({
        type: 'error',
        message: err.message || 'Error occurred while contacting backend.',
      });
    } finally {
      setInstallingPackage(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 select-none backdrop-blur-xs">
      <div className="bg-[#1e1f22] border border-[#393b40] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] text-xs">
        {/* Modal Header */}
        <div className="bg-[#18191c] border-b border-[#2b2d30] px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-[#3ddc84]" />
            <h2 className="font-bold text-white text-sm">Pengelola Android SDK</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold border ${
              sdkStatus?.status === 'AVAILABLE'
                ? 'bg-[#3ddc84]/15 text-[#3ddc84] border-[#3ddc84]/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}>
              {sdkStatus?.status || 'MEMERIKSA...'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-1 rounded hover:bg-[#2b2d30] text-gray-400 hover:text-white"
              title="Segarkan status SDK"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[#2b2d30] text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diagnostic Banner if environment limited */}
        {sdkStatus?.isEnvironmentLimited && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-start space-x-2 text-[11px] text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold">Diagnostik Lingkungan Kontainer:</span>
              <p className="text-gray-300 text-[10px]">
                {sdkStatus.limitationReason}
              </p>
            </div>
          </div>
        )}

        {/* Install Notice Alert */}
        {installNotice && (
          <div className={`px-4 py-2 border-b flex items-center justify-between text-xs font-mono ${
            installNotice.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-300'
              : 'bg-[#3ddc84]/10 border-[#3ddc84]/20 text-[#3ddc84]'
          }`}>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{installNotice.message}</span>
            </div>
            <button onClick={() => setInstallNotice(null)} className="p-0.5 hover:text-white">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="bg-[#2b2d30] px-4 py-2 border-b border-[#393b40] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('platforms')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                activeTab === 'platforms' ? 'bg-[#3574f0] text-white font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Platform SDK
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                activeTab === 'tools' ? 'bg-[#3574f0] text-white font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Alat SDK & Toolchain
            </button>
            <button
              onClick={() => setActiveTab('location')}
              className={`px-3 py-1 rounded text-xs transition-colors ${
                activeTab === 'location' ? 'bg-[#3574f0] text-white font-semibold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Lokasi SDK
            </button>
          </div>

          {onTriggerGradleSync && (
            <button
              onClick={onTriggerGradleSync}
              className="px-2.5 py-1 bg-[#3ddc84]/10 hover:bg-[#3ddc84]/20 border border-[#3ddc84]/30 text-[#3ddc84] rounded font-mono text-[11px] font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Sinkronkan Gradle</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-2 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin text-[#3574f0]" />
              <span className="font-mono text-xs">Memeriksa sistem berkas dan lingkungan...</span>
            </div>
          ) : activeTab === 'platforms' ? (
            <div className="space-y-3">
              <div className="text-gray-400 text-[11px] flex items-center justify-between pb-1 border-b border-[#2b2d30]">
                <span>Paket Target Platform API Android</span>
                <span className="font-mono text-[10px]">Total: {platforms.length}</span>
              </div>

              <div className="space-y-1.5 font-mono text-xs">
                {platforms.map((p) => (
                  <div
                    key={p.packagePath}
                    className="p-2.5 bg-[#2b2d30] border border-[#393b40] rounded-lg flex items-center justify-between hover:border-gray-500 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${p.isInstalled ? 'bg-[#3ddc84]' : 'bg-gray-600'}`} />
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{p.version}</span>
                          <span className="text-[10px] text-gray-400 font-normal">API {p.apiLevel}</span>
                          <span className="text-[9px] bg-black/40 text-gray-400 px-1 py-0.2 rounded font-normal">Rev {p.revision}</span>
                        </div>
                        <div className="text-[10px] text-gray-400">{p.packagePath}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {p.isInstalled ? (
                        <span className="text-[10px] bg-[#3ddc84]/10 text-[#3ddc84] border border-[#3ddc84]/30 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Terinstal</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleInstall(p.packagePath)}
                          disabled={installingPackage === p.packagePath}
                          className="px-2.5 py-1 bg-[#3574f0] hover:bg-[#2b64d6] text-white rounded text-[11px] font-semibold flex items-center space-x-1 transition-colors disabled:opacity-50"
                        >
                          {installingPackage === p.packagePath ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          <span>Instal</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'tools' ? (
            <div className="space-y-3">
              <div className="text-gray-400 text-[11px] pb-1 border-b border-[#2b2d30]">
                Runtime Kompiler, Build-Tools, dan Platform-Tools Android SDK
              </div>

              {sdkStatus && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-xs">
                  {(Object.entries(sdkStatus.tools) as [string, SdkToolInfo][]).map(([toolName, info]) => (
                    <div
                      key={toolName}
                      className="p-3 bg-[#2b2d30] border border-[#393b40] rounded-xl flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5 uppercase text-[11px]">
                          <Terminal className="w-3 h-3 text-[#3574f0]" />
                          <span>{toolName}</span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Versi: <span className="text-gray-200">{info.version}</span>
                        </div>
                        <div className="text-[9px] text-gray-500 truncate max-w-[180px]" title={info.path || 'Tidak terdeteksi'}>
                          Path: {info.path || 'N/A'}
                        </div>
                      </div>

                      <div>
                        {info.available ? (
                          <span className="text-[9px] bg-[#3ddc84]/15 text-[#3ddc84] border border-[#3ddc84]/30 px-1.5 py-0.5 rounded font-bold">
                            TERINSTAL
                          </span>
                        ) : (
                          <span className="text-[9px] bg-red-500/15 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-bold">
                            TIDAK ADA
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 font-mono text-xs">
              <div className="bg-[#2b2d30] border border-[#393b40] rounded-xl p-3 space-y-3">
                <div className="font-bold text-white flex items-center gap-1.5 pb-2 border-b border-[#393b40]">
                  <Folder className="w-3.5 h-3.5 text-[#3574f0]" />
                  <span>Variabel Lingkungan & Path Direktori</span>
                </div>

                <div className="space-y-2 text-[11px]">
                  <div>
                    <span className="text-gray-400 block text-[10px]">ANDROID_HOME:</span>
                    <span className="text-white bg-[#1e1f22] px-2 py-0.5 rounded block truncate border border-[#393b40]">
                      {sdkStatus?.environmentVariables.ANDROID_HOME || 'Tidak diatur'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block text-[10px]">ANDROID_SDK_ROOT:</span>
                    <span className="text-white bg-[#1e1f22] px-2 py-0.5 rounded block truncate border border-[#393b40]">
                      {sdkStatus?.environmentVariables.ANDROID_SDK_ROOT || 'Tidak diatur'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block text-[10px]">JAVA_HOME:</span>
                    <span className="text-white bg-[#1e1f22] px-2 py-0.5 rounded block truncate border border-[#393b40]">
                      {sdkStatus?.environmentVariables.JAVA_HOME || 'Tidak diatur'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-400 block text-[10px]">Lokasi SDK Terdeteksi:</span>
                    <span className="text-[#3ddc84] bg-[#1e1f22] px-2 py-0.5 rounded block truncate border border-[#393b40]">
                      {sdkStatus?.sdkLocation || 'Tidak ada direktori Android SDK ditemukan di sistem berkas kontainer'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[#18191c] p-3 rounded-xl border border-[#2b2d30] space-y-1.5">
                <div className="font-bold text-gray-300 text-[11px]">Direktori Host yang Dipindai:</div>
                <div className="space-y-1 text-[10px] text-gray-400">
                  {sdkStatus?.scannedDirectories.map((d) => (
                    <div key={d} className="flex items-center space-x-1.5">
                      <span className="text-gray-600">•</span>
                      <span className="truncate">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-[#18191c] border-t border-[#2b2d30] px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="text-gray-500 font-mono text-[10px]">
            Inspeksi Sistem Berkas Host Riil (Bukan Data Tiruan)
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2b2d30] hover:bg-[#393b40] text-white rounded font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
