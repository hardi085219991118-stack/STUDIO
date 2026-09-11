import React, { useState } from 'react';
import {
  Play,
  Pause,
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Circle,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Terminal,
  Activity,
  Layers,
  Search,
  ChevronRight,
  ChevronDown,
  Info,
  RotateCw,
  Sliders,
} from 'lucide-react';
import { Breakpoint, StackFrame, VariableItem } from '../types';

interface DebuggerPanelProps {
  breakpoints: Breakpoint[];
  onToggleBreakpoint: (id: string) => void;
  onRemoveBreakpoint: (id: string) => void;
  onJumpToBreakpoint: (filePath: string, line: number) => void;
  isAppRunning: boolean;
  selectedDevice: any | null;
  activeFileName?: string;
}

export const DebuggerPanel: React.FC<DebuggerPanelProps> = ({
  breakpoints,
  onToggleBreakpoint,
  onRemoveBreakpoint,
  onJumpToBreakpoint,
  isAppRunning,
  selectedDevice,
  activeFileName = 'MainActivity.kt',
}) => {
  const [activeTab, setActiveTab] = useState<'variables' | 'stack' | 'watches' | 'breakpoints' | 'console'>('variables');
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Watch expressions state
  const [watches, setWatches] = useState<{ id: string; expression: string; value: string }[]>([
    { id: 'w1', expression: 'savedInstanceState', value: 'null' },
    { id: 'w2', expression: 'isFinishing', value: 'false' },
  ]);
  const [newWatchInput, setNewWatchInput] = useState<string>('');

  // Debug Console state
  const [consoleInput, setConsoleInput] = useState<string>('');
  const [consoleLogs, setConsoleLogs] = useState<{ id: string; type: 'input' | 'output' | 'info'; text: string; timestamp: string }[]>([
    {
      id: 'c0',
      type: 'info',
      text: 'Connected to process debugger session. Type expressions to evaluate.',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  // Dynamic Call Stack
  const defaultFrames: StackFrame[] = [
    { id: 'f1', method: 'onCreate(savedInstanceState: Bundle?)', className: activeFileName.replace(/\.(kt|java)$/, ''), fileName: activeFileName, line: 18, isUserCode: true },
    { id: 'f2', method: 'performCreate(savedInstanceState: Bundle?)', className: 'Activity', fileName: 'Activity.java', line: 7136, isUserCode: false },
    { id: 'f3', method: 'callActivityOnCreate(activity: Activity)', className: 'Instrumentation', fileName: 'Instrumentation.java', line: 1309, isUserCode: false },
    { id: 'f4', method: 'performLaunchActivity(r: ActivityClientRecord)', className: 'ActivityThread', fileName: 'ActivityThread.java', line: 3422, isUserCode: false },
    { id: 'f5', method: 'handleLaunchActivity(r: ActivityClientRecord)', className: 'ActivityThread', fileName: 'ActivityThread.java', line: 3601, isUserCode: false },
    { id: 'f6', method: 'dispatchMessage(msg: Message)', className: 'Handler', fileName: 'Handler.java', line: 106, isUserCode: false },
    { id: 'f7', method: 'loopOnce(me: Looper)', className: 'Looper', fileName: 'Looper.java', line: 201, isUserCode: false },
  ];
  const [frames] = useState<StackFrame[]>(defaultFrames);
  const [selectedFrameId, setSelectedFrameId] = useState<string>('f1');

  // Dynamic Variables
  const initialVariables: VariableItem[] = [
    {
      name: 'this',
      type: activeFileName.replace(/\.(kt|java)$/, ''),
      value: `@${Math.floor(1000 + Math.random() * 9000)}`,
      children: [
        { name: 'mWindow', type: 'PhoneWindow', value: '@4591' },
        { name: 'mFragments', type: 'FragmentController', value: '@2812' },
        { name: 'mDestroyed', type: 'boolean', value: 'false' },
      ],
    },
    {
      name: 'savedInstanceState',
      type: 'Bundle?',
      value: 'null',
    },
    {
      name: 'intent',
      type: 'Intent',
      value: 'Intent { act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] }',
      children: [
        { name: 'mAction', type: 'String', value: '"android.intent.action.MAIN"' },
        { name: 'mCategories', type: 'ArraySet<String>', value: 'size = 1' },
        { name: 'mFlags', type: 'int', value: '0x10000000' },
      ],
    },
    {
      name: 'resources',
      type: 'Resources',
      value: 'android.content.res.Resources@7a14',
    },
  ];

  const [variables, setVariables] = useState<VariableItem[]>(initialVariables);
  const [expandedVars, setExpandedVars] = useState<Record<string, boolean>>({ 'this': true });

  const toggleVarExpand = (name: string) => {
    setExpandedVars(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleAddWatch = () => {
    if (!newWatchInput.trim()) return;
    const expr = newWatchInput.trim();
    let val = 'undefined';
    if (expr === 'this') val = `@${Math.floor(1000 + Math.random() * 9000)}`;
    else if (expr.includes('+') || expr.includes('*')) {
      try {
        // Safe evaluation of simple math
        const sanitized = expr.replace(/[^0-9+\-*/().]/g, '');
        if (sanitized) val = String(Function(`"use strict"; return (${sanitized})`)());
      } catch (e) {
        val = 'error: syntax';
      }
    } else {
      val = expr.length % 2 === 0 ? 'true' : '0';
    }
    setWatches(prev => [...prev, { id: 'w-' + Date.now(), expression: expr, value: val }]);
    setNewWatchInput('');
  };

  const handleRemoveWatch = (id: string) => {
    setWatches(prev => prev.filter(w => w.id !== id));
  };

  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consoleInput.trim()) return;
    const cmd = consoleInput.trim();
    const ts = new Date().toLocaleTimeString();

    let output = '';
    if (cmd === 'clear') {
      setConsoleLogs([]);
      setConsoleInput('');
      return;
    } else if (cmd.startsWith('print ') || cmd.startsWith('p ')) {
      const expr = cmd.replace(/^p(rint)?\s+/, '');
      output = `result = ${expr}`;
    } else if (cmd === 'help') {
      output = 'Perintah debugger: p <expr> (evaluasi), threads (daftar thread), bt (backtrace), clear (bersihkan konsol)';
    } else if (cmd === 'threads') {
      output = 'Thread [1] main (RUNNING)\nThread [2] FinalizerDaemon (WAITING)\nThread [3] RenderThread (TIMED_WAITING)';
    } else if (cmd === 'bt') {
      output = frames.map((f, i) => `#${i} ${f.className}.${f.method} at ${f.fileName}:${f.line}`).join('\n');
    } else {
      try {
        const sanitized = cmd.replace(/[^0-9+\-*/().]/g, '');
        if (sanitized) {
          output = String(Function(`"use strict"; return (${sanitized})`)());
        } else {
          output = `Evaluated: ${cmd} => (Instance of Object)`;
        }
      } catch (err: any) {
        output = `Error evaluating: ${err.message}`;
      }
    }

    setConsoleLogs(prev => [
      ...prev,
      { id: 'in-' + Date.now(), type: 'input', text: cmd, timestamp: ts },
      { id: 'out-' + Date.now(), type: 'output', text: output, timestamp: ts },
    ]);
    setConsoleInput('');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e1f22] text-[#bcbec4] overflow-hidden select-none font-sans text-xs">
      {/* Top Debugger Control Toolbar */}
      <div className="bg-[#18191c] border-b border-[#2b2d30] px-3 py-1.5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-2 py-1 rounded flex items-center space-x-1 font-semibold transition-colors ${
              isPaused
                ? 'bg-[#3574f0] text-white hover:bg-[#2b64d6]'
                : 'bg-[#2b2d30] text-gray-300 hover:text-white hover:bg-[#35373c]'
            }`}
            title={isPaused ? 'Resume Program (F9)' : 'Pause Program (Ctrl+Pause)'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <div className="h-4 w-px bg-[#2b2d30]" />

          <button
            onClick={() => setCurrentStepIndex(prev => prev + 1)}
            disabled={!isPaused}
            className="p-1 rounded hover:bg-[#2b2d30] text-gray-300 hover:text-white disabled:opacity-40"
            title="Step Over (F8)"
          >
            <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
          </button>

          <button
            onClick={() => setCurrentStepIndex(prev => prev + 1)}
            disabled={!isPaused}
            className="p-1 rounded hover:bg-[#2b2d30] text-gray-300 hover:text-white disabled:opacity-40"
            title="Step Into (F7)"
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-green-400" />
          </button>

          <button
            onClick={() => setCurrentStepIndex(prev => Math.max(0, prev - 1))}
            disabled={!isPaused}
            className="p-1 rounded hover:bg-[#2b2d30] text-gray-300 hover:text-white disabled:opacity-40"
            title="Step Out (Shift+F8)"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
          </button>

          <div className="h-4 w-px bg-[#2b2d30]" />

          {/* Connection Status Badge */}
          <div className="flex items-center space-x-1.5 bg-[#25272a] px-2 py-0.5 rounded border border-[#35373c] text-[11px]">
            <span className={`w-2 h-2 rounded-full ${isAppRunning ? (isPaused ? 'bg-amber-400 animate-pulse' : 'bg-[#3ddc84]') : 'bg-gray-500'}`} />
            <span className="font-mono text-gray-300">
              {isAppRunning ? (isPaused ? 'SUSPENDED AT BREAKPOINT' : 'RUNNING (JDWP)') : 'DEBUGGER IDLE'}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] text-gray-400">
          <span className="font-mono">Thread: main@1</span>
          {breakpoints.length > 0 && (
            <span className="bg-[#e06c75]/20 text-[#e06c75] px-1.5 py-0.2 rounded font-mono font-semibold">
              {breakpoints.filter(b => b.enabled).length} titik henti
            </span>
          )}
        </div>
      </div>

      {/* Subtabs Bar */}
      <div className="bg-[#18191c] border-b border-[#2b2d30] px-3 flex items-center space-x-1 shrink-0">
        <button
          onClick={() => setActiveTab('variables')}
          className={`px-3 py-1.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'variables'
              ? 'border-[#3574f0] text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Variables</span>
        </button>

        <button
          onClick={() => setActiveTab('stack')}
          className={`px-3 py-1.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'stack'
              ? 'border-[#3574f0] text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Frames ({frames.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('watches')}
          className={`px-3 py-1.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'watches'
              ? 'border-[#3574f0] text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Watches ({watches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('breakpoints')}
          className={`px-3 py-1.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'breakpoints'
              ? 'border-[#3574f0] text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Circle className="w-3 h-3 text-[#e06c75] fill-[#e06c75]" />
          <span>Breakpoints ({breakpoints.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('console')}
          className={`px-3 py-1.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
            activeTab === 'console'
              ? 'border-[#3574f0] text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Debug Console</span>
        </button>
      </div>

      {/* Main Tab Views */}
      <div className="flex-1 overflow-auto p-3">
        {/* TAB 1: VARIABLES */}
        {activeTab === 'variables' && (
          <div className="space-y-1 font-mono text-[11px]">
            <div className="text-gray-400 mb-2 flex items-center justify-between">
              <span>Scope: Local / Member Variables</span>
              <span className="text-[10px] text-gray-500">Klik variabel untuk membuka inspeksi hierarki</span>
            </div>
            {variables.map(v => (
              <div key={v.name} className="py-0.5">
                <div
                  onClick={() => v.children && toggleVarExpand(v.name)}
                  className={`flex items-center space-x-1.5 px-2 py-1 rounded hover:bg-[#2b2d30] cursor-pointer ${
                    expandedVars[v.name] ? 'bg-[#25272a]' : ''
                  }`}
                >
                  {v.children ? (
                    expandedVars[v.name] ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />
                  ) : (
                    <span className="w-3 inline-block" />
                  )}
                  <span className="text-[#98c379] font-semibold">{v.name}</span>
                  <span className="text-gray-500">:</span>
                  <span className="text-[#61afef]">{v.type}</span>
                  <span className="text-gray-400">=</span>
                  <span className="text-[#e5c07b] truncate max-w-md">{v.value}</span>
                </div>

                {/* Sub-children */}
                {v.children && expandedVars[v.name] && (
                  <div className="pl-6 border-l border-[#35373c] ml-3 mt-0.5 space-y-0.5">
                    {v.children.map(child => (
                      <div key={child.name} className="flex items-center space-x-1.5 px-2 py-0.5 rounded hover:bg-[#2b2d30]">
                        <span className="text-[#98c379]">{child.name}</span>
                        <span className="text-gray-500">:</span>
                        <span className="text-[#61afef]">{child.type}</span>
                        <span className="text-gray-400">=</span>
                        <span className="text-[#e5c07b]">{child.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 2: CALL STACK */}
        {activeTab === 'stack' && (
          <div className="space-y-1 font-mono text-[11px]">
            <div className="text-gray-400 mb-2 flex items-center justify-between">
              <span>Thread Stack Trace: main (id=1, priority=5)</span>
              <span className="text-[10px] text-gray-500">Pilih frame untuk melihat konteks eksekusi</span>
            </div>
            {frames.map((frame, index) => {
              const isSelected = selectedFrameId === frame.id;
              return (
                <div
                  key={frame.id}
                  onClick={() => setSelectedFrameId(frame.id)}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#3574f0]/20 text-white border border-[#3574f0]/40'
                      : 'hover:bg-[#2b2d30] text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-500 text-[10px] w-4">#{index}</span>
                    <span className={frame.isUserCode ? 'text-[#61afef] font-semibold' : 'text-gray-400'}>
                      {frame.className}.{frame.method}
                    </span>
                  </div>
                  <div className="text-gray-500 text-[10px]">
                    {frame.fileName}:{frame.line}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: WATCHES */}
        {activeTab === 'watches' && (
          <div className="space-y-3 font-mono text-[11px]">
            {/* Input new watch */}
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={newWatchInput}
                onChange={(e) => setNewWatchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddWatch()}
                placeholder="Tambah ekspresi watch (contoh: binding.root.id, count + 1)..."
                className="flex-1 bg-[#18191c] border border-[#2b2d30] rounded px-2.5 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#3574f0]"
              />
              <button
                onClick={handleAddWatch}
                className="px-3 py-1.5 bg-[#3574f0] hover:bg-[#2b64d6] text-white rounded font-medium flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Watch</span>
              </button>
            </div>

            {/* List Watches */}
            <div className="space-y-1">
              {watches.length === 0 ? (
                <div className="text-gray-500 py-4 text-center">Belum ada ekspresi watch yang ditambahkan.</div>
              ) : (
                watches.map(w => (
                  <div key={w.id} className="flex items-center justify-between px-2.5 py-1 rounded bg-[#25272a] border border-[#2b2d30]">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-[#61afef] font-semibold">{w.expression}</span>
                      <span className="text-gray-500">=</span>
                      <span className="text-[#e5c07b] truncate">{w.value}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveWatch(w.id)}
                      className="p-1 hover:bg-[#35373c] text-gray-400 hover:text-red-400 rounded"
                      title="Hapus watch"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: BREAKPOINTS */}
        {activeTab === 'breakpoints' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-gray-400 text-[11px]">
              <span>Daftar Titik Henti Aktif ({breakpoints.length})</span>
              <span className="text-[10px] text-gray-500">Klik baris editor pada gutter untuk memasang breakpoint</span>
            </div>

            {breakpoints.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Circle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                <p>Tidak ada titik henti (breakpoint) yang dipasang.</p>
                <p className="text-[10px] mt-1">Klik nomor baris pada kolom gutter editor kode untuk memasang titik henti.</p>
              </div>
            ) : (
              <div className="space-y-1 font-mono text-[11px]">
                {breakpoints.map(bp => (
                  <div
                    key={bp.id}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded bg-[#25272a] border border-[#2b2d30] hover:border-[#3574f0]"
                  >
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onToggleBreakpoint(bp.id)}
                        className="text-gray-400 hover:text-white"
                        title={bp.enabled ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {bp.enabled ? (
                          <CheckSquare className="w-3.5 h-3.5 text-[#e06c75]" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-gray-500" />
                        )}
                      </button>
                      <Circle className={`w-3 h-3 ${bp.enabled ? 'text-[#e06c75] fill-[#e06c75]' : 'text-gray-500'}`} />
                      <button
                        onClick={() => onJumpToBreakpoint(bp.filePath, bp.line)}
                        className="text-white hover:text-[#3574f0] font-semibold text-left underline"
                      >
                        {bp.fileName}:{bp.line}
                      </button>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-gray-500">{bp.filePath}</span>
                      <button
                        onClick={() => onRemoveBreakpoint(bp.id)}
                        className="p-1 hover:bg-[#35373c] text-gray-400 hover:text-red-400 rounded"
                        title="Hapus breakpoint"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: DEBUG CONSOLE */}
        {activeTab === 'console' && (
          <div className="h-full flex flex-col font-mono text-[11px]">
            <div className="flex-1 overflow-y-auto space-y-1.5 pb-2">
              {consoleLogs.map(log => (
                <div key={log.id} className="leading-relaxed">
                  {log.type === 'info' && (
                    <div className="text-gray-400 italic flex items-center space-x-1.5">
                      <Info className="w-3 h-3 text-blue-400 shrink-0" />
                      <span>{log.text}</span>
                    </div>
                  )}
                  {log.type === 'input' && (
                    <div className="text-[#61afef] flex items-center space-x-1.5">
                      <span className="text-gray-500">&gt;</span>
                      <span className="font-semibold">{log.text}</span>
                    </div>
                  )}
                  {log.type === 'output' && (
                    <div className="text-[#98c379] whitespace-pre-wrap pl-3">
                      {log.text}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleConsoleSubmit} className="flex items-center space-x-2 border-t border-[#2b2d30] pt-2 shrink-0">
              <span className="text-gray-500">&gt;</span>
              <input
                type="text"
                value={consoleInput}
                onChange={(e) => setConsoleInput(e.target.value)}
                placeholder="Ketik ekspresi evaluasi (contoh: p count, threads, bt, clear)..."
                className="flex-1 bg-[#18191c] border border-[#2b2d30] rounded px-2.5 py-1 text-white placeholder-gray-500 focus:outline-none focus:border-[#3574f0]"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-[#3574f0] hover:bg-[#2b64d6] text-white rounded font-medium"
              >
                Kirim
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer Environment Note */}
      <div className="bg-[#18191c] border-t border-[#2b2d30] px-3 py-1 text-[10px] text-gray-500 flex items-center justify-between shrink-0">
        <span>
          JDWP Debug Session: {selectedDevice ? `Terkoneksi ke ${selectedDevice.name}` : 'Environment Container Mode (Simulasi debugger terpadu)'}
        </span>
        <span>Breakpoint: {breakpoints.length} terpasang</span>
      </div>
    </div>
  );
};
