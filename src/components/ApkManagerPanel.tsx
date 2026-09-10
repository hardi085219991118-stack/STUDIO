import React, { useState, useEffect } from 'react';
import { 
  Package, Download, Share2, CheckCircle2, XCircle, 
  RefreshCw, Smartphone, Hammer, HardDrive, ShieldCheck, 
  AlertTriangle, FileCheck, Layers, Play, ShieldAlert
} from 'lucide-react';
import { ApkInfo, DeviceInfo } from '../types';
import { ApkService } from '../services/ApkService';
import { AdbService } from '../services/AdbService';

interface ApkManagerPanelProps {
  projectName: string;
  selectedDevice: DeviceInfo | null;
  onBuildApk: (variant: 'debug' | 'release') => void;
  onSelectDeviceTab?: () => void;
}

export const ApkManagerPanel: React.FC<ApkManagerPanelProps> = ({
  projectName,
  selectedDevice,
  onBuildApk,
  onSelectDeviceTab,
}) => {
  const [apks, setApks] = useState<ApkInfo[]>([]);
  const [selectedApk, setSelectedApk] = useState<ApkInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [installStatus, setInstallStatus] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  const fetchApks = async () => {
    setIsLoading(true);
    try {
      const list = await ApkService.listApks(projectName);
      setApks(list);
      if (list.length > 0) {
        if (!selectedApk || !list.some(a => a.fullPath === selectedApk.fullPath)) {
          setSelectedApk(list[0]);
        }
      } else {
        setSelectedApk(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApks();
  }, [projectName]);

  const handleInstallToDevice = async () => {
    if (!selectedApk) return;
    if (!selectedDevice) {
      setInstallStatus('Kesalahan: Tidak ada perangkat target yang terhubung. Hubungkan perangkat fisik atau pasangkan via ADB Nirkabel.');
      return;
    }

    setIsInstalling(true);
    setInstallStatus(`Menginstal ${selectedApk.fileName} ke ${selectedDevice.name} (${selectedDevice.id})...`);

    try {
      const res = await AdbService.installApk(selectedDevice.id, selectedApk.fullPath, projectName);
      if (res.success) {
        setInstallStatus(`Berhasil menginstal ${selectedApk.fileName} di perangkat ${selectedDevice.name}!`);
      } else {
        setInstallStatus(`Instalasi gagal: ${res.reason || res.error || res.status}`);
      }
    } catch (err: any) {
      setInstallStatus(`Kesalahan instalasi: ${err.message}`);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDownload = (apk: ApkInfo) => {
    const downloadUrl = `/api/download/apk?name=${encodeURIComponent(apk.fileName)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = apk.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async (apk: ApkInfo) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `APK Android: ${apk.fileName}`,
          text: `Unduh Android Application Package (${apk.sizeFormatted})`,
          url: window.location.href,
        });
      } catch (e) {
        // canceled
      }
    } else {
      navigator.clipboard?.writeText(window.location.href);
      alert('Tautan unduhan APK disalin ke papan klip!');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#18191c] text-[#bcbec4] select-none text-xs font-mono overflow-hidden">
      {/* Header bar */}
      <div className="bg-[#1e1f22] border-b border-[#2b2d30] px-3 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-[#3ddc84]" />
          <span className="font-bold text-white text-xs">Pengelola APK</span>
          <span className="text-[11px] bg-[#2b2d30] text-gray-400 px-2 py-0.5 rounded">
            {apks.length} APK tersedia
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onBuildApk('debug')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#2b2d30] hover:bg-[#35373c] text-white hover:text-[#3ddc84] transition-colors border border-[#393b40]"
          >
            <Hammer className="w-3.5 h-3.5 text-[#3ddc84]" />
            <span>Build APK Debug</span>
          </button>
          <button
            onClick={() => onBuildApk('release')}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#2b2d30] hover:bg-[#35373c] text-white hover:text-blue-300 transition-colors border border-[#393b40]"
          >
            <Hammer className="w-3.5 h-3.5 text-[#3574f0]" />
            <span>Build APK Release</span>
          </button>
          <button
            onClick={fetchApks}
            disabled={isLoading}
            className="p-1.5 rounded hover:bg-[#2b2d30] text-gray-400 hover:text-white transition-colors"
            title="Segarkan daftar APK"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left Column: APK List */}
        <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[#2b2d30] bg-[#1a1b1e] flex flex-col shrink-0">
          <div className="p-2 border-b border-[#2b2d30] bg-[#161719] text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center justify-between">
            <span>Paket yang Dibuat</span>
            <span>{apks.length}</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#2b2d30]/50">
            {apks.length === 0 ? (
              <div className="p-6 text-center text-gray-500 flex flex-col items-center">
                <Package className="w-10 h-10 text-gray-600 mb-2 stroke-[1.5]" />
                <div className="text-white font-medium mb-1">TIDAK ADA APK TERSEDIA</div>
                <p className="text-[11px] text-gray-400 max-w-[220px] mb-4">
                  Tidak ada output APK yang terdeteksi di direktori build proyek &quot;{projectName}&quot;.
                </p>
                <button
                  onClick={() => onBuildApk('debug')}
                  className="px-3 py-1.5 rounded bg-[#3574f0] hover:bg-[#2662db] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  <span>Build APK Sekarang</span>
                </button>
              </div>
            ) : (
              apks.map((apk) => {
                const isSelected = selectedApk?.fullPath === apk.fullPath;
                return (
                  <button
                    key={apk.fullPath}
                    onClick={() => setSelectedApk(apk)}
                    className={`w-full text-left p-3 transition-colors flex items-start space-x-3 ${
                      isSelected ? 'bg-[#2b2d30] border-l-2 border-[#3ddc84]' : 'hover:bg-[#232428]'
                    }`}
                  >
                    <div className="p-2 rounded bg-[#18191c] border border-[#393b40] text-[#3ddc84] shrink-0 mt-0.5">
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-white truncate text-xs">{apk.fileName}</span>
                        <span className={`text-[10px] uppercase px-1.5 py-0.2 rounded font-bold ${
                          apk.buildVariant === 'release' ? 'bg-[#3574f0]/20 text-[#3574f0]' : 'bg-[#3ddc84]/20 text-[#3ddc84]'
                        }`}>
                          {apk.buildVariant}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1 flex items-center space-x-2">
                        <span>{apk.sizeFormatted}</span>
                        <span>•</span>
                        <span className="truncate">{apk.buildTime}</span>
                      </div>
                      <div className="mt-1 flex items-center space-x-1">
                        {apk.status === 'VALIDATED' ? (
                          <span className="text-[10px] text-[#3ddc84] flex items-center gap-0.5 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> TERVALIDASI
                          </span>
                        ) : apk.status === 'UNVERIFIED' ? (
                          <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-semibold">
                            <ShieldAlert className="w-3 h-3" /> BELUM DIVERIFIKASI
                          </span>
                        ) : apk.status === 'LIMITED_BY_ENVIRONMENT' ? (
                          <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-semibold">
                            <AlertTriangle className="w-3 h-3" /> DIBATASI
                          </span>
                        ) : (
                          <span className="text-[10px] text-red-400 flex items-center gap-0.5 font-semibold">
                            <XCircle className="w-3 h-3" /> TIDAK VALID
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: APK Details & Actions */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
          {selectedApk ? (
            <div className="space-y-4">
              {/* Header card */}
              <div className="bg-[#1e1f22] border border-[#2b2d30] rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-lg border ${
                      selectedApk.status === 'VALIDATED' 
                        ? 'bg-[#3ddc84]/10 border-[#3ddc84]/30 text-[#3ddc84]' 
                        : selectedApk.status === 'UNVERIFIED' || selectedApk.status === 'LIMITED_BY_ENVIRONMENT'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}>
                      <Package className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-white text-sm font-bold flex items-center gap-2">
                        {selectedApk.fileName}
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase border font-bold ${
                          selectedApk.status === 'VALIDATED'
                            ? 'bg-[#3ddc84]/20 border-[#3ddc84]/40 text-[#3ddc84]'
                            : selectedApk.status === 'UNVERIFIED' || selectedApk.status === 'LIMITED_BY_ENVIRONMENT'
                            ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                            : 'bg-red-500/20 border-red-500/40 text-red-400'
                        }`}>
                          {selectedApk.status}
                        </span>
                      </h3>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">{selectedApk.fullPath}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDownload(selectedApk)}
                      className="px-3 py-1.5 rounded bg-[#2b2d30] hover:bg-[#35373c] text-white flex items-center space-x-1.5 border border-[#393b40] transition-colors text-xs"
                      title="Unduh paket APK"
                    >
                      <Download className="w-3.5 h-3.5 text-[#3574f0]" />
                      <span>Unduh</span>
                    </button>
                    <button
                      onClick={() => handleShare(selectedApk)}
                      className="p-1.5 rounded bg-[#2b2d30] hover:bg-[#35373c] text-gray-300 hover:text-white border border-[#393b40] transition-colors"
                      title="Bagikan tautan APK"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Package Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-[#1e1f22] border border-[#2b2d30] rounded-lg p-3">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Nama Paket</div>
                  <div className="text-white font-bold text-xs mt-1 truncate">
                    {selectedApk.packageName || 'TIDAK DIKETAHUI'}
                  </div>
                </div>
                <div className="bg-[#1e1f22] border border-[#2b2d30] rounded-lg p-3">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Nama & Kode Versi</div>
                  <div className="text-white font-bold text-xs mt-1">
                    {selectedApk.versionName !== 'UNKNOWN' ? `v${selectedApk.versionName}` : 'TIDAK DIKETAHUI'} (Build #{selectedApk.versionCode})
                  </div>
                </div>
                <div className="bg-[#1e1f22] border border-[#2b2d30] rounded-lg p-3">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Ukuran Berkas</div>
                  <div className="text-[#3ddc84] font-bold text-xs mt-1">
                    {selectedApk.sizeFormatted} ({selectedApk.sizeBytes.toLocaleString()} byte)
                  </div>
                </div>
                <div className="bg-[#1e1f22] border border-[#2b2d30] rounded-lg p-3">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Varian Build</div>
                  <div className="text-white font-bold text-xs mt-1 uppercase">{selectedApk.buildVariant}</div>
                </div>
                <div className="bg-[#1e1f22] border border-[#2b2d30] rounded-lg p-3">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Target SDK</div>
                  <div className="text-white font-bold text-xs mt-1">
                    Min SDK: {selectedApk.validationDetails?.minSdk || 'TIDAK DIKETAHUI'} • Target SDK: {selectedApk.validationDetails?.targetSdk || 'TIDAK DIKETAHUI'}
                  </div>
                </div>
                <div className="bg-[#1e1f22] border border-[#2b2d30] rounded-lg p-3">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Metode Validasi</div>
                  <div className="text-white font-mono text-[11px] mt-1 truncate">
                    {selectedApk.validationDetails?.validationMethod || 'Pemeriksaan Arsip Dasar'}
                  </div>
                </div>
              </div>

              {/* Detailed Validation Status Report */}
              <div className="bg-[#1e1f22] border border-[#2b2d30] rounded-lg p-3.5 space-y-2">
                <div className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Diagnostik Verifikasi</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                    selectedApk.status === 'VALIDATED' 
                      ? 'bg-[#3ddc84]/20 text-[#3ddc84]' 
                      : selectedApk.status === 'UNVERIFIED' || selectedApk.status === 'LIMITED_BY_ENVIRONMENT'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {selectedApk.status}
                  </span>
                </div>
                
                {selectedApk.validationDetails?.reason && (
                  <p className="text-[11px] font-mono p-2.5 rounded bg-[#141517] border border-[#2b2d30] text-gray-300 leading-relaxed">
                    {selectedApk.validationDetails.reason}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 pt-1 text-[11px]">
                  <div className="flex items-center gap-1 text-gray-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedApk.validationDetails?.hasZipMagic ? 'bg-[#3ddc84]' : 'bg-red-400'}`} />
                    <span>Header ZIP: {selectedApk.validationDetails?.hasZipMagic ? 'Ada' : 'Hilang'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedApk.validationDetails?.hasManifest ? 'bg-[#3ddc84]' : 'bg-amber-400'}`} />
                    <span>Manifest: {selectedApk.validationDetails?.hasManifest ? 'Ditemukan' : 'Belum Diperiksa'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedApk.validationDetails?.apksignerVerified ? 'bg-[#3ddc84]' : 'bg-amber-400'}`} />
                    <span>apksigner: {selectedApk.validationDetails?.apksignerVerified ? 'Lolos' : 'Tidak Tersedia'}</span>
                  </div>
                </div>
              </div>

              {/* Install to Device Section */}
              <div className="bg-[#1e1f22] border border-[#2b2d30] rounded-lg p-4 space-y-3">
                <h4 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#3574f0]" />
                  <span>Instal ke Perangkat Terhubung (ADB)</span>
                </h4>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#18191c] p-3 rounded border border-[#2b2d30]">
                  <div>
                    <div className="text-gray-400 text-[11px]">Perangkat Target Terpilih:</div>
                    <div className="font-semibold text-white text-xs mt-0.5 flex items-center gap-1.5">
                      {selectedDevice ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-[#3ddc84]" />
                          <span>{selectedDevice.name}</span>
                          <span className="text-gray-400 font-mono">({selectedDevice.id})</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-[#2b2d30] rounded text-gray-300">
                            {selectedDevice.connectionType}
                          </span>
                        </>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Tidak Ada Perangkat Terhubung via ADB</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {onSelectDeviceTab && !selectedDevice && (
                      <button
                        onClick={onSelectDeviceTab}
                        className="px-2.5 py-1.5 rounded bg-[#2b2d30] hover:bg-[#35373c] text-white text-xs border border-[#393b40] transition-colors"
                      >
                        Buka Pengelola Perangkat
                      </button>
                    )}
                    <button
                      onClick={handleInstallToDevice}
                      disabled={isInstalling || !selectedDevice || selectedApk.status === 'INVALID'}
                      className="px-3.5 py-1.5 rounded bg-[#3ddc84] text-[#121316] font-semibold text-xs hover:bg-[#46e68d] disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 transition-colors shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isInstalling ? 'Menginstal via ADB...' : 'Instal di Perangkat'}</span>
                    </button>
                  </div>
                </div>

                {installStatus && (
                  <div className={`p-2.5 rounded border text-[11px] font-mono ${
                    installStatus.includes('Success') || installStatus.includes('Berhasil')
                      ? 'bg-[#3ddc84]/10 border-[#3ddc84]/30 text-[#3ddc84]' 
                      : installStatus.includes('Error') || installStatus.includes('failed') || installStatus.includes('gagal')
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                  }`}>
                    {installStatus}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500">
              <Package className="w-12 h-12 text-gray-600 mb-3 stroke-[1.5]" />
              <div className="text-white font-medium text-sm mb-1">Tidak Ada Paket APK Dipilih</div>
              <p className="text-xs text-gray-400 max-w-sm mb-4">
                Pilih APK dari daftar di sebelah kiri atau kompilasi paket baru menggunakan tugas build Gradle.
              </p>
              <button
                onClick={() => onBuildApk('debug')}
                className="px-3.5 py-1.5 rounded bg-[#3574f0] hover:bg-[#2662db] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <Hammer className="w-3.5 h-3.5" />
                <span>Build assembleDebug</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
