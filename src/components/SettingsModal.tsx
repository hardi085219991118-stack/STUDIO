import React, { useState } from 'react';
import { Settings, Sliders, Moon, Sun, Monitor, HardDrive, Keyboard, X, Check } from 'lucide-react';
import { IdeSettings } from '../types';

interface SettingsModalProps {
  settings: IdeSettings;
  onSaveSettings: (newSettings: IdeSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSaveSettings,
  onClose,
}) => {
  const [current, setCurrent] = useState<IdeSettings>({ ...settings });
  const [activeCategory, setActiveCategory] = useState<'editor' | 'build' | 'touch' | 'appearance'>('editor');

  const handleSave = () => {
    onSaveSettings(current);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-[#1e1f22] border border-[#393b40] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] text-xs">
        {/* Header */}
        <div className="bg-[#18191c] border-b border-[#2b2d30] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="w-4 h-4 text-[#3574f0]" />
            <h2 className="font-bold text-white text-sm">IDE Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#2b2d30] text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Categories navigation & settings fields */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <div className="w-44 bg-[#18191c] border-r border-[#2b2d30] p-2 space-y-1 font-mono text-[11px] shrink-0">
            <button
              onClick={() => setActiveCategory('editor')}
              className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                activeCategory === 'editor' ? 'bg-[#3574f0] text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Code Editor
            </button>
            <button
              onClick={() => setActiveCategory('appearance')}
              className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                activeCategory === 'appearance' ? 'bg-[#3574f0] text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Appearance & Theme
            </button>
            <button
              onClick={() => setActiveCategory('build')}
              className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                activeCategory === 'build' ? 'bg-[#3574f0] text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Build, Execution, SDK
            </button>
            <button
              onClick={() => setActiveCategory('touch')}
              className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
                activeCategory === 'touch' ? 'bg-[#3574f0] text-white font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Touch Keyboard
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {activeCategory === 'editor' && (
              <div className="space-y-3 font-mono">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Editor Font Size (px)</label>
                  <input
                    type="number"
                    min={10}
                    max={24}
                    value={current.fontSize}
                    onChange={(e) => setCurrent({ ...current, fontSize: Number(e.target.value) })}
                    className="w-full bg-[#121316] border border-[#393b40] rounded px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Tab Size</label>
                  <select
                    value={current.tabSize}
                    onChange={(e) => setCurrent({ ...current, tabSize: Number(e.target.value) })}
                    className="w-full bg-[#121316] border border-[#393b40] rounded px-3 py-1.5 text-white"
                  >
                    <option value={2}>2 spaces</option>
                    <option value={4}>4 spaces (Standard Android)</option>
                  </select>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={current.lineNumbers}
                      onChange={(e) => setCurrent({ ...current, lineNumbers: e.target.checked })}
                      className="rounded bg-[#121316] border-[#393b40] text-[#3574f0]"
                    />
                    <span className="text-gray-200">Show Line Numbers</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={current.wordWrap}
                      onChange={(e) => setCurrent({ ...current, wordWrap: e.target.checked })}
                      className="rounded bg-[#121316] border-[#393b40] text-[#3574f0]"
                    />
                    <span className="text-gray-200">Soft Wrap Long Lines</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={current.autoComplete}
                      onChange={(e) => setCurrent({ ...current, autoComplete: e.target.checked })}
                      className="rounded bg-[#121316] border-[#393b40] text-[#3574f0]"
                    />
                    <span className="text-gray-200">Enable Code Completion Suggestions</span>
                  </label>
                </div>
              </div>
            )}

            {activeCategory === 'appearance' && (
              <div className="space-y-3">
                <label className="text-[11px] text-gray-400 block mb-1">IDE Color Scheme</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'darcula', name: 'Darcula (Android Studio Dark)', bg: '#1e1f22' },
                    { id: 'dark', name: 'Deep Black (AMOLED)', bg: '#000000' },
                    { id: 'light', name: 'IntelliJ Light', bg: '#f8f9fa' },
                    { id: 'high_contrast', name: 'High Contrast', bg: '#0b0c10' },
                  ].map(thm => (
                    <div
                      key={thm.id}
                      onClick={() => setCurrent({ ...current, theme: thm.id as any })}
                      className={`p-3 rounded-lg border cursor-pointer ${
                        current.theme === thm.id
                          ? 'border-[#3574f0] bg-[#3574f0]/10'
                          : 'border-[#393b40] bg-[#2b2d30]'
                      }`}
                    >
                      <div className="font-bold text-white text-xs">{thm.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeCategory === 'build' && (
              <div className="space-y-3 font-mono">
                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Android SDK Root Path</label>
                  <input
                    type="text"
                    value={current.sdkPath}
                    onChange={(e) => setCurrent({ ...current, sdkPath: e.target.value })}
                    className="w-full bg-[#121316] border border-[#393b40] rounded px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">Gradle JVM Options</label>
                  <input
                    type="text"
                    value={current.jvmArgs}
                    onChange={(e) => setCurrent({ ...current, jvmArgs: e.target.value })}
                    className="w-full bg-[#121316] border border-[#393b40] rounded px-3 py-1.5 text-white"
                  />
                </div>
              </div>
            )}

            {activeCategory === 'touch' && (
              <div className="space-y-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={current.touchKeyboardEnabled}
                    onChange={(e) => setCurrent({ ...current, touchKeyboardEnabled: e.target.checked })}
                    className="rounded bg-[#121316] border-[#393b40] text-[#3574f0]"
                  />
                  <span className="text-gray-200">Show Mobile Programmer Touch Keyboard Bar</span>
                </label>
                <p className="text-[11px] text-gray-400">
                  Adds handy syntax symbols {"{ } ( ) [ ] < > ; : = + - *"} and navigation cursor arrows above soft keyboard.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#18191c] border-t border-[#2b2d30] px-4 py-2.5 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-[#2b2d30] text-gray-300 hover:bg-[#35373c]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white font-bold"
          >
            Apply & Save
          </button>
        </div>
      </div>
    </div>
  );
};
