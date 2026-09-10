import React from 'react';
import { 
  Play, Bug, Square, Hammer, Save, RotateCcw, RotateCw, 
  Search, RefreshCw, Smartphone, Terminal, AlignLeft, 
  Settings, FolderPlus, FolderOpen, Layers, CheckCircle2, ChevronDown,
  Package, GitBranch, AlertTriangle
} from 'lucide-react';
import { DeviceInfo, BuildTaskType } from '../types';

interface ToolbarProps {
  onNewProject: () => void;
  onOpenProject: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSearch: () => void;
  onRun: () => void;
  onDebug: () => void;
  onStop: () => void;
  onBuild: (task: BuildTaskType) => void;
  onSyncGradle: () => void;
  onToggleTerminal: () => void;
  onToggleLogcat: () => void;
  onToggleDeviceManager: () => void;
  onToggleSettings: () => void;
  onOpenLayoutEditor: () => void;
  onOpenApkManager?: () => void;
  onOpenGit?: () => void;
  devices: DeviceInfo[];
  selectedDevice: DeviceInfo | null;
  onSelectDevice: (device: DeviceInfo | null) => void;
  isRunning: boolean;
  isBuilding: boolean;
  runButtonState?: string;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onNewProject,
  onOpenProject,
  onSave,
  onUndo,
  onRedo,
  onSearch,
  onRun,
  onDebug,
  onStop,
  onBuild,
  onSyncGradle,
  onToggleTerminal,
  onToggleLogcat,
  onToggleDeviceManager,
  onToggleSettings,
  onOpenLayoutEditor,
  onOpenApkManager,
  onOpenGit,
  devices,
  selectedDevice,
  onSelectDevice,
  isRunning,
  isBuilding,
  runButtonState,
}) => {
  const [deviceDropdownOpen, setDeviceDropdownOpen] = React.useState(false);

  const hasDevice = Boolean(selectedDevice && devices.some(d => d.id === selectedDevice.id));
  const deviceDisplayName = hasDevice ? `${selectedDevice!.name}` : 'No Device';

  return (
    <div className="bg-[#1e1f22] border-b border-[#2b2d30] px-2 py-1 flex items-center justify-between gap-1 select-none overflow-x-auto no-scrollbar">
      {/* Left group: File & Edit actions */}
      <div className="flex items-center space-x-1 shrink-0">
        <button
          id="btn-new-project"
          onClick={onNewProject}
          title="New Project"
          className="p-1.5 rounded hover:bg-[#2b2d30] text-[#bcbec4] hover:text-white transition-colors"
        >
          <FolderPlus className="w-4 h-4 text-[#3574f0]" />
        </button>
        <button
          id="btn-open-project"
          onClick={onOpenProject}
          title="Open Project"
          className="p-1.5 rounded hover:bg-[#2b2d30] text-[#bcbec4] hover:text-white transition-colors"
        >
          <FolderOpen className="w-4 h-4 text-[#f0a732]" />
        </button>
        <button
          id="btn-save-project"
          onClick={onSave}
          title="Save All (Ctrl+S)"
          className="p-1.5 rounded hover:bg-[#2b2d30] text-[#bcbec4] hover:text-white transition-colors"
        >
          <Save className="w-4 h-4 text-[#3ddc84]" />
        </button>

        <div className="h-4 w-[1px] bg-[#2b2d30] mx-1" />

        <button
          id="btn-undo"
          onClick={onUndo}
          title="Undo"
          className="p-1.5 rounded hover:bg-[#2b2d30] text-[#bcbec4] hover:text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          id="btn-redo"
          onClick={onRedo}
          title="Redo"
          className="p-1.5 rounded hover:bg-[#2b2d30] text-[#bcbec4] hover:text-white transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
        <button
          id="btn-search-everywhere"
          onClick={onSearch}
          title="Search Everywhere (Double Shift)"
          className="p-1.5 rounded hover:bg-[#2b2d30] text-[#bcbec4] hover:text-white transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center group: Device selector, Run, Debug, Build */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* Anti-Fake Device Selector */}
        <div className="relative">
          <button
            id="device-selector-button"
            onClick={() => setDeviceDropdownOpen(!deviceDropdownOpen)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#2b2d30] hover:bg-[#35373c] text-xs border transition-colors ${
              hasDevice 
                ? 'text-[#dfe1e5] border-[#393b40]' 
                : 'text-amber-400/90 border-amber-500/30'
            }`}
          >
            <Smartphone className={`w-3.5 h-3.5 ${hasDevice ? 'text-[#3ddc84]' : 'text-amber-400'}`} />
            <span className="max-w-[130px] truncate text-[11px] font-medium">
              {deviceDisplayName}
            </span>
            <ChevronDown className="w-3 h-3 text-[#6c707e]" />
          </button>

          {deviceDropdownOpen && (
            <div className="absolute right-0 sm:left-0 top-full mt-1 w-64 bg-[#2b2d30] border border-[#393b40] rounded-lg shadow-2xl py-1 text-xs z-50 divide-y divide-[#393b40]/50">
              <div className="px-3 py-1 text-[10px] text-[#868a98] uppercase tracking-wider font-semibold">
                Target Device
              </div>

              {devices.length === 0 ? (
                <div className="p-3 text-center text-gray-400">
                  <div className="text-amber-400 font-bold text-[11px] mb-0.5 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>No Device Connected</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mb-2">
                    Connect an Android device via USB or Wireless ADB
                  </div>
                  <button
                    onClick={() => {
                      setDeviceDropdownOpen(false);
                      onToggleDeviceManager();
                    }}
                    className="w-full py-1 bg-[#3574f0] text-white rounded text-[10px] font-semibold hover:bg-[#2662db]"
                  >
                    Open Device Manager
                  </button>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto">
                  {devices.map(dev => (
                    <button
                      key={dev.id}
                      onClick={() => {
                        onSelectDevice(dev);
                        setDeviceDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[#3574f0] hover:text-white flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <Smartphone className="w-3.5 h-3.5 text-[#3ddc84]" />
                        <div>
                          <div className="font-medium text-white">{dev.name}</div>
                          <div className="text-[10px] opacity-70 font-mono">
                            {dev.id} • {dev.connectionType}
                          </div>
                        </div>
                      </div>
                      {selectedDevice?.id === dev.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#3ddc84]" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="p-1">
                <button
                  onClick={() => {
                    setDeviceDropdownOpen(false);
                    onToggleDeviceManager();
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-[#3574f0] hover:bg-[#3574f0] hover:text-white rounded transition-colors flex items-center gap-1.5 font-medium"
                >
                  <span>Device Manager & Pair Wireless ADB...</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Build / Assemble Hammer */}
        <button
          id="btn-build-hammer"
          onClick={() => onBuild('assembleDebug')}
          disabled={isBuilding}
          title="Make Project / Assemble APK (Ctrl+F9)"
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition-colors ${
            isBuilding 
              ? 'bg-[#3ddc84]/20 text-[#3ddc84] cursor-wait' 
              : 'bg-[#2b2d30] hover:bg-[#35373c] text-[#dfe1e5]'
          }`}
        >
          <Hammer className={`w-3.5 h-3.5 text-[#3ddc84] ${isBuilding ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline text-[11px] font-medium">Build</span>
        </button>

        {/* Run ▶ */}
        <button
          id="btn-run-app"
          onClick={onRun}
          disabled={isRunning || isBuilding}
          title="Run 'app' (Shift+F10)"
          className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-semibold shadow-sm transition-all ${
            isRunning 
              ? 'bg-[#3ddc84]/20 text-[#3ddc84]' 
              : 'bg-[#3ddc84] text-[#121316] hover:bg-[#46e68d]'
          }`}
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span className="text-[11px]">{runButtonState || 'Run'}</span>
        </button>

        {/* Debug 🐞 */}
        <button
          id="btn-debug-app"
          onClick={onDebug}
          disabled={isRunning || isBuilding}
          title="Debug 'app' (Shift+F9)"
          className="p-1.5 rounded hover:bg-[#2b2d30] text-[#ffc107] hover:text-yellow-300 transition-colors"
        >
          <Bug className="w-3.5 h-3.5" />
        </button>

        {/* Stop ⏹ (Strictly disabled if application is not currently running) */}
        <button
          id="btn-stop-app"
          onClick={onStop}
          disabled={!isRunning}
          title={isRunning ? "Stop 'app' (Ctrl+F2)" : "No app currently running on device"}
          className="p-1.5 rounded hover:bg-[#2b2d30] text-[#f25c54] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* Gradle Sync 🔄 */}
        <button
          id="btn-gradle-sync"
          onClick={onSyncGradle}
          title="Sync Project with Gradle Files"
          className="p-1.5 rounded hover:bg-[#2b2d30] text-[#3574f0] hover:text-blue-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right group: Fast panel toggles */}
      <div className="flex items-center space-x-1 shrink-0">
        {onOpenApkManager && (
          <button
            id="btn-open-apk-manager"
            onClick={onOpenApkManager}
            title="APK Manager"
            className="p-1.5 rounded hover:bg-[#2b2d30] text-[#bcbec4] hover:text-[#3ddc84] transition-colors"
          >
            <Package className="w-3.5 h-3.5" />
          </button>
        )}
        {onOpenGit && (
          <button
            id="btn-open-git-panel"
            onClick={onOpenGit}
            title="Git Version Control"
            className="p-1.5 rounded hover:bg-[#2b2d30] text-[#bcbec4] hover:text-[#3574f0] transition-colors"
          >
            <GitBranch className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          id="btn-open-layout-editor"
          onClick={onOpenLayoutEditor}
          title="Visual XML Layout Editor"
          className="p-1.5 rounded hover:bg-[#2b2d30] text-[#bcbec4] hover:text-white transition-colors hidden sm:inline-flex"
        >
          <Layers className="w-3.5 h-3.5 text-[#3574f0]" />
        </button>
        <button
          id="btn-toggle-terminal"
          onClick={onToggleTerminal}
          title="Terminal (Alt+F12)"
          className="p-1.5 rounded hover:bg-[#2b2d30] text-[#bcbec4] hover:text-white transition-colors"
        >
          <Terminal className="w-3.5 h-3.5" />
        </button>
        <button
          id="btn-toggle-logcat"
          onClick={onToggleLogcat}
          title="Logcat (Alt+6)"
          className="p-1.5 rounded hover:bg-[#2b2d30] text-[#bcbec4] hover:text-white transition-colors"
        >
          <AlignLeft className="w-3.5 h-3.5 text-[#3ddc84]" />
        </button>
        <button
          id="btn-open-settings"
          onClick={onToggleSettings}
          title="Settings (Ctrl+Alt+S)"
          className="p-1.5 rounded hover:bg-[#2b2d30] text-[#bcbec4] hover:text-white transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
