import React, { useState, useEffect } from 'react';
import { 
  Smartphone, Wifi, Usb, Cpu, ShieldAlert, CheckCircle2, 
  X, RefreshCw, Terminal, AlertTriangle, ArrowRight, Play,
  HardDrive, Info, Battery, Activity
} from 'lucide-react';
import { DeviceInfo } from '../types';
import { AdbService } from '../services/AdbService';

interface DeviceManagerModalProps {
  devices: DeviceInfo[];
  selectedDevice: DeviceInfo | null;
  onSelectDevice: (device: DeviceInfo | null) => void;
  onClose: () => void;
  onRefreshDevices: () => Promise<void>;
  isRefreshing?: boolean;
  adbAvailable?: boolean;
  limitationReason?: string;
}

export const DeviceManagerModal: React.FC<DeviceManagerModalProps> = ({
  devices,
  selectedDevice,
  onSelectDevice,
  onClose,
  onRefreshDevices,
  isRefreshing = false,
  adbAvailable = false,
  limitationReason,
}) => {
  const [activeTab, setActiveTab] = useState<'devices' | 'wireless' | 'adb_console' | 'diagnostics'>('devices');
  const [wirelessIp, setWirelessIp] = useState('192.168.1.100');
  const [wirelessPort, setWirelessPort] = useState('5555');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingStatus, setPairingStatus] = useState<string | null>(null);
  const [isPairing, setIsPairing] = useState(false);

  // ADB Console
  const [adbCommand, setAdbCommand] = useState('getprop ro.product.model');
  const [adbOutput, setAdbOutput] = useState<string>('');
  const [isExecutingAdb, setIsExecutingAdb] = useState(false);

  useEffect(() => {
    if (!adbAvailable && limitationReason) {
      setAdbOutput(`ADB Status: LIMITED BY ENVIRONMENT\nReason: ${limitationReason}\n\nNative USB host forwarding and ADB daemon are not bound to this container.`);
    } else {
      setAdbOutput('ADB daemon ready. Enter shell command to run on selected device.');
    }
  }, [adbAvailable, limitationReason]);

  const handleExecuteAdb = async () => {
    if (!adbCommand.trim()) return;
    setIsExecutingAdb(true);
    try {
      const res = await AdbService.executeShell(selectedDevice?.id, adbCommand);
      if (res.success) {
        setAdbOutput(res.stdout || '[Command completed with no output]');
      } else {
        setAdbOutput(`Exit Code: ${res.exitCode}\nStderr: ${res.stderr || 'Execution failed'}`);
      }
    } catch (err: any) {
      setAdbOutput(`Error: ${err.message}`);
    } finally {
      setIsExecutingAdb(false);
    }
  };

  const handlePair = async () => {
    setIsPairing(true);
    setPairingStatus(`Attempting wireless pairing with ${wirelessIp}:${wirelessPort}...`);
    try {
      if (pairingCode.trim()) {
        const pairRes = await AdbService.pairWireless(wirelessIp, wirelessPort, pairingCode);
        if (!pairRes.success) {
          setPairingStatus(pairRes.error || pairRes.output || 'Wireless ADB pairing limited by environment.');
          return;
        }
      }
      const connectRes = await AdbService.connectWireless(wirelessIp, wirelessPort);
      if (connectRes.success) {
        setPairingStatus(`Connected to ${wirelessIp}:${wirelessPort}!`);
        await onRefreshDevices();
      } else {
        setPairingStatus(connectRes.error || connectRes.output || 'Connection failed.');
      }
    } catch (err: any) {
      setPairingStatus(`Error: ${err.message}`);
    } finally {
      setIsPairing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 select-none backdrop-blur-xs">
      <div className="bg-[#1e1f22] border border-[#393b40] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs">
        {/* Header */}
        <div className="bg-[#18191c] border-b border-[#2b2d30] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-4 h-4 text-[#3ddc84]" />
            <h2 className="font-bold text-white text-sm">Device Manager & ADB</h2>
            <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
              devices.length > 0 
                ? 'bg-[#3ddc84]/20 text-[#3ddc84]' 
                : 'bg-amber-500/20 text-amber-400'
            }`}>
              {devices.length > 0 ? `${devices.length} ONLINE` : 'NO DEVICE'}
            </span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded hover:bg-[#2b2d30] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-[#2b2d30] border-b border-[#393b40] px-3 font-mono text-[11px] overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('devices')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 ${
              activeTab === 'devices' ? 'border-[#3574f0] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Connected Devices ({devices.length})
          </button>
          <button
            onClick={() => setActiveTab('wireless')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 ${
              activeTab === 'wireless' ? 'border-[#3574f0] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Pair Wireless ADB
          </button>
          <button
            onClick={() => setActiveTab('adb_console')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 ${
              activeTab === 'adb_console' ? 'border-[#3574f0] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            ADB Shell
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 ${
              activeTab === 'diagnostics' ? 'border-[#3574f0] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Diagnostics & Capabilities
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* TAB 1: CONNECTED DEVICES */}
          {activeTab === 'devices' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold text-xs">Target Android Devices</h3>
                  <p className="text-[11px] text-gray-400">
                    Real physical and virtual devices discovered via ADB.
                  </p>
                </div>
                <button
                  onClick={onRefreshDevices}
                  disabled={isRefreshing}
                  className="px-2.5 py-1.5 rounded bg-[#2b2d30] hover:bg-[#35373c] text-white flex items-center space-x-1.5 border border-[#393b40] transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#3ddc84] ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh Devices</span>
                </button>
              </div>

              {devices.length === 0 ? (
                <div className="border border-dashed border-[#393b40] rounded-xl p-8 text-center flex flex-col items-center justify-center bg-[#18191c]">
                  <Smartphone className="w-12 h-12 text-gray-600 mb-3 stroke-[1.5]" />
                  <div className="text-white font-bold text-sm mb-1">NO DEVICE CONNECTED</div>
                  <p className="text-xs text-gray-400 max-w-md mb-4">
                    {!adbAvailable 
                      ? 'ADB daemon binary is not installed in the container environment. Connecting physical USB devices or running ADB inside this web sandbox requires an external ADB server or bridge.'
                      : 'No Android device attached. Enable "USB Debugging" in Developer Options on your phone, connect via USB, or pair using Wireless ADB.'}
                  </p>

                  <div className="bg-[#1e1f22] border border-[#2b2d30] rounded-lg p-3 text-left w-full max-w-md text-[11px] text-gray-300 space-y-1.5 font-mono">
                    <div className="font-bold text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Troubleshooting Steps:</span>
                    </div>
                    <div>1. Enable Developer Options: Tap Build Number 7 times.</div>
                    <div>2. Toggle USB Debugging: Settings → System → Developer options.</div>
                    <div>3. Allow USB Debugging prompt when connecting to PC/Host.</div>
                    <div>4. Or use Pair Wireless ADB tab with device IP & Port.</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {devices.map((device) => {
                    const isSelected = selectedDevice?.id === device.id;
                    return (
                      <div
                        key={device.id}
                        onClick={() => onSelectDevice(device)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-[#2b2d30] border-[#3ddc84] shadow-md'
                            : 'bg-[#18191c] border-[#2b2d30] hover:border-[#393b40]'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`p-2.5 rounded-lg border ${
                            device.status === 'ONLINE' 
                              ? 'bg-[#3ddc84]/10 border-[#3ddc84]/30 text-[#3ddc84]' 
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                          }`}>
                            <Smartphone className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs flex items-center gap-2">
                              <span>{device.name}</span>
                              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase font-bold ${
                                device.status === 'ONLINE' ? 'bg-[#3ddc84]/20 text-[#3ddc84]' : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {device.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                              Serial: {device.id} • {device.connectionType} • {device.architecture}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {isSelected ? (
                            <span className="flex items-center space-x-1 text-[#3ddc84] text-xs font-semibold">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Selected Target</span>
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDevice(device);
                              }}
                              className="px-2.5 py-1 rounded bg-[#2b2d30] hover:bg-[#3574f0] text-gray-300 hover:text-white transition-colors"
                            >
                              Select
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WIRELESS ADB */}
          {activeTab === 'wireless' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-semibold text-xs">Pair Device Over Wi-Fi</h3>
                <p className="text-[11px] text-gray-400">
                  Connect using Android 11+ Wireless Debugging (QR Code or 6-digit pairing code).
                </p>
              </div>

              {!adbAvailable && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-300 flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <div className="font-bold text-xs">WIRELESS ADB LIMITED BY ENVIRONMENT</div>
                    <div className="text-[11px] opacity-90 mt-0.5">
                      ADB client is not available in the container runtime. Commands cannot directly open TCP sockets to private LAN addresses without an external ADB daemon.
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-[#18191c] border border-[#2b2d30] rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-gray-400 font-mono mb-1">IP Address</label>
                    <input
                      type="text"
                      value={wirelessIp}
                      onChange={(e) => setWirelessIp(e.target.value)}
                      placeholder="e.g. 192.168.1.100"
                      className="w-full bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#3574f0]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 font-mono mb-1">Port</label>
                    <input
                      type="text"
                      value={wirelessPort}
                      onChange={(e) => setWirelessPort(e.target.value)}
                      placeholder="e.g. 5555"
                      className="w-full bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#3574f0]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 font-mono mb-1">6-Digit Pairing Code (Optional)</label>
                  <input
                    type="text"
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value)}
                    placeholder="e.g. 123456"
                    className="w-full bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#3574f0]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-gray-500 font-mono">
                    Target: {wirelessIp}:{wirelessPort}
                  </span>
                  <button
                    onClick={handlePair}
                    disabled={isPairing || !adbAvailable}
                    className="px-4 py-1.5 rounded bg-[#3574f0] hover:bg-[#2662db] text-white font-semibold flex items-center space-x-1.5 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    <span>{isPairing ? 'Connecting...' : 'Pair & Connect'}</span>
                  </button>
                </div>

                {pairingStatus && (
                  <div className="p-2 rounded bg-[#1e1f22] border border-[#393b40] text-gray-300 font-mono text-[11px]">
                    {pairingStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ADB CONSOLE */}
          {activeTab === 'adb_console' && (
            <div className="space-y-3 flex flex-col h-full">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold text-xs">ADB Command Runner</h3>
                  <p className="text-[11px] text-gray-400">
                    Target: {selectedDevice ? `${selectedDevice.name} (${selectedDevice.id})` : 'No device selected'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={adbCommand}
                  onChange={(e) => setAdbCommand(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExecuteAdb()}
                  placeholder="adb shell command..."
                  className="flex-1 bg-[#18191c] border border-[#393b40] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#3574f0]"
                />
                <button
                  onClick={handleExecuteAdb}
                  disabled={isExecutingAdb || !adbAvailable}
                  className="px-3 py-1.5 rounded bg-[#2b2d30] hover:bg-[#3574f0] text-white font-semibold flex items-center space-x-1.5 disabled:opacity-40 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run</span>
                </button>
              </div>

              <div className="bg-[#141517] border border-[#2b2d30] rounded-lg p-3 font-mono text-[11px] text-gray-300 h-64 overflow-y-auto whitespace-pre-wrap">
                {adbOutput || 'No output recorded yet.'}
              </div>
            </div>
          )}

          {/* TAB 4: DIAGNOSTICS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              <h3 className="text-white font-semibold text-xs">Container & Hardware Capabilities</h3>

              <div className="bg-[#18191c] border border-[#2b2d30] rounded-lg divide-y divide-[#2b2d30] text-[11px] font-mono">
                <div className="p-3 flex items-center justify-between">
                  <span className="text-gray-400">ADB Tool Status</span>
                  <span className={`font-bold ${adbAvailable ? 'text-[#3ddc84]' : 'text-amber-400'}`}>
                    {adbAvailable ? 'INSTALLED & READY' : 'NOT FOUND IN PATH'}
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-gray-400">USB Host Passthrough</span>
                  <span className="text-gray-300">RESTRICTED (Container Sandboxed)</span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-gray-400">Execution Principle</span>
                  <span className="text-[#3ddc84]">NON-ROOT FIRST</span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-gray-400">Target APK Install Strategy</span>
                  <span className="text-gray-300">Direct ADB Streaming (-r -d)</span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-gray-400">Limitation Policy</span>
                  <span className="text-amber-400">Strictly Non-Falsified (No Mock Devices)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
