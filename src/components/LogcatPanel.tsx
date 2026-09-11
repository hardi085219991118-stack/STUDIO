import React, { useState, useRef, useEffect } from 'react';
import { 
  AlignLeft, Search, Trash2, Pause, Play, Download, 
  Filter, Check, Smartphone, AlertTriangle, RefreshCw
} from 'lucide-react';
import { LogcatMessage, LogLevel, DeviceInfo } from '../types';
import { AdbService } from '../services/AdbService';

interface LogcatPanelProps {
  logs: LogcatMessage[];
  onClearLogs: () => void;
  selectedDevice: DeviceInfo | null;
  onAppendLog?: (msg: LogcatMessage) => void;
}

export const LogcatPanel: React.FC<LogcatPanelProps> = ({
  logs,
  onClearLogs,
  selectedDevice,
  onAppendLog,
}) => {
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'device' | 'ide'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPaused && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isPaused]);

  // Fetch real logcat when device is connected
  const fetchRealLogcat = async () => {
    if (!selectedDevice) return;
    setIsStreaming(true);
    try {
      const res = await AdbService.getLogcat(selectedDevice.id, packageFilter || undefined, 80);
      if (res.success && res.output && onAppendLog) {
        const rawLines = res.output.split('\n');
        rawLines.forEach((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return;

          // 1. Match Threadtime: "05-26 11:23:45.678  1234  1567 I ActivityManager: message"
          const threadTimeMatch = trimmed.match(/^(\d{2}-\d{2}\s+[\d:.]+)\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+([^:]+):\s+(.*)$/);
          if (threadTimeMatch) {
            onAppendLog({
              id: `log-${Date.now()}-${idx}`,
              timestamp: threadTimeMatch[1],
              pid: parseInt(threadTimeMatch[2], 10),
              tid: parseInt(threadTimeMatch[3], 10),
              level: threadTimeMatch[4] as LogLevel,
              tag: threadTimeMatch[5].trim(),
              message: threadTimeMatch[6],
              source: 'device',
            });
            return;
          }

          // 2. Match Time: "05-26 11:23:45.678 I/ActivityManager( 1234): message"
          const timeMatch = trimmed.match(/^(\d{2}-\d{2}\s+[\d:.]+)\s+([VDIWEF])\/([^(]+)\(\s*(\d+)\):\s+(.*)$/);
          if (timeMatch) {
            onAppendLog({
              id: `log-${Date.now()}-${idx}`,
              timestamp: timeMatch[1],
              level: timeMatch[2] as LogLevel,
              tag: timeMatch[3].trim(),
              pid: parseInt(timeMatch[4], 10),
              tid: parseInt(timeMatch[4], 10),
              message: timeMatch[5],
              source: 'device',
            });
            return;
          }

          // 3. Match Brief: "I/ActivityManager( 1234): message"
          const briefMatch = trimmed.match(/^([VDIWEF])\/([^(]+)\(\s*(\d+)\):\s+(.*)$/);
          if (briefMatch) {
            onAppendLog({
              id: `log-${Date.now()}-${idx}`,
              timestamp: new Date().toLocaleTimeString(),
              level: briefMatch[1] as LogLevel,
              tag: briefMatch[2].trim(),
              pid: parseInt(briefMatch[3], 10),
              tid: parseInt(briefMatch[3], 10),
              message: briefMatch[4],
              source: 'device',
            });
            return;
          }

          // 4. Raw log fallback without inventing synthetic IDs
          let detectedLevel: LogLevel = 'I';
          if (trimmed.includes(' E ') || trimmed.startsWith('E/')) detectedLevel = 'E';
          else if (trimmed.includes(' W ') || trimmed.startsWith('W/')) detectedLevel = 'W';
          else if (trimmed.includes(' D ') || trimmed.startsWith('D/')) detectedLevel = 'D';
          else if (trimmed.includes(' V ') || trimmed.startsWith('V/')) detectedLevel = 'V';

          onAppendLog({
            id: `log-${Date.now()}-${idx}`,
            timestamp: new Date().toLocaleTimeString(),
            level: detectedLevel,
            tag: 'DeviceSystem',
            message: trimmed,
            source: 'device',
          });
        });
      } else if (!res.success && onAppendLog) {
        onAppendLog({
          id: `log-err-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'W',
          tag: 'AdbLogcat',
          message: res.limitationReason || res.error || 'LOGCAT LIMITED BY ENVIRONMENT: Unable to read stream from device',
          source: 'ide',
        });
      }
    } catch (e: any) {
      if (onAppendLog) {
        onAppendLog({
          id: `log-err-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'E',
          tag: 'AdbLogcat',
          message: `Logcat query error: ${e.message}`,
          source: 'ide',
        });
      }
    } finally {
      setIsStreaming(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) {
      return false;
    }
    if (sourceFilter !== 'ALL') {
      const actualSource = log.source || (log.tag.startsWith('IDE') ? 'ide' : 'device');
      if (actualSource !== sourceFilter) return false;
    }
    if (tagFilter && !log.tag.toLowerCase().includes(tagFilter.toLowerCase())) {
      return false;
    }
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase()) && !log.tag.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getLevelColor = (lvl: LogLevel) => {
    switch (lvl) {
      case 'V': return 'text-gray-400';
      case 'D': return 'text-[#3574f0]';
      case 'I': return 'text-[#3ddc84]';
      case 'W': return 'text-[#ffc107]';
      case 'E': return 'text-[#f25c54] font-semibold';
      case 'F': return 'text-white bg-red-600 px-1 rounded font-bold';
      default: return 'text-gray-300';
    }
  };

  const handleDownloadLogs = () => {
    const text = filteredLogs.map(l => `[${l.timestamp}] [${l.level}] ${l.tag}: ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logcat-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121316] text-[#bcbec4] text-xs font-mono select-text overflow-hidden">
      {/* Top Filter Bar */}
      <div className="bg-[#18191c] border-b border-[#2b2d30] p-1.5 flex flex-wrap items-center justify-between gap-2 select-none">
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1 text-[#3ddc84] font-semibold">
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Logcat</span>
          </span>

          <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
            selectedDevice 
              ? 'bg-[#2b2d30] text-[#3ddc84]' 
              : 'bg-amber-500/20 text-amber-400'
          }`}>
            {selectedDevice ? `${selectedDevice.name} (${selectedDevice.id})` : 'TIDAK ADA PERANGKAT TERHUBUNG'}
          </span>

          {selectedDevice && (
            <button
              onClick={fetchRealLogcat}
              disabled={isStreaming}
              className="p-1 rounded hover:bg-[#2b2d30] text-gray-400 hover:text-white"
              title="Ambil stream logcat perangkat terbaru via ADB"
            >
              <RefreshCw className={`w-3 h-3 text-[#3574f0] ${isStreaming ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center space-x-2">
          {/* Source Filter: Device vs IDE */}
          <div className="flex items-center bg-[#2b2d30] p-0.5 rounded border border-[#393b40] text-[10px]">
            <button
              onClick={() => setSourceFilter('ALL')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                sourceFilter === 'ALL' ? 'bg-[#3574f0] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setSourceFilter('device')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                sourceFilter === 'device' ? 'bg-[#3ddc84] text-black font-semibold' : 'text-gray-400 hover:text-white'
              }`}
              title="Log nyata langsung dari daemon adb logcat perangkat"
            >
              Device (ADB)
            </button>
            <button
              onClick={() => setSourceFilter('ide')}
              className={`px-1.5 py-0.5 rounded font-medium transition-colors ${
                sourceFilter === 'ide' ? 'bg-[#ffc107] text-black font-semibold' : 'text-gray-400 hover:text-white'
              }`}
              title="Notifikasi event internal Android Studio IDE"
            >
              IDE Event
            </button>
          </div>

          {/* Level Filter */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'ALL')}
            className="bg-[#2b2d30] border border-[#393b40] rounded px-2 py-0.5 text-[11px] text-white focus:outline-none"
          >
            <option value="ALL">Semua Level</option>
            <option value="V">Verbose (V)</option>
            <option value="D">Debug (D)</option>
            <option value="I">Info (I)</option>
            <option value="W">Peringatan (W)</option>
            <option value="E">Kesalahan (E)</option>
            <option value="F">Fatal (F)</option>
          </select>

          {/* Search Query */}
          <div className="flex items-center space-x-1 bg-[#2b2d30] px-2 py-0.5 rounded border border-[#393b40]">
            <Search className="w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Saring log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-[11px] w-24 sm:w-36"
            />
          </div>

          {/* Pause / Resume */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? 'Lanjutkan stream log' : 'Jeda stream log'}
            className={`p-1 rounded ${isPaused ? 'bg-[#ffc107] text-black font-bold' : 'hover:bg-[#2b2d30] text-gray-300'}`}
          >
            {isPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
          </button>

          {/* Download logs */}
          <button
            onClick={handleDownloadLogs}
            disabled={filteredLogs.length === 0}
            title="Ekspor output Logcat"
            className="p-1 hover:bg-[#2b2d30] rounded text-gray-400 hover:text-white disabled:opacity-30"
          >
            <Download className="w-3 h-3" />
          </button>

          {/* Clear */}
          <button
            onClick={onClearLogs}
            title="Bersihkan Logcat"
            className="p-1 hover:bg-[#2b2d30] rounded text-gray-400 hover:text-white"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Log Output Table */}
      <div className="flex-1 p-2 overflow-y-auto space-y-0.5 text-[11px] leading-tight">
        {!selectedDevice && logs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-500">
            <Smartphone className="w-8 h-8 text-gray-600 mb-2 stroke-[1.5]" />
            <div className="text-gray-300 font-semibold mb-1">TIDAK ADA PERANGKAT TERHUBUNG</div>
            <p className="text-[11px] text-gray-500 max-w-sm">
              Logcat memerlukan perangkat fisik Android aktif atau emulator dengan Debugging USB/Nirkabel yang terhubung ke daemon ADB.
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Tidak ada entri Logcat yang cocok dengan filter saat ini.
          </div>
        ) : (
          filteredLogs.map(log => {
            const isDevice = log.source === 'device' || (log.pid !== undefined && log.pid > 0);
            return (
              <div key={log.id} className="flex items-start space-x-2 hover:bg-[#18191c] px-1 py-0.5 rounded">
                <span className="text-gray-500 text-[10px] shrink-0">{log.timestamp}</span>
                {isDevice && log.pid ? (
                  <span className="text-emerald-500/80 text-[10px] shrink-0 font-mono" title="Device PID-TID">
                    {log.pid}-{log.tid ?? 0}
                  </span>
                ) : (
                  <span className="text-amber-400/80 text-[9px] px-1 bg-amber-400/10 rounded shrink-0 font-mono" title="IDE Internal Event">
                    IDE
                  </span>
                )}
                <span className={`w-3.5 text-center shrink-0 font-bold ${getLevelColor(log.level)}`}>
                  {log.level}
                </span>
                <span className="text-[#a97bff] shrink-0 font-semibold max-w-[120px] truncate">{log.tag}:</span>
                <span className={`flex-1 break-all ${getLevelColor(log.level)}`}>
                  {log.message}
                </span>
              </div>
            );
          })
        )}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};
