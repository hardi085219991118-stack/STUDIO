import React, { useState } from 'react';
import { 
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, CornerDownLeft, 
  Save, Search, Copy, Scissors, Clipboard, Undo, Redo, 
  Check, ChevronUp, ChevronDown
} from 'lucide-react';

interface TouchKeyboardProps {
  onInsertText: (text: string) => void;
  onActionKey: (action: 'tab' | 'enter' | 'esc' | 'left' | 'right' | 'up' | 'down' | 'undo' | 'redo' | 'save' | 'find' | 'select_all' | 'copy' | 'paste' | 'cut') => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export const TouchKeyboard: React.FC<TouchKeyboardProps> = ({
  onInsertText,
  onActionKey,
  isVisible,
  onToggleVisibility,
}) => {
  const [ctrlActive, setCtrlActive] = useState(false);
  const [altActive, setAltActive] = useState(false);
  const [shiftActive, setShiftActive] = useState(false);
  const [quickSymbolsCategory, setQuickSymbolsCategory] = useState<'symbols' | 'code' | 'actions'>('symbols');

  const symbols = ['{', '}', '(', ')', '[', ']', '<', '>', '/', '\\', ';', ':', '"', "'", '=', '+', '-', '*', '_', '.', ',', '?', '!', '$', '@', '&', '|', '#', '`'];
  const codeSnippets = ['fun ', 'val ', 'var ', 'class ', 'override ', 'private ', 'import ', 'null', 'true', 'false', 'return ', '->', '?:', '!!', 'findViewById', 'setOnClickListener'];

  const handleModifierClick = (modifier: 'ctrl' | 'alt' | 'shift') => {
    if (modifier === 'ctrl') setCtrlActive(!ctrlActive);
    if (modifier === 'alt') setAltActive(!altActive);
    if (modifier === 'shift') setShiftActive(!shiftActive);
  };

  const handleKeyTap = (char: string) => {
    if (ctrlActive) {
      if (char.toLowerCase() === 's') { onActionKey('save'); setCtrlActive(false); return; }
      if (char.toLowerCase() === 'f') { onActionKey('find'); setCtrlActive(false); return; }
      if (char.toLowerCase() === 'z') { onActionKey('undo'); setCtrlActive(false); return; }
      if (char.toLowerCase() === 'y') { onActionKey('redo'); setCtrlActive(false); return; }
      if (char.toLowerCase() === 'a') { onActionKey('select_all'); setCtrlActive(false); return; }
      if (char.toLowerCase() === 'c') { onActionKey('copy'); setCtrlActive(false); return; }
      if (char.toLowerCase() === 'v') { onActionKey('paste'); setCtrlActive(false); return; }
      if (char.toLowerCase() === 'x') { onActionKey('cut'); setCtrlActive(false); return; }
    }
    onInsertText(char);
    if (shiftActive) setShiftActive(false);
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        title="Show Mobile Programmer Keyboard"
        className="fixed bottom-2 right-2 z-40 bg-[#3574f0] text-white p-2 rounded-full shadow-xl hover:bg-[#2b64d6] flex items-center gap-1 text-[11px] font-mono px-3"
      >
        <span>⌨</span>
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <div className="bg-[#18191c] border-t border-[#2b2d30] shadow-2xl p-1 select-none z-40 text-xs font-mono">
      {/* Top row: Category tabs & toggles */}
      <div className="flex items-center justify-between px-1 mb-1 text-[11px]">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setQuickSymbolsCategory('symbols')}
            className={`px-2 py-0.5 rounded transition-colors ${
              quickSymbolsCategory === 'symbols' ? 'bg-[#2b2d30] text-[#3ddc84] font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Symbols
          </button>
          <button
            onClick={() => setQuickSymbolsCategory('code')}
            className={`px-2 py-0.5 rounded transition-colors ${
              quickSymbolsCategory === 'code' ? 'bg-[#2b2d30] text-[#3ddc84] font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Code
          </button>
          <button
            onClick={() => setQuickSymbolsCategory('actions')}
            className={`px-2 py-0.5 rounded transition-colors ${
              quickSymbolsCategory === 'actions' ? 'bg-[#2b2d30] text-[#3ddc84] font-bold' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            Shortcuts
          </button>
        </div>

        <button
          onClick={onToggleVisibility}
          className="text-gray-400 hover:text-white p-0.5"
          title="Minimize Keyboard Bar"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 1: Scrollable fast keys */}
      <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5 mb-1">
        {quickSymbolsCategory === 'symbols' && (
          symbols.map((sym, idx) => (
            <button
              key={idx}
              onClick={() => handleKeyTap(sym)}
              className="min-w-[32px] h-7 px-2 flex items-center justify-center rounded bg-[#2b2d30] hover:bg-[#3574f0] text-gray-200 hover:text-white font-semibold active:scale-95 transition-all text-xs border border-[#393b40]/50"
            >
              {sym}
            </button>
          ))
        )}

        {quickSymbolsCategory === 'code' && (
          codeSnippets.map((snip, idx) => (
            <button
              key={idx}
              onClick={() => onInsertText(snip)}
              className="h-7 px-2.5 flex items-center justify-center rounded bg-[#2b2d30] hover:bg-[#3ddc84] hover:text-[#121316] text-[#3ddc84] font-medium active:scale-95 transition-all text-[11px] whitespace-nowrap border border-[#393b40]"
            >
              {snip}
            </button>
          ))
        )}

        {quickSymbolsCategory === 'actions' && (
          <div className="flex items-center space-x-1">
            <button onClick={() => onActionKey('save')} className="h-7 px-2.5 rounded bg-[#2b2d30] hover:bg-[#3ddc84] hover:text-[#121316] text-white flex items-center gap-1 text-[11px]">
              <Save className="w-3 h-3" /> Save (Ctrl+S)
            </button>
            <button onClick={() => onActionKey('find')} className="h-7 px-2.5 rounded bg-[#2b2d30] hover:bg-[#3574f0] hover:text-white text-white flex items-center gap-1 text-[11px]">
              <Search className="w-3 h-3" /> Find (Ctrl+F)
            </button>
            <button onClick={() => onActionKey('copy')} className="h-7 px-2.5 rounded bg-[#2b2d30] hover:bg-[#3574f0] hover:text-white text-white flex items-center gap-1 text-[11px]">
              <Copy className="w-3 h-3" /> Copy (Ctrl+C)
            </button>
            <button onClick={() => onActionKey('paste')} className="h-7 px-2.5 rounded bg-[#2b2d30] hover:bg-[#3574f0] hover:text-white text-white flex items-center gap-1 text-[11px]">
              <Clipboard className="w-3 h-3" /> Paste (Ctrl+V)
            </button>
            <button onClick={() => onActionKey('select_all')} className="h-7 px-2.5 rounded bg-[#2b2d30] hover:bg-[#3574f0] hover:text-white text-white text-[11px]">
              Select All (Ctrl+A)
            </button>
          </div>
        )}
      </div>

      {/* Row 2: Control keys & Navigation arrows */}
      <div className="flex items-center justify-between gap-1 overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => handleModifierClick('ctrl')}
            className={`h-7 px-2 rounded font-bold text-[11px] transition-colors ${
              ctrlActive ? 'bg-[#3574f0] text-white shadow' : 'bg-[#2b2d30] text-gray-300 hover:bg-[#35373c]'
            }`}
          >
            Ctrl
          </button>
          <button
            onClick={() => handleModifierClick('alt')}
            className={`h-7 px-2 rounded font-bold text-[11px] transition-colors ${
              altActive ? 'bg-[#ffc107] text-black shadow' : 'bg-[#2b2d30] text-gray-300 hover:bg-[#35373c]'
            }`}
          >
            Alt
          </button>
          <button
            onClick={() => handleModifierClick('shift')}
            className={`h-7 px-2 rounded font-bold text-[11px] transition-colors ${
              shiftActive ? 'bg-[#e76f51] text-white shadow' : 'bg-[#2b2d30] text-gray-300 hover:bg-[#35373c]'
            }`}
          >
            Shift
          </button>

          <button
            onClick={() => onActionKey('tab')}
            className="h-7 px-2.5 rounded bg-[#2b2d30] hover:bg-[#35373c] text-gray-200 text-[11px] font-semibold"
          >
            Tab
          </button>
          <button
            onClick={() => onActionKey('enter')}
            className="h-7 px-2.5 rounded bg-[#2b2d30] hover:bg-[#35373c] text-gray-200 flex items-center gap-1 text-[11px]"
          >
            <CornerDownLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => onActionKey('esc')}
            className="h-7 px-2 rounded bg-[#2b2d30] hover:bg-[#35373c] text-gray-200 text-[11px]"
          >
            Esc
          </button>
        </div>

        {/* Navigation arrow cluster */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => onActionKey('left')}
            className="w-7 h-7 flex items-center justify-center rounded bg-[#2b2d30] hover:bg-[#3574f0] text-gray-200 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onActionKey('up')}
            className="w-7 h-7 flex items-center justify-center rounded bg-[#2b2d30] hover:bg-[#3574f0] text-gray-200 hover:text-white"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onActionKey('down')}
            className="w-7 h-7 flex items-center justify-center rounded bg-[#2b2d30] hover:bg-[#3574f0] text-gray-200 hover:text-white"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onActionKey('right')}
            className="w-7 h-7 flex items-center justify-center rounded bg-[#2b2d30] hover:bg-[#3574f0] text-gray-200 hover:text-white"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
