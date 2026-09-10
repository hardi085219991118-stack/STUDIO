import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, FilePlus, Save, Play, Bug, Hammer, Terminal, 
  Settings, HelpCircle, GitBranch, Cpu, Eye, Code, Search, 
  Maximize2, Minimize2, Check, RefreshCw, Smartphone
} from 'lucide-react';
import { BuildTaskType } from '../types';

interface TopMenuBarProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  onSave: () => void;
  onRun: () => void;
  onDebug: () => void;
  onBuild: (task: BuildTaskType) => void;
  onOpenTerminal: () => void;
  onOpenLogcat: () => void;
  onOpenDeviceManager: () => void;
  onOpenSdkManager: () => void;
  onOpenSettings: () => void;
  onSearchEverywhere: () => void;
  onOpenResourceManager: () => void;
  onOpenManifestEditor: () => void;
  onOpenLayoutEditor: () => void;
  onOpenGit?: () => void;
  onOpenApkManager?: () => void;
  onOpenDependencies?: () => void;
  onSyncGradle?: () => void;
  toggleSplit: (mode: 'none' | 'vertical' | 'horizontal') => void;
  projectName: string;
  isSaving?: boolean;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  onNewProject,
  onOpenProject,
  onSave,
  onRun,
  onDebug,
  onBuild,
  onOpenTerminal,
  onOpenLogcat,
  onOpenDeviceManager,
  onOpenSdkManager,
  onOpenSettings,
  onSearchEverywhere,
  onOpenResourceManager,
  onOpenManifestEditor,
  onOpenLayoutEditor,
  onOpenGit,
  onOpenApkManager,
  onOpenDependencies,
  onSyncGradle,
  toggleSplit,
  projectName,
  isSaving = false,
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const executeAndClose = (action: () => void) => {
    action();
    setActiveMenu(null);
  };

  return (
    <header className="bg-[#1e1f22] border-b border-[#2b2d30] text-[#bcbec4] text-xs select-none relative z-50 flex flex-col">
      {/* Brand & Project Info Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#2b2d30]/60 bg-[#18191c]">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-[#3ddc84] to-[#07c160] flex items-center justify-center shadow-sm">
            <Smartphone className="w-3.5 h-3.5 text-[#121316]" />
          </div>
          <span className="font-semibold text-[#dfe1e5] tracking-tight">Android Studio Mobile</span>
          <span className="text-[#6c707e] text-[10px] hidden sm:inline-block">2024.1.2 Hedgehog</span>
        </div>

        <div className="flex items-center space-x-3 text-[11px]">
          <span className="bg-[#2b2d30] px-2 py-0.5 rounded text-[#3ddc84] font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ddc84] animate-pulse"></span>
            {projectName}
          </span>
          {isSaving && <span className="text-[#3ddc84] text-[10px] animate-pulse">Menyimpan...</span>}
        </div>
      </div>

      {/* Menu items bar */}
      <div ref={menuRef} className="flex items-center overflow-x-auto no-scrollbar px-1 py-0.5 bg-[#1e1f22]">
        {/* File Menu */}
        <div className="relative">
          <button
            id="menu-btn-file"
            onClick={() => handleMenuClick('File')}
            className={`px-2.5 py-1 rounded hover:bg-[#2b2d30] transition-colors whitespace-nowrap ${activeMenu === 'File' ? 'bg-[#2b2d30] text-white' : ''}`}
          >
            Berkas
          </button>
          {activeMenu === 'File' && (
            <div className="absolute left-0 top-full mt-0.5 w-56 bg-[#2b2d30] border border-[#393b40] rounded shadow-xl py-1 text-xs z-50">
              <button onClick={() => executeAndClose(onNewProject)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center justify-between">
                <span>Proyek Baru...</span>
                <span className="text-[10px] text-gray-400">Ctrl+N</span>
              </button>
              <button onClick={() => executeAndClose(onOpenProject)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center justify-between">
                <span>Buka Proyek...</span>
                <span className="text-[10px] text-gray-400">Ctrl+O</span>
              </button>
              <div className="h-[1px] bg-[#393b40] my-1" />
              <button onClick={() => executeAndClose(onSave)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center justify-between">
                <span>Simpan Semua</span>
                <span className="text-[10px] text-gray-400">Ctrl+S</span>
              </button>
              <button onClick={() => executeAndClose(onOpenSettings)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center justify-between">
                <span>Pengaturan...</span>
                <span className="text-[10px] text-gray-400">Ctrl+Alt+S</span>
              </button>
            </div>
          )}
        </div>

        {/* Edit Menu */}
        <div className="relative">
          <button
            id="menu-btn-edit"
            onClick={() => handleMenuClick('Edit')}
            className={`px-2.5 py-1 rounded hover:bg-[#2b2d30] transition-colors whitespace-nowrap ${activeMenu === 'Edit' ? 'bg-[#2b2d30] text-white' : ''}`}
          >
            Edit
          </button>
          {activeMenu === 'Edit' && (
            <div className="absolute left-0 top-full mt-0.5 w-52 bg-[#2b2d30] border border-[#393b40] rounded shadow-xl py-1 text-xs z-50">
              <button onClick={() => executeAndClose(() => document.execCommand('undo'))} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex justify-between">
                <span>Urungkan</span>
                <span className="text-[10px] text-gray-400">Ctrl+Z</span>
              </button>
              <button onClick={() => executeAndClose(() => document.execCommand('redo'))} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex justify-between">
                <span>Ulangi</span>
                <span className="text-[10px] text-gray-400">Ctrl+Y</span>
              </button>
              <div className="h-[1px] bg-[#393b40] my-1" />
              <button onClick={() => executeAndClose(onSearchEverywhere)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex justify-between">
                <span>Cari di Berkas...</span>
                <span className="text-[10px] text-gray-400">Ctrl+Shift+F</span>
              </button>
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className="relative">
          <button
            id="menu-btn-view"
            onClick={() => handleMenuClick('View')}
            className={`px-2.5 py-1 rounded hover:bg-[#2b2d30] transition-colors whitespace-nowrap ${activeMenu === 'View' ? 'bg-[#2b2d30] text-white' : ''}`}
          >
            Tampilan
          </button>
          {activeMenu === 'View' && (
            <div className="absolute left-0 top-full mt-0.5 w-56 bg-[#2b2d30] border border-[#393b40] rounded shadow-xl py-1 text-xs z-50">
              <button onClick={() => executeAndClose(() => toggleSplit('none'))} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Tampilan Editor Tunggal
              </button>
              <button onClick={() => executeAndClose(() => toggleSplit('vertical'))} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Bagi Vertikal
              </button>
              <button onClick={() => executeAndClose(() => toggleSplit('horizontal'))} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Bagi Horizontal
              </button>
            </div>
          )}
        </div>

        {/* Build Menu */}
        <div className="relative">
          <button
            id="menu-btn-build"
            onClick={() => handleMenuClick('Build')}
            className={`px-2.5 py-1 rounded hover:bg-[#2b2d30] transition-colors whitespace-nowrap text-[#3ddc84] font-medium ${activeMenu === 'Build' ? 'bg-[#2b2d30]' : ''}`}
          >
            Build
          </button>
          {activeMenu === 'Build' && (
            <div className="absolute left-0 top-full mt-0.5 w-64 bg-[#2b2d30] border border-[#393b40] rounded shadow-xl py-1 text-xs z-50">
              {onSyncGradle && (
                <button onClick={() => executeAndClose(onSyncGradle)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center justify-between text-[#3574f0]">
                  <span>Sinkronkan Proyek dengan Berkas Gradle</span>
                  <RefreshCw className="w-3 h-3" />
                </button>
              )}
              {onOpenDependencies && (
                <button onClick={() => executeAndClose(onOpenDependencies)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                  Kelola Dependensi...
                </button>
              )}
              <div className="h-[1px] bg-[#393b40] my-1" />
              <button onClick={() => executeAndClose(() => onBuild('assembleDebug'))} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex justify-between">
                <span>Assemble Debug APK</span>
                <span className="text-[10px] text-[#3ddc84]">Disarankan</span>
              </button>
              <button onClick={() => executeAndClose(() => onBuild('assembleRelease'))} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Assemble Release APK
              </button>
              <div className="h-[1px] bg-[#393b40] my-1" />
              <button onClick={() => executeAndClose(() => onBuild('clean'))} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Bersihkan Proyek
              </button>
              <button onClick={() => executeAndClose(() => onBuild('lint'))} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Periksa Kode / Lint
              </button>
            </div>
          )}
        </div>

        {/* Run Menu */}
        <div className="relative">
          <button
            id="menu-btn-run"
            onClick={() => handleMenuClick('Run')}
            className={`px-2.5 py-1 rounded hover:bg-[#2b2d30] transition-colors whitespace-nowrap ${activeMenu === 'Run' ? 'bg-[#2b2d30] text-white' : ''}`}
          >
            Jalankan
          </button>
          {activeMenu === 'Run' && (
            <div className="absolute left-0 top-full mt-0.5 w-52 bg-[#2b2d30] border border-[#393b40] rounded shadow-xl py-1 text-xs z-50">
              <button onClick={() => executeAndClose(onRun)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center gap-2">
                <Play className="w-3 h-3 text-[#3ddc84]" />
                <span>Jalankan 'app'</span>
              </button>
              <button onClick={() => executeAndClose(onDebug)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center gap-2">
                <Bug className="w-3 h-3 text-[#ffc107]" />
                <span>Debug 'app'</span>
              </button>
            </div>
          )}
        </div>

        {/* Tools Menu */}
        <div className="relative">
          <button
            id="menu-btn-tools"
            onClick={() => handleMenuClick('Tools')}
            className={`px-2.5 py-1 rounded hover:bg-[#2b2d30] transition-colors whitespace-nowrap ${activeMenu === 'Tools' ? 'bg-[#2b2d30] text-white' : ''}`}
          >
            Alat
          </button>
          {activeMenu === 'Tools' && (
            <div className="absolute left-0 top-full mt-0.5 w-60 bg-[#2b2d30] border border-[#393b40] rounded shadow-xl py-1 text-xs z-50">
              <button onClick={() => executeAndClose(onOpenLayoutEditor)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Editor Layout Visual
              </button>
              <button onClick={() => executeAndClose(onOpenManifestEditor)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Editor AndroidManifest
              </button>
              <button onClick={() => executeAndClose(onOpenResourceManager)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Pengelola Resource
              </button>
              <div className="h-[1px] bg-[#393b40] my-1" />
              <button onClick={() => executeAndClose(onOpenDeviceManager)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Pengelola Perangkat / ADB
              </button>
              {onOpenApkManager && (
                <button onClick={() => executeAndClose(onOpenApkManager)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center justify-between">
                  <span>Pengelola APK</span>
                  <span className="text-[10px] text-[#3ddc84]">Builds</span>
                </button>
              )}
              {onOpenGit && (
                <button onClick={() => executeAndClose(onOpenGit)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center justify-between">
                  <span>Kontrol Versi Git</span>
                  <span className="text-[10px] text-gray-400">VCS</span>
                </button>
              )}
              <button onClick={() => executeAndClose(onOpenSdkManager)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Pengelola SDK
              </button>
              <button onClick={() => executeAndClose(onOpenTerminal)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Terminal
              </button>
              <button onClick={() => executeAndClose(onOpenLogcat)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Logcat
              </button>
            </div>
          )}
        </div>

        {/* Help Menu */}
        <div className="relative">
          <button
            id="menu-btn-help"
            onClick={() => handleMenuClick('Help')}
            className={`px-2.5 py-1 rounded hover:bg-[#2b2d30] transition-colors whitespace-nowrap ${activeMenu === 'Help' ? 'bg-[#2b2d30] text-white' : ''}`}
          >
            Bantuan
          </button>
          {activeMenu === 'Help' && (
            <div className="absolute left-0 top-full mt-0.5 w-64 bg-[#2b2d30] border border-[#393b40] rounded shadow-xl py-1 text-xs z-50">
              <div className="px-3 py-2 border-b border-[#393b40]">
                <p className="font-semibold text-white">Android Studio Mobile</p>
                <p className="text-[10px] text-gray-400">Runtime IDE Android mobile dengan compiler Gradle & APK</p>
              </div>
              <button onClick={() => executeAndClose(onSearchEverywhere)} className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white">
                Cari di Mana Saja (Shift dua kali)
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
