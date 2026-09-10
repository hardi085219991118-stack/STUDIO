import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, CornerDownLeft, Trash2, Copy, Play } from 'lucide-react';

interface TerminalLine {
  id: string;
  type: 'cmd' | 'stdout' | 'stderr' | 'info';
  text: string;
}

interface TerminalPanelProps {
  projectName: string;
  onRunBuild?: () => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  projectName,
  onRunBuild,
}) => {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: '1', type: 'info', text: 'Android Studio Mobile Shell Environment' },
    { id: '2', type: 'info', text: `Project: ${projectName} (Native backend shell)` },
    { id: '3', type: 'info', text: 'Type `help`, `ls`, `pwd`, `git status`, or `./gradlew tasks`' },
  ]);
  const [inputCmd, setInputCmd] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const handleExecute = async (cmdToRun?: string) => {
    const command = (cmdToRun !== undefined ? cmdToRun : inputCmd).trim();
    if (!command) return;

    // Add to history
    setHistory(prev => [...prev, command]);
    setHistoryIndex(-1);

    const cmdId = Math.random().toString(36).substring(2);
    setLines(prev => [...prev, { id: cmdId, type: 'cmd', text: `$ ${command}` }]);
    setInputCmd('');

    // Handle internal commands
    if (command === 'clear') {
      setLines([]);
      return;
    }

    if (command === 'help') {
      setLines(prev => [
        ...prev,
        { id: Math.random().toString(), type: 'info', text: 'Available commands:' },
        { id: Math.random().toString(), type: 'stdout', text: '  ./gradlew assembleDebug  - Compiles project into debug APK' },
        { id: Math.random().toString(), type: 'stdout', text: '  ./gradlew clean          - Cleans project build directory' },
        { id: Math.random().toString(), type: 'stdout', text: '  ./gradlew tasks          - Displays all available Gradle tasks' },
        { id: Math.random().toString(), type: 'stdout', text: '  ls, pwd, cat, uname, git - Linux / project workspace commands' },
        { id: Math.random().toString(), type: 'stdout', text: '  clear                    - Clears terminal output' },
      ]);
      return;
    }

    // Call real backend execution
    setIsLoading(true);
    try {
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, projectName }),
      });
      const data = await res.json();

      if (data.stdout) {
        setLines(prev => [...prev, { id: Math.random().toString(), type: 'stdout', text: data.stdout.trim() }]);
      }
      if (data.stderr) {
        setLines(prev => [...prev, { id: Math.random().toString(), type: 'stderr', text: data.stderr.trim() }]);
      }
      if (data.exitCode !== undefined && data.exitCode !== 0) {
        setLines(prev => [...prev, { id: Math.random().toString(), type: 'stderr', text: `Process exited with code ${data.exitCode}` }]);
      } else if (!data.stdout && !data.stderr) {
        setLines(prev => [...prev, { id: Math.random().toString(), type: 'info', text: `Command completed (exit code 0)` }]);
      }
    } catch (err: any) {
      setLines(prev => [...prev, { id: Math.random().toString(), type: 'stderr', text: `Execution failed: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleExecute();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setInputCmd(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex !== -1) {
        const nextIdx = historyIndex + 1;
        if (nextIdx >= history.length) {
          setHistoryIndex(-1);
          setInputCmd('');
        } else {
          setHistoryIndex(nextIdx);
          setInputCmd(history[nextIdx]);
        }
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121316] text-[#bcbec4] text-xs font-mono select-text overflow-hidden">
      {/* Header */}
      <div className="bg-[#18191c] border-b border-[#2b2d30] px-3 py-1.5 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2">
          <TerminalIcon className="w-3.5 h-3.5 text-[#3ddc84]" />
          <span className="font-semibold text-white">Local Terminal</span>
          <span className="text-[10px] text-gray-400 font-normal">bash / zsh</span>
        </div>

        {/* Quick action chips */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => handleExecute('./gradlew assembleDebug')}
            className="px-2 py-0.5 rounded bg-[#2b2d30] hover:bg-[#3574f0] text-gray-300 hover:text-white text-[10px]"
          >
            assembleDebug
          </button>
          <button
            onClick={() => handleExecute('ls -la')}
            className="px-2 py-0.5 rounded bg-[#2b2d30] hover:bg-[#3574f0] text-gray-300 hover:text-white text-[10px]"
          >
            ls
          </button>
          <button
            onClick={() => setLines([])}
            title="Clear output"
            className="p-1 hover:bg-[#2b2d30] rounded text-gray-400 hover:text-white"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Terminal Output Log */}
      <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-1 text-[11px] leading-relaxed">
        {lines.map(line => (
          <div
            key={line.id}
            className={`whitespace-pre-wrap break-all ${
              line.type === 'cmd'
                ? 'text-[#3ddc84] font-semibold'
                : line.type === 'stderr'
                ? 'text-[#f25c54]'
                : line.type === 'info'
                ? 'text-[#3574f0]'
                : 'text-gray-300'
            }`}
          >
            {line.text}
          </div>
        ))}
        {isLoading && (
          <div className="text-gray-500 animate-pulse">Running command...</div>
        )}
      </div>

      {/* Input Line */}
      <div className="bg-[#18191c] border-t border-[#2b2d30] px-3 py-2 flex items-center space-x-2">
        <span className="text-[#3ddc84] font-bold select-none">$</span>
        <input
          type="text"
          value={inputCmd}
          onChange={(e) => setInputCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type command (e.g. ./gradlew assembleDebug)..."
          className="flex-1 bg-transparent text-white focus:outline-none text-[11px]"
        />
        <button
          onClick={() => handleExecute()}
          disabled={isLoading || !inputCmd.trim()}
          className="p-1 rounded bg-[#3574f0] text-white disabled:opacity-30"
        >
          <CornerDownLeft className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
