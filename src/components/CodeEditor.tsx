import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, Pin, Search, Replace, Split, Check, 
  ChevronUp, ChevronDown, Save, FileCode, AlertCircle
} from 'lucide-react';
import { EditorTab, SplitMode } from '../types';

interface CodeEditorProps {
  tabs: EditorTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCloseOthers: (tabId: string) => void;
  onCloseAll?: () => void;
  onPinTab: (tabId: string) => void;
  onContentChange: (tabId: string, content: string) => void;
  onSaveTab?: (tabId: string) => void;
  onSaveAll?: () => void;
  splitMode: SplitMode;
  onToggleSplit: (mode: SplitMode) => void;
  fontSize?: number;
  wordWrap?: boolean;
  touchInsertAction?: { text: string; id: number } | null;
  touchKeyAction?: { action: string; id: number } | null;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onCloseOthers,
  onCloseAll,
  onPinTab,
  onContentChange,
  onSaveTab,
  onSaveAll,
  splitMode,
  onToggleSplit,
  fontSize = 13,
  wordWrap = false,
  touchInsertAction,
  touchKeyAction,
}) => {
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0] || null;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Undo / Redo history stacks per tab
  const historyRef = useRef<Record<string, { undo: string[]; redo: string[] }>>({});

  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [selectionLength, setSelectionLength] = useState(0);

  // Find & Replace state
  const [showSearch, setShowSearch] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [matches, setMatches] = useState<number[]>([]);

  // Modals
  const [gotoLineModal, setGotoLineModal] = useState(false);
  const [targetLineInput, setTargetLineInput] = useState('');
  const [gotoLineError, setGotoLineError] = useState('');

  const [unsavedDialogTab, setUnsavedDialogTab] = useState<EditorTab | null>(null);
  const [replaceConfirmCount, setReplaceConfirmCount] = useState<number | null>(null);

  // Initialize history for tab
  useEffect(() => {
    if (activeTab && !historyRef.current[activeTab.id]) {
      historyRef.current[activeTab.id] = {
        undo: [activeTab.content],
        redo: [],
      };
    }
  }, [activeTab?.id]);

  // Update cursor position and selection info
  const updateCursorPosition = useCallback(() => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const pos = el.selectionStart;
    const end = el.selectionEnd;
    const textBefore = el.value.substring(0, pos);
    const lines = textBefore.split('\n');
    const line = lines.length;
    const col = lines[lines.length - 1].length + 1;
    setCursorPos({ line, col });
    setSelectionLength(end - pos);
  }, []);

  // Synchronize line numbers scroll with textarea
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Text changes with undo push
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeTab) return;
    const newContent = e.target.value;

    const hist = historyRef.current[activeTab.id] || { undo: [], redo: [] };
    if (hist.undo.length === 0 || hist.undo[hist.undo.length - 1] !== activeTab.content) {
      hist.undo.push(activeTab.content);
      if (hist.undo.length > 50) hist.undo.shift();
      hist.redo = [];
      historyRef.current[activeTab.id] = hist;
    }

    onContentChange(activeTab.id, newContent);
    updateCursorPosition();
  };

  const handleUndo = useCallback(() => {
    if (!activeTab) return;
    const hist = historyRef.current[activeTab.id];
    if (hist && hist.undo.length > 0) {
      const prev = hist.undo.pop()!;
      hist.redo.push(activeTab.content);
      onContentChange(activeTab.id, prev);
    }
  }, [activeTab, onContentChange]);

  const handleRedo = useCallback(() => {
    if (!activeTab) return;
    const hist = historyRef.current[activeTab.id];
    if (hist && hist.redo.length > 0) {
      const next = hist.redo.pop()!;
      hist.undo.push(activeTab.content);
      onContentChange(activeTab.id, next);
    }
  }, [activeTab, onContentChange]);

  // Sync touch keyboard text insert
  useEffect(() => {
    if (!touchInsertAction || !textareaRef.current || !activeTab) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const val = el.value;
    const newText = val.substring(0, start) + touchInsertAction.text + val.substring(end);
    onContentChange(activeTab.id, newText);
    setTimeout(() => {
      el.focus();
      const newPos = start + touchInsertAction.text.length;
      el.setSelectionRange(newPos, newPos);
      updateCursorPosition();
    }, 10);
  }, [touchInsertAction]);

  // Sync touch keyboard actions (tab, enter, shortcuts, etc.)
  useEffect(() => {
    if (!touchKeyAction || !textareaRef.current || !activeTab) return;
    const el = textareaRef.current;
    const { action } = touchKeyAction;

    if (action === 'tab') {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      const newText = val.substring(0, start) + '    ' + val.substring(end);
      onContentChange(activeTab.id, newText);
      setTimeout(() => {
        el.setSelectionRange(start + 4, start + 4);
        updateCursorPosition();
      }, 10);
    } else if (action === 'enter') {
      const start = el.selectionStart;
      const val = el.value;
      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.substring(lineStart, start);
      const indentMatch = currentLine.match(/^\s*/);
      let indent = indentMatch ? indentMatch[0] : '';
      if (currentLine.trim().endsWith('{') || currentLine.trim().endsWith('(')) {
        indent += '    ';
      }
      const newText = val.substring(0, start) + '\n' + indent + val.substring(start);
      onContentChange(activeTab.id, newText);
      setTimeout(() => {
        const nextPos = start + 1 + indent.length;
        el.setSelectionRange(nextPos, nextPos);
        updateCursorPosition();
      }, 10);
    } else if (action === 'undo') {
      handleUndo();
    } else if (action === 'redo') {
      handleRedo();
    } else if (action === 'save') {
      if (onSaveTab) onSaveTab(activeTab.id);
    } else if (action === 'find') {
      setShowSearch(true);
      setIsReplaceMode(false);
    } else if (action === 'replace') {
      setShowSearch(true);
      setIsReplaceMode(true);
    } else if (action === 'goto') {
      setGotoLineModal(true);
    } else if (action === 'select_all') {
      el.focus();
      el.setSelectionRange(0, el.value.length);
      updateCursorPosition();
    } else if (action === 'arrow_left') {
      const pos = Math.max(0, el.selectionStart - 1);
      el.setSelectionRange(pos, pos);
      updateCursorPosition();
    } else if (action === 'arrow_right') {
      const pos = Math.min(el.value.length, el.selectionStart + 1);
      el.setSelectionRange(pos, pos);
      updateCursorPosition();
    } else if (action === 'arrow_up') {
      const pos = el.selectionStart;
      const lineStart = el.value.lastIndexOf('\n', pos - 1) + 1;
      const col = pos - lineStart;
      const prevLineEnd = lineStart - 1;
      if (prevLineEnd >= 0) {
        const prevLineStart = el.value.lastIndexOf('\n', prevLineEnd - 1) + 1;
        const prevLineLen = prevLineEnd - prevLineStart;
        const targetPos = prevLineStart + Math.min(col, prevLineLen);
        el.setSelectionRange(targetPos, targetPos);
        updateCursorPosition();
      }
    } else if (action === 'arrow_down') {
      const pos = el.selectionStart;
      const lineStart = el.value.lastIndexOf('\n', pos - 1) + 1;
      const col = pos - lineStart;
      const nextLineStart = el.value.indexOf('\n', pos);
      if (nextLineStart !== -1) {
        const afterNext = nextLineStart + 1;
        const nextLineEnd = el.value.indexOf('\n', afterNext);
        const nextLineLen = (nextLineEnd !== -1 ? nextLineEnd : el.value.length) - afterNext;
        const targetPos = afterNext + Math.min(col, nextLineLen);
        el.setSelectionRange(targetPos, targetPos);
        updateCursorPosition();
      }
    }
  }, [touchKeyAction, activeTab, onContentChange, handleUndo, handleRedo, onSaveTab, updateCursorPosition]);

  // Keyboard shortcut handlers (Ctrl+S, Ctrl+F, Ctrl+H, Ctrl+G, Ctrl+Z)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (e.shiftKey && onSaveAll) {
        onSaveAll();
      } else if (activeTab && onSaveTab) {
        onSaveTab(activeTab.id);
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      setShowSearch(true);
      setIsReplaceMode(false);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      setShowSearch(true);
      setIsReplaceMode(true);
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      setGotoLineModal(true);
      setTargetLineInput('');
      setGotoLineError('');
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      handleRedo();
      return;
    }

    // Auto-indent on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const val = el.value;

      const lineStart = val.lastIndexOf('\n', start - 1) + 1;
      const currentLine = val.substring(lineStart, start);
      const indentMatch = currentLine.match(/^\s*/);
      let indent = indentMatch ? indentMatch[0] : '';
      if (currentLine.trim().endsWith('{') || currentLine.trim().endsWith('(')) {
        indent += '    ';
      }

      const newText = val.substring(0, start) + '\n' + indent + val.substring(start);
      if (activeTab) onContentChange(activeTab.id, newText);
      setTimeout(() => {
        el.setSelectionRange(start + 1 + indent.length, start + 1 + indent.length);
        updateCursorPosition();
      }, 0);
      return;
    }

    // Tab key inserts 4 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      const newText = val.substring(0, start) + '    ' + val.substring(end);
      if (activeTab) onContentChange(activeTab.id, newText);
      setTimeout(() => {
        el.setSelectionRange(start + 4, start + 4);
        updateCursorPosition();
      }, 0);
      return;
    }

    // Auto-closing pairs
    const pairs: Record<string, string> = {
      '{': '}',
      '(': ')',
      '[': ']',
      '"': '"',
      "'": "'",
    };

    if (pairs[e.key]) {
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      const closing = pairs[e.key];
      const newText = val.substring(0, start) + e.key + closing + val.substring(end);
      e.preventDefault();
      if (activeTab) onContentChange(activeTab.id, newText);
      setTimeout(() => {
        el.setSelectionRange(start + 1, start + 1);
        updateCursorPosition();
      }, 0);
      return;
    }
  };

  // Find occurrences in content
  useEffect(() => {
    if (!showSearch || !searchQuery || !activeTab) {
      setMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const content = activeTab.content;
    const query = matchCase ? searchQuery : searchQuery.toLowerCase();
    const target = matchCase ? content : content.toLowerCase();

    const results: number[] = [];
    let idx = 0;

    while (idx < target.length) {
      const found = target.indexOf(query, idx);
      if (found === -1) break;

      if (wholeWord) {
        const isStartBound = found === 0 || !/\w/.test(content[found - 1]);
        const isEndBound = found + query.length >= content.length || !/\w/.test(content[found + query.length]);
        if (isStartBound && isEndBound) {
          results.push(found);
        }
      } else {
        results.push(found);
      }
      idx = found + Math.max(1, query.length);
    }

    setMatches(results);
    setCurrentMatchIndex(results.length > 0 ? 0 : -1);

    if (results.length > 0 && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(results[0], results[0] + searchQuery.length);
      updateCursorPosition();
    }
  }, [searchQuery, showSearch, matchCase, wholeWord, activeTab?.content, updateCursorPosition]);

  // Next / Previous match
  const handleNextMatch = () => {
    if (matches.length === 0 || !textareaRef.current) return;
    const nextIdx = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIdx);
    const pos = matches[nextIdx];
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(pos, pos + searchQuery.length);
    updateCursorPosition();
  };

  const handlePrevMatch = () => {
    if (matches.length === 0 || !textareaRef.current) return;
    const prevIdx = (currentMatchIndex - 1 + matches.length) % matches.length;
    setCurrentMatchIndex(prevIdx);
    const pos = matches[prevIdx];
    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(pos, pos + searchQuery.length);
    updateCursorPosition();
  };

  // Replace single occurrence
  const handleReplaceSingle = () => {
    if (!activeTab || matches.length === 0 || currentMatchIndex === -1 || !textareaRef.current) return;
    const pos = matches[currentMatchIndex];
    const val = activeTab.content;
    const newText = val.substring(0, pos) + replaceQuery + val.substring(pos + searchQuery.length);
    onContentChange(activeTab.id, newText);
  };

  // Replace All
  const handleTriggerReplaceAll = () => {
    if (matches.length === 0) return;
    if (matches.length > 1) {
      setReplaceConfirmCount(matches.length);
    } else {
      executeReplaceAll();
    }
  };

  const executeReplaceAll = () => {
    if (!activeTab || !searchQuery) return;
    const val = activeTab.content;
    const regex = new RegExp(
      wholeWord ? `\\b${searchQuery}\\b` : searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      matchCase ? 'g' : 'gi'
    );
    const newText = val.replace(regex, replaceQuery);
    onContentChange(activeTab.id, newText);
    setReplaceConfirmCount(null);
  };

  // Go to Line logic
  const handleGotoLine = () => {
    if (!activeTab || !textareaRef.current) return;
    const lineNum = parseInt(targetLineInput, 10);
    const lines = activeTab.content.split('\n');
    if (isNaN(lineNum) || lineNum < 1 || lineNum > lines.length) {
      setGotoLineError(`Masukkan nomor baris yang valid antara 1 dan ${lines.length}`);
      return;
    }

    let charPos = 0;
    for (let i = 0; i < lineNum - 1; i++) {
      charPos += lines[i].length + 1;
    }

    textareaRef.current.focus();
    textareaRef.current.setSelectionRange(charPos, charPos);
    updateCursorPosition();
    setGotoLineModal(false);
  };

  // Close tab request with Unsaved Changes check
  const requestCloseTab = (tab: EditorTab) => {
    if (tab.isModified) {
      setUnsavedDialogTab(tab);
    } else {
      onCloseTab(tab.id);
    }
  };

  const lines = activeTab ? activeTab.content.split('\n') : [];

  if (!activeTab) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#1e1f22] text-[#868a98] select-none p-6 text-center">
        <FileCode className="w-12 h-12 text-[#35373c] mb-3" />
        <p className="text-sm text-[#bcbec4] font-medium">Tidak ada berkas terbuka di editor</p>
        <p className="text-xs text-[#6c707e] mt-1 max-w-sm">
          Pilih berkas dari Penjelajah Proyek atau tekan Ctrl+O untuk membuka berkas sumber.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1f22] select-none overflow-hidden relative">
      {/* Tab Bar */}
      <header aria-label="Editor Tab Bar" className="flex items-center bg-[#18191c] border-b border-[#2b2d30] overflow-x-auto no-scrollbar select-none shrink-0">
        <div className="flex items-center">
          {tabs.map(tab => {
            const isActive = tab.id === activeTab.id;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-2 border-r border-[#2b2d30] text-xs cursor-pointer border-t-2 transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[#1e1f22] text-white border-t-[#3574f0] font-medium shadow-sm'
                    : 'bg-[#18191c] text-[#868a98] hover:bg-[#1e1f22] border-t-transparent hover:text-[#bcbec4]'
                }`}
                title={tab.filePath}
              >
                {tab.isPinned && <Pin className="w-2.5 h-2.5 text-[#3574f0] shrink-0" />}
                <span className="truncate max-w-[140px] font-mono text-[11px]">
                  {tab.fileName}
                  {tab.isModified && ' *'}
                </span>
                {tab.isModified && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f4a261] shrink-0" title="Perubahan belum disimpan" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    requestCloseTab(tab);
                  }}
                  className="p-0.5 hover:bg-[#2b2d30] rounded text-gray-400 hover:text-white shrink-0 ml-1"
                  title="Tutup tab"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Tab Actions */}
        <div className="ml-auto flex items-center pr-2 space-x-1 shrink-0">
          {activeTab.isModified && onSaveTab && (
            <button
              onClick={() => onSaveTab(activeTab.id)}
              title="Simpan Berkas (Ctrl+S)"
              className="flex items-center gap-1 px-2 py-0.5 bg-[#2b2d30] hover:bg-[#3574f0] text-white rounded text-[10px] font-medium transition-colors"
            >
              <Save className="w-3 h-3" />
              <span>Simpan</span>
            </button>
          )}

          <button
            onClick={() => onPinTab(activeTab.id)}
            title={activeTab.isPinned ? 'Lepas Pin Tab' : 'Sematkan Tab (Pin)'}
            className={`p-1 rounded text-xs hover:bg-[#2b2d30] ${activeTab.isPinned ? 'text-[#3574f0]' : 'text-gray-400'}`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onToggleSplit(splitMode === 'vertical' ? 'none' : 'vertical')}
            title="Bagi Editor Secara Vertikal"
            className={`p-1 rounded text-xs hover:bg-[#2b2d30] ${splitMode === 'vertical' ? 'text-[#3574f0]' : 'text-gray-400'}`}
          >
            <Split className="w-3.5 h-3.5" />
          </button>

          {tabs.length > 1 && (
            <button
              onClick={() => onCloseOthers(activeTab.id)}
              title="Tutup Tab Lainnya"
              className="px-1.5 py-0.5 text-[10px] text-gray-400 hover:text-white hover:bg-[#2b2d30] rounded"
            >
              Tutup Lainnya
            </button>
          )}
        </div>
      </header>

      {/* Find / Replace Bar */}
      {showSearch && (
        <div className="bg-[#2b2d30] border-b border-[#393b40] p-1.5 flex flex-wrap items-center gap-2 text-xs select-none shadow-md shrink-0">
          <div className="flex items-center space-x-1 bg-[#1e1f22] px-2 py-0.5 rounded border border-[#393b40]">
            <Search className="w-3 h-3 text-gray-400 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white focus:outline-none w-28 sm:w-44 text-xs font-mono"
            />
            {matches.length > 0 && (
              <span className="text-[10px] text-gray-400 font-mono">
                {currentMatchIndex + 1}/{matches.length}
              </span>
            )}
          </div>

          {isReplaceMode && (
            <div className="flex items-center space-x-1 bg-[#1e1f22] px-2 py-0.5 rounded border border-[#393b40]">
              <Replace className="w-3 h-3 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Ganti dengan..."
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                className="bg-transparent text-white focus:outline-none w-28 sm:w-44 text-xs font-mono"
              />
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handlePrevMatch}
              disabled={matches.length === 0}
              title="Kecocokan Sebelumnya (Shift+F3)"
              className="p-1 hover:bg-[#393b40] rounded text-gray-300 disabled:opacity-40"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleNextMatch}
              disabled={matches.length === 0}
              title="Kecocokan Berikutnya (F3)"
              className="p-1 hover:bg-[#393b40] rounded text-gray-300 disabled:opacity-40"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setMatchCase(!matchCase)}
              title="Cocokkan Huruf Besar/Kecil"
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                matchCase ? 'bg-[#3574f0] text-white border-[#3574f0]' : 'border-[#4e5157] text-gray-400'
              }`}
            >
              Aa
            </button>

            <button
              onClick={() => setWholeWord(!wholeWord)}
              title="Cocokkan Seluruh Kata"
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                wholeWord ? 'bg-[#3574f0] text-white border-[#3574f0]' : 'border-[#4e5157] text-gray-400'
              }`}
            >
              \b
            </button>

            {isReplaceMode && (
              <>
                <button
                  onClick={handleReplaceSingle}
                  disabled={matches.length === 0}
                  className="px-2 py-0.5 rounded bg-[#35373c] hover:bg-[#43454b] text-white text-[11px] disabled:opacity-40"
                >
                  Ganti
                </button>
                <button
                  onClick={handleTriggerReplaceAll}
                  disabled={matches.length === 0}
                  className="px-2 py-0.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white text-[11px] disabled:opacity-40 font-medium"
                >
                  Ganti Semua
                </button>
              </>
            )}

            <button
              onClick={() => setIsReplaceMode(!isReplaceMode)}
              className="px-2 py-0.5 text-[10px] text-gray-400 hover:text-white rounded hover:bg-[#35373c]"
            >
              {isReplaceMode ? 'Sembunyikan Ganti' : 'Ganti'}
            </button>
          </div>

          <button
            onClick={() => setShowSearch(false)}
            className="p-1 hover:bg-[#393b40] rounded text-gray-400 hover:text-white ml-auto"
            title="Tutup (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor Main Canvas */}
      <div className={`flex-1 flex overflow-hidden ${splitMode === 'horizontal' ? 'flex-col' : 'flex-row'}`}>
        {/* Main Editor Pane */}
        <div className="flex-1 flex relative overflow-hidden bg-[#1e1f22]">
          {/* Line Numbers Column */}
          <div
            ref={lineNumbersRef}
            className="w-10 sm:w-12 bg-[#1e1f22] border-r border-[#2b2d30] py-2 text-right pr-2 text-[#4e5157] select-none font-mono text-[12px] leading-relaxed overflow-hidden shrink-0"
          >
            {lines.map((_, idx) => (
              <div
                key={idx}
                className={idx + 1 === cursorPos.line ? 'text-[#3574f0] font-bold bg-[#2b2d30]/30' : ''}
              >
                {idx + 1}
              </div>
            ))}
          </div>

          {/* Code Textarea */}
          <textarea
            ref={textareaRef}
            value={activeTab.content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onClick={updateCursorPosition}
            onKeyUp={updateCursorPosition}
            onScroll={handleScroll}
            spellCheck={false}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            style={{ fontSize: `${fontSize}px` }}
            className={`flex-1 h-full bg-[#1e1f22] text-[#bcbec4] p-2 font-mono leading-relaxed resize-none focus:outline-none border-none overflow-auto ${
              wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre'
            }`}
          />
        </div>

        {/* Secondary Split Pane */}
        {splitMode !== 'none' && (
          <div className="flex-1 border-l border-[#2b2d30] bg-[#1e1f22] flex flex-col">
            <div className="bg-[#18191c] px-3 py-1.5 text-xs text-gray-400 border-b border-[#2b2d30] font-mono flex items-center justify-between">
              <span>Panel Sekunder Terpisah: {activeTab.fileName}</span>
              <button onClick={() => onToggleSplit('none')} className="text-gray-400 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 p-3 font-mono text-xs text-[#bcbec4] overflow-auto whitespace-pre leading-relaxed">
              {activeTab.content}
            </div>
          </div>
        )}
      </div>

      {/* Editor Status Bar */}
      <footer aria-label="Editor Status" className="bg-[#18191c] border-t border-[#2b2d30] px-3 py-1 flex items-center justify-between text-[11px] text-[#6c707e] select-none font-mono shrink-0">
        <div className="flex items-center space-x-3">
          <span className="flex items-center gap-1">
            {activeTab.isModified ? (
              <span className="text-[#f4a261] flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#f4a261]" />
                Dimodifikasi (Belum disimpan)
              </span>
            ) : (
              <span className="text-[#3ddc84] flex items-center gap-1">
                <Check className="w-3 h-3 text-[#3ddc84]" />
                Tersimpan
              </span>
            )}
          </span>
          <span className="hidden sm:inline">UTF-8</span>
          <span className="capitalize">{activeTab.fileType}</span>
          {selectionLength > 0 && (
            <span className="text-gray-400">({selectionLength} dipilih)</span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setGotoLineModal(true);
              setTargetLineInput('');
              setGotoLineError('');
            }}
            className="hover:text-white transition-colors cursor-pointer"
            title="Lompat ke baris (Ctrl+G)"
          >
            Ln {cursorPos.line}, Kol {cursorPos.col}
          </button>
          <span className="hidden sm:inline">4 spasi</span>
        </div>
      </footer>

      {/* Go to Line Modal */}
      {gotoLineModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2b2d30] border border-[#393b40] rounded-lg shadow-2xl p-4 w-80 text-white">
            <h3 className="text-xs font-semibold mb-2">Lompat ke Baris</h3>
            <input
              type="number"
              autoFocus
              placeholder={`1 - ${lines.length}`}
              value={targetLineInput}
              onChange={(e) => {
                setTargetLineInput(e.target.value);
                setGotoLineError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGotoLine();
                if (e.key === 'Escape') setGotoLineModal(false);
              }}
              className="w-full bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-xs text-white mb-2 focus:outline-none focus:border-[#3574f0] font-mono"
            />
            {gotoLineError && (
              <p className="text-[11px] text-[#e76f51] mb-2">{gotoLineError}</p>
            )}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setGotoLineModal(false)}
                className="px-2.5 py-1 text-xs rounded bg-[#35373c] text-gray-300 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={handleGotoLine}
                className="px-2.5 py-1 text-xs rounded bg-[#3574f0] text-white font-medium hover:bg-[#2b64d6]"
              >
                Lompat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Dialog */}
      {unsavedDialogTab && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2b2d30] border border-[#393b40] rounded-lg shadow-2xl p-4 w-96 text-white">
            <div className="flex items-center gap-2 mb-2 text-[#f4a261]">
              <AlertCircle className="w-4 h-4" />
              <h3 className="text-xs font-semibold">PERUBAHAN BELUM DISIMPAN</h3>
            </div>
            <p className="text-xs text-gray-300 mb-4">
              Simpan perubahan pada <strong className="text-white">{unsavedDialogTab.fileName}</strong> sebelum menutup?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setUnsavedDialogTab(null)}
                className="px-2.5 py-1 text-xs rounded bg-[#35373c] text-gray-300 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const tabToClose = unsavedDialogTab;
                  setUnsavedDialogTab(null);
                  onCloseTab(tabToClose.id);
                }}
                className="px-2.5 py-1 text-xs rounded bg-[#494d54] text-white hover:bg-[#595d66]"
              >
                Jangan Simpan
              </button>
              <button
                onClick={() => {
                  const tabToSave = unsavedDialogTab;
                  if (onSaveTab) onSaveTab(tabToSave.id);
                  setUnsavedDialogTab(null);
                  onCloseTab(tabToSave.id);
                }}
                className="px-2.5 py-1 text-xs rounded bg-[#3574f0] text-white font-medium hover:bg-[#2b64d6]"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replace All Confirmation Dialog */}
      {replaceConfirmCount !== null && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2b2d30] border border-[#393b40] rounded-lg shadow-2xl p-4 w-80 text-white">
            <h3 className="text-xs font-semibold mb-2">Konfirmasi Ganti Semua</h3>
            <p className="text-xs text-gray-300 mb-4">
              Ganti {replaceConfirmCount} kemunculan &quot;{searchQuery}&quot; dengan &quot;{replaceQuery}&quot;?
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setReplaceConfirmCount(null)}
                className="px-2.5 py-1 text-xs rounded bg-[#35373c] text-gray-300 hover:text-white"
              >
                Batal
              </button>
              <button
                onClick={executeReplaceAll}
                className="px-2.5 py-1 text-xs rounded bg-[#3574f0] text-white font-medium hover:bg-[#2b64d6]"
              >
                Ganti Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
