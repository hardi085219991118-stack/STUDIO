import React, { useState } from 'react';
import { 
  Smartphone, RotateCw, RefreshCw, X, AlertTriangle, 
  Power, Play, Square, Circle, Triangle, CheckCircle2
} from 'lucide-react';
import { DeviceInfo, ProjectConfig } from '../types';

interface DeviceSimulatorProps {
  device: DeviceInfo | null;
  config: ProjectConfig;
  isRunning: boolean;
  onStop: () => void;
  onRestart: () => void;
  onSendLog: (tag: string, message: string) => void;
  onOpenDeviceManager?: () => void;
}

export const DeviceSimulator: React.FC<DeviceSimulatorProps> = ({
  device,
  config,
  isRunning,
  onStop,
  onRestart,
  onSendLog,
  onOpenDeviceManager,
}) => {
  const [clickCount, setClickCount] = useState(0);
  const [activeToast, setActiveToast] = useState<string | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'app'>('app');

  const showToast = (msg: string) => {
    setActiveToast(msg);
    onSendLog('MainActivity', `Toast shown: "${msg}"`);
    setTimeout(() => {
      setActiveToast(null);
    }, 2500);
  };

  const handleActionClick = () => {
    const next = clickCount + 1;
    setClickCount(next);
    onSendLog('MainActivity', `Button clicked: tap count = ${next}`);
    showToast(`Button Clicked! Count is ${next}`);
  };

  const handleResetClick = () => {
    setClickCount(0);
    onSendLog('MainActivity', 'Counter reset to 0');
    showToast('Counter Reset');
  };

  const handleBack = () => {
    onSendLog('ActivityManager', 'Back pressed: finishing MainActivity');
    setCurrentScreen('home');
  };

  const handleHome = () => {
    onSendLog('ActivityManager', 'Home pressed: onPause() -> onStop()');
    setCurrentScreen('home');
  };

  const handleLaunchApp = () => {
    onSendLog('ActivityManager', `START u0 {act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] cmp=${config.packageName}/.MainActivity}`);
    setCurrentScreen('app');
  };

  // If no real device connected: strictly adhere to anti-fake rule
  if (!device) {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#121316] text-[#bcbec4] select-none items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#1e1f22] border border-[#393b40] flex items-center justify-center mb-4">
          <Smartphone className="w-8 h-8 text-amber-400 stroke-[1.5]" />
        </div>
        <h3 className="text-white font-bold text-sm mb-1">NO DEVICE CONNECTED</h3>
        <p className="text-xs text-gray-400 max-w-sm mb-4">
          Running and testing the application requires an active physical or virtual Android device connected via ADB.
        </p>
        {onOpenDeviceManager && (
          <button
            onClick={onOpenDeviceManager}
            className="px-4 py-2 rounded-lg bg-[#3574f0] hover:bg-[#2662db] text-white font-semibold text-xs flex items-center space-x-2 transition-colors shadow-sm"
          >
            <Smartphone className="w-4 h-4" />
            <span>Open Device Manager</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121316] text-[#bcbec4] select-none items-center justify-center p-2 overflow-auto font-mono">
      {/* Device Controls Bar */}
      <div className="w-full max-w-sm flex items-center justify-between mb-1 px-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-[#3ddc84] animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-white font-bold truncate max-w-[170px]">{device.name}</span>
          <span className="text-[10px] text-gray-400">({device.connectionType})</span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsLandscape(!isLandscape)}
            title="Rotate Device"
            className="p-1 hover:bg-[#2b2d30] rounded text-gray-300 hover:text-white transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          {isRunning && (
            <>
              <button
                onClick={onRestart}
                title="Restart App"
                className="p-1 hover:bg-[#2b2d30] rounded text-gray-300 hover:text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onStop}
                title="Stop App Execution"
                className="p-1 hover:bg-[#2b2d30] rounded text-red-400 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Distinction Badge */}
      <div className="w-full max-w-sm mb-2 px-2 flex items-center justify-between text-[10px] text-gray-400">
        <span className="bg-[#3574f0]/10 text-[#3574f0] border border-[#3574f0]/30 px-1.5 py-0.5 rounded font-mono font-semibold">
          SIMULATED PREVIEW (Interactive Sandbox)
        </span>
        <span className="text-[9px] text-gray-500">Fast UI Event Bench</span>
      </div>

      {/* Phone Body Frame */}
      <div
        className={`relative bg-[#18191c] border-4 border-[#2b2d30] rounded-[36px] shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isLandscape ? 'w-[520px] h-[280px]' : 'w-[290px] h-[520px]'
        }`}
      >
        {/* Status Bar */}
        <div className="h-6 bg-black/80 px-4 flex items-center justify-between text-[10px] text-gray-300 shrink-0 z-20">
          <span>12:45</span>
          {/* Front Camera Hole */}
          <div className="w-2.5 h-2.5 rounded-full bg-black ring-1 ring-gray-700 mx-auto" />
          <div className="flex items-center space-x-1.5">
            <span>5G</span>
            <span>98%</span>
          </div>
        </div>

        {/* Screen Content */}
        <div className="flex-1 bg-[#121316] relative flex flex-col overflow-hidden">
          {!isRunning ? (
            /* App Not Running Screen */
            <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
              <Power className="w-10 h-10 text-gray-600 mb-3 stroke-[1.5]" />
              <div className="text-gray-300 font-bold text-xs mb-1">APP NOT RUNNING</div>
              <p className="text-[11px] text-gray-500 max-w-[200px] mb-4">
                Click "Run" in toolbar to build, install, and start the application on {device.name}.
              </p>
              <button
                onClick={onRestart}
                className="px-3 py-1.5 rounded-lg bg-[#3ddc84] text-[#121316] font-bold text-xs flex items-center space-x-1.5 hover:bg-[#46e68d] transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch App</span>
              </button>
            </div>
          ) : currentScreen === 'app' ? (
            /* Active App Screen */
            <div className="flex-1 p-4 flex flex-col items-center justify-center text-center overflow-y-auto">
              {/* App Bar */}
              <div className="w-full text-left font-bold text-white text-xs mb-4 border-b border-[#2b2d30] pb-2 flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#3ddc84] flex items-center justify-center">
                  <Smartphone className="w-2.5 h-2.5 text-black" />
                </div>
                <span className="truncate">{config.name}</span>
              </div>

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3ddc84] to-[#07c160] flex items-center justify-center shadow-lg mb-2">
                <Smartphone className="w-8 h-8 text-[#121316]" />
              </div>

              <h2 className="text-sm font-bold text-white mb-0.5">{config.name}</h2>
              <p className="text-[10px] text-gray-400 mb-3 truncate max-w-full">{config.packageName}</p>

              {/* Live Tap Counter */}
              <div className="text-2xl font-bold text-[#3ddc84] mb-4">
                Taps: {clickCount}
              </div>

              {/* Action Buttons */}
              <button
                id="emulator-action-button"
                onClick={handleActionClick}
                className="w-full py-2 px-3 rounded-xl bg-[#3ddc84] text-[#121316] font-bold text-xs mb-2 shadow hover:bg-[#46e68d] active:scale-95 transition-transform"
              >
                Click Me
              </button>

              <button
                id="emulator-reset-button"
                onClick={handleResetClick}
                className="w-full py-1.5 px-3 rounded-xl bg-[#2b2d30] text-gray-300 text-xs hover:bg-[#35373c] active:scale-95 transition-transform"
              >
                Reset Counter
              </button>
            </div>
          ) : (
            /* Android Home Launcher Screen */
            <div className="flex-1 p-4 flex flex-col justify-end bg-gradient-to-b from-[#1a1c23] to-[#121316]">
              <div className="grid grid-cols-4 gap-3 p-2">
                <div
                  onClick={handleLaunchApp}
                  className="flex flex-col items-center cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#3ddc84] to-[#07c160] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <Smartphone className="w-6 h-6 text-[#121316]" />
                  </div>
                  <span className="text-[9px] text-white mt-1 truncate max-w-[50px]">{config.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Android Toast Notification */}
          {activeToast && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#2b2d30]/95 text-white text-[10px] px-3 py-1 rounded-full shadow-2xl border border-white/10 z-30 whitespace-nowrap">
              {activeToast}
            </div>
          )}
        </div>

        {/* Navigation Bar (Back, Home, Recents) */}
        <div className="h-6 bg-black/90 flex items-center justify-around text-gray-400 text-xs shrink-0 z-20">
          <button onClick={handleBack} className="p-1 hover:text-white" title="Back">
            <Triangle className="w-3 h-3 -rotate-90" />
          </button>
          <button onClick={handleHome} className="p-1 hover:text-white" title="Home">
            <Circle className="w-3 h-3" />
          </button>
          <button onClick={() => setCurrentScreen('app')} className="p-1 hover:text-white" title="Recents">
            <Square className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
