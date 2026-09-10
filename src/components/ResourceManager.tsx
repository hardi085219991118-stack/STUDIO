import React, { useState, useMemo } from 'react';
import { 
  Palette, FileText, Image, Layers, Plus, Trash2, Edit2, 
  Check, Smartphone, Search, RefreshCw, Folder, FileCode,
  Tag, Sliders, Eye, Copy, X, ArrowRight, Code
} from 'lucide-react';
import { ProjectFile } from '../types';

interface ResourceManagerProps {
  files: ProjectFile[];
  onUpdateFile: (fileId: string, content: string) => void;
  onOpenLayoutInEditor?: (file: ProjectFile) => void;
  onClose: () => void;
}

type ResourceCategory = 'values' | 'layouts' | 'drawables' | 'mipmaps' | 'menus' | 'raw';

export const ResourceManager: React.FC<ResourceManagerProps> = ({
  files,
  onUpdateFile,
  onOpenLayoutInEditor,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory>('values');
  const [valuesSubTab, setValuesSubTab] = useState<'colors' | 'strings' | 'dimens' | 'themes'>('colors');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Add color form
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#3DDC84');

  // Add string form
  const [newStringName, setNewStringName] = useState('');
  const [newStringVal, setNewStringVal] = useState('');

  // Add dimen form
  const [newDimenName, setNewDimenName] = useState('');
  const [newDimenVal, setNewDimenVal] = useState('16dp');

  // Selected file for raw viewing
  const [inspectingFile, setInspectingFile] = useState<ProjectFile | null>(null);

  // Find all files under res/
  const resFiles = useMemo(() => {
    return files.filter(f => !f.isFolder && (f.path.includes('/res/') || f.path.startsWith('res/')));
  }, [files]);

  // Specific value files
  const stringsFile = useMemo(() => resFiles.find(f => f.path.endsWith('res/values/strings.xml')), [resFiles]);
  const colorsFile = useMemo(() => resFiles.find(f => f.path.endsWith('res/values/colors.xml')), [resFiles]);
  const dimensFile = useMemo(() => resFiles.find(f => f.path.endsWith('res/values/dimens.xml')), [resFiles]);
  const themesFile = useMemo(() => resFiles.find(f => f.path.includes('res/values/themes') || f.path.includes('res/values/styles')), [resFiles]);

  // Layout files
  const layoutFiles = useMemo(() => resFiles.filter(f => f.path.includes('/res/layout/')), [resFiles]);
  // Drawable files
  const drawableFiles = useMemo(() => resFiles.filter(f => f.path.includes('/res/drawable')), [resFiles]);
  // Mipmap files
  const mipmapFiles = useMemo(() => resFiles.filter(f => f.path.includes('/res/mipmap')), [resFiles]);
  // Menu files
  const menuFiles = useMemo(() => resFiles.filter(f => f.path.includes('/res/menu/')), [resFiles]);
  // Raw files
  const rawFiles = useMemo(() => resFiles.filter(f => f.path.includes('/res/raw/')), [resFiles]);

  // Copy helper
  const handleCopyRef = (refText: string) => {
    navigator.clipboard?.writeText(refText);
    setCopiedKey(refText);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Parse color XML entries
  const parsedColors = useMemo(() => {
    if (!colorsFile) return [];
    const colors: { name: string; hex: string }[] = [];
    const regex = /<color name="([^"]+)">([^<]+)<\/color>/g;
    let match;
    while ((match = regex.exec(colorsFile.content)) !== null) {
      colors.push({ name: match[1], hex: match[2].trim() });
    }
    return colors;
  }, [colorsFile]);

  // Parse string XML entries
  const parsedStrings = useMemo(() => {
    if (!stringsFile) return [];
    const strings: { name: string; value: string }[] = [];
    const regex = /<string name="([^"]+)">([^<]+)<\/string>/g;
    let match;
    while ((match = regex.exec(stringsFile.content)) !== null) {
      strings.push({ name: match[1], value: match[2] });
    }
    return strings;
  }, [stringsFile]);

  // Parse dimen XML entries
  const parsedDimens = useMemo(() => {
    if (!dimensFile) return [];
    const dimens: { name: string; value: string }[] = [];
    const regex = /<dimen name="([^"]+)">([^<]+)<\/dimen>/g;
    let match;
    while ((match = regex.exec(dimensFile.content)) !== null) {
      dimens.push({ name: match[1], value: match[2].trim() });
    }
    return dimens;
  }, [dimensFile]);

  // Add new Color
  const handleAddColor = () => {
    if (!colorsFile || !newColorName.trim()) return;
    const tag = `    <color name="${newColorName.trim()}">${newColorHex.trim()}</color>\n`;
    const insertPos = colorsFile.content.lastIndexOf('</resources>');
    if (insertPos !== -1) {
      const updated = colorsFile.content.slice(0, insertPos) + tag + colorsFile.content.slice(insertPos);
      onUpdateFile(colorsFile.id, updated);
      setNewColorName('');
    }
  };

  // Delete Color
  const handleDeleteColor = (name: string) => {
    if (!colorsFile) return;
    const regex = new RegExp(`\\s*<color name="${name}">[^<]+<\\/color>`, 'g');
    const updated = colorsFile.content.replace(regex, '');
    onUpdateFile(colorsFile.id, updated);
  };

  // Add new String
  const handleAddString = () => {
    if (!stringsFile || !newStringName.trim()) return;
    const tag = `    <string name="${newStringName.trim()}">${newStringVal.trim()}</string>\n`;
    const insertPos = stringsFile.content.lastIndexOf('</resources>');
    if (insertPos !== -1) {
      const updated = stringsFile.content.slice(0, insertPos) + tag + stringsFile.content.slice(insertPos);
      onUpdateFile(stringsFile.id, updated);
      setNewStringName('');
      setNewStringVal('');
    }
  };

  // Delete String
  const handleDeleteString = (name: string) => {
    if (!stringsFile) return;
    const regex = new RegExp(`\\s*<string name="${name}">[^<]+<\\/string>`, 'g');
    const updated = stringsFile.content.replace(regex, '');
    onUpdateFile(stringsFile.id, updated);
  };

  // Add new Dimen
  const handleAddDimen = () => {
    if (!dimensFile || !newDimenName.trim()) return;
    const tag = `    <dimen name="${newDimenName.trim()}">${newDimenVal.trim()}</dimen>\n`;
    const insertPos = dimensFile.content.lastIndexOf('</resources>');
    if (insertPos !== -1) {
      const updated = dimensFile.content.slice(0, insertPos) + tag + dimensFile.content.slice(insertPos);
      onUpdateFile(dimensFile.id, updated);
      setNewDimenName('');
      setNewDimenVal('16dp');
    }
  };

  // Delete Dimen
  const handleDeleteDimen = (name: string) => {
    if (!dimensFile) return;
    const regex = new RegExp(`\\s*<dimen name="${name}">[^<]+<\\/dimen>`, 'g');
    const updated = dimensFile.content.replace(regex, '');
    onUpdateFile(dimensFile.id, updated);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1f22] text-[#bcbec4] text-xs select-none overflow-hidden">
      {/* Top Header */}
      <div className="bg-[#18191c] border-b border-[#2b2d30] px-3 py-1.5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Palette className="w-3.5 h-3.5 text-[#3574f0]" />
          <span className="font-semibold text-white">Resource Manager</span>
          <span className="text-[10px] bg-[#3574f0]/15 text-[#3574f0] font-mono px-1.5 py-0.5 rounded border border-[#3574f0]/30 font-semibold">
            res/ ({resFiles.length} berkas)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {copiedKey && (
            <span className="text-[10px] text-[#3ddc84] font-mono flex items-center gap-1">
              <Check className="w-3 h-3" />
              <span>Disalin: {copiedKey}</span>
            </span>
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-[#2b2d30] text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Categories & Search Bar */}
      <div className="bg-[#2b2d30] border-b border-[#393b40] px-3 py-1.5 flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => { setSelectedCategory('values'); setInspectingFile(null); }}
            className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'values' ? 'bg-[#3574f0] text-white font-semibold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>Values</span>
          </button>

          <button
            onClick={() => { setSelectedCategory('layouts'); setInspectingFile(null); }}
            className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'layouts' ? 'bg-[#3574f0] text-white font-semibold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Layout ({layoutFiles.length})</span>
          </button>

          <button
            onClick={() => { setSelectedCategory('drawables'); setInspectingFile(null); }}
            className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'drawables' ? 'bg-[#3574f0] text-white font-semibold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Image className="w-3 h-3" />
            <span>Drawable ({drawableFiles.length})</span>
          </button>

          <button
            onClick={() => { setSelectedCategory('mipmaps'); setInspectingFile(null); }}
            className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'mipmaps' ? 'bg-[#3574f0] text-white font-semibold' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3 h-3" />
            <span>Mipmap ({mipmapFiles.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="flex items-center bg-[#1e1f22] border border-[#393b40] rounded px-2 py-0.5 w-48">
          <Search className="w-3.5 h-3.5 text-gray-400 mr-1.5 shrink-0" />
          <input
            type="text"
            placeholder="Filter resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-white font-mono text-[11px] focus:outline-none"
          />
        </div>
      </div>

      {/* Values Subtabs (if Values selected) */}
      {selectedCategory === 'values' && (
        <div className="bg-[#1e1f22] border-b border-[#2b2d30] px-3 py-1 flex items-center space-x-2 shrink-0">
          <button
            onClick={() => { setValuesSubTab('colors'); setInspectingFile(null); }}
            className={`px-2.5 py-0.5 rounded text-[11px] font-mono ${
              valuesSubTab === 'colors' ? 'bg-[#3574f0] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            colors.xml ({parsedColors.length})
          </button>
          <button
            onClick={() => { setValuesSubTab('strings'); setInspectingFile(null); }}
            className={`px-2.5 py-0.5 rounded text-[11px] font-mono ${
              valuesSubTab === 'strings' ? 'bg-[#3574f0] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            strings.xml ({parsedStrings.length})
          </button>
          <button
            onClick={() => { setValuesSubTab('dimens'); setInspectingFile(null); }}
            className={`px-2.5 py-0.5 rounded text-[11px] font-mono ${
              valuesSubTab === 'dimens' ? 'bg-[#3574f0] text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            dimens.xml ({parsedDimens.length})
          </button>
          {themesFile && (
            <button
              onClick={() => { setValuesSubTab('themes'); setInspectingFile(themesFile); }}
              className={`px-2.5 py-0.5 rounded text-[11px] font-mono ${
                valuesSubTab === 'themes' ? 'bg-[#3574f0] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              themes.xml
            </button>
          )}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* VALUES: COLORS */}
        {selectedCategory === 'values' && valuesSubTab === 'colors' && (
          <div className="space-y-4">
            {/* Add Color Form */}
            <div className="bg-[#2b2d30] p-3 rounded-xl border border-[#393b40] flex items-center space-x-2 flex-wrap gap-2">
              <input
                type="text"
                placeholder="color_name (e.g. brand_primary)"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                className="w-52 bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
              />
              <div className="flex items-center space-x-1.5 bg-[#1e1f22] border border-[#393b40] rounded px-2 py-1">
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-20 bg-transparent text-white font-mono text-xs focus:outline-none uppercase"
                />
              </div>
              <button
                onClick={handleAddColor}
                className="px-3 py-1.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white font-bold text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Warna</span>
              </button>
            </div>

            {/* Colors Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {parsedColors
                .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.hex.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((col) => (
                  <div
                    key={col.name}
                    className="p-3 bg-[#2b2d30] border border-[#393b40] rounded-xl flex items-center justify-between group hover:border-[#3574f0] transition-colors"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <div
                        style={{ backgroundColor: col.hex }}
                        className="w-8 h-8 rounded-lg border border-white/20 shadow shrink-0"
                      />
                      <div className="font-mono truncate">
                        <div className="font-bold text-white text-xs truncate">@color/{col.name}</div>
                        <div className="text-gray-400 text-[10px] uppercase">{col.hex}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleCopyRef(`@color/${col.name}`)}
                        className="p-1 hover:bg-[#1e1f22] text-gray-400 hover:text-white rounded"
                        title="Salin referensi @color"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteColor(col.name)}
                        className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus warna"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* VALUES: STRINGS */}
        {selectedCategory === 'values' && valuesSubTab === 'strings' && (
          <div className="space-y-4">
            {/* Add String Form */}
            <div className="bg-[#2b2d30] p-3 rounded-xl border border-[#393b40] flex items-center space-x-2 flex-wrap gap-2">
              <input
                type="text"
                placeholder="string_key (mis. app_title)"
                value={newStringName}
                onChange={(e) => setNewStringName(e.target.value)}
                className="w-52 bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
              />
              <input
                type="text"
                placeholder="Nilai string..."
                value={newStringVal}
                onChange={(e) => setNewStringVal(e.target.value)}
                className="flex-1 min-w-[200px] bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-white font-sans text-xs focus:outline-none"
              />
              <button
                onClick={handleAddString}
                className="px-3 py-1.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white font-bold text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah String</span>
              </button>
            </div>

            {/* Strings List */}
            <div className="space-y-2 font-mono">
              {parsedStrings
                .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.value.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((str) => (
                  <div
                    key={str.name}
                    className="p-2.5 bg-[#2b2d30] border border-[#393b40] rounded-lg flex items-center justify-between group hover:border-gray-500"
                  >
                    <div className="truncate mr-2">
                      <span className="text-[#3ddc84] font-bold text-xs">@string/{str.name}</span>
                      <div className="text-white font-sans text-xs mt-0.5 break-words">"{str.value}"</div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleCopyRef(`@string/${str.name}`)}
                        className="p-1 hover:bg-[#1e1f22] text-gray-400 hover:text-white rounded"
                        title="Salin referensi @string"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteString(str.name)}
                        className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus string"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* VALUES: DIMENS */}
        {selectedCategory === 'values' && valuesSubTab === 'dimens' && (
          <div className="space-y-4">
            {/* Add Dimen Form */}
            <div className="bg-[#2b2d30] p-3 rounded-xl border border-[#393b40] flex items-center space-x-2 flex-wrap gap-2">
              <input
                type="text"
                placeholder="dimen_name (mis. padding_medium)"
                value={newDimenName}
                onChange={(e) => setNewDimenName(e.target.value)}
                className="w-52 bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
              />
              <input
                type="text"
                placeholder="Nilai (mis. 16dp, 14sp)"
                value={newDimenVal}
                onChange={(e) => setNewDimenVal(e.target.value)}
                className="w-32 bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
              />
              <button
                onClick={handleAddDimen}
                className="px-3 py-1.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white font-bold text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Dimen</span>
              </button>
            </div>

            <div className="space-y-2 font-mono">
              {parsedDimens.length === 0 ? (
                <div className="p-4 bg-[#2b2d30]/50 border border-dashed border-[#393b40] rounded-xl text-center text-gray-400">
                  Tidak ada dimen dideklarasikan di dimens.xml.
                </div>
              ) : (
                parsedDimens
                  .filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((d) => (
                    <div
                      key={d.name}
                      className="p-2.5 bg-[#2b2d30] border border-[#393b40] rounded-lg flex items-center justify-between group"
                    >
                      <div>
                        <span className="text-amber-400 font-bold text-xs">@dimen/{d.name}</span>
                        <span className="text-white ml-3 font-semibold">{d.value}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleCopyRef(`@dimen/${d.name}`)}
                          className="p-1 hover:bg-[#1e1f22] text-gray-400 hover:text-white rounded"
                          title="Salin referensi @dimen"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteDimen(d.name)}
                          className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* VALUES: THEMES */}
        {selectedCategory === 'values' && valuesSubTab === 'themes' && themesFile && (
          <div className="space-y-3">
            <div className="text-white font-bold flex items-center justify-between">
              <span>{themesFile.name} ({themesFile.path})</span>
              <span className="text-[10px] text-gray-400 font-mono">Definisi Tema & Gaya</span>
            </div>
            <textarea
              value={themesFile.content}
              onChange={(e) => onUpdateFile(themesFile.id, e.target.value)}
              spellCheck={false}
              className="w-full h-80 bg-[#18191c] text-[#bcbec4] p-3 font-mono text-xs rounded border border-[#393b40] resize-none focus:outline-none"
            />
          </div>
        )}

        {/* LAYOUTS CATEGORY */}
        {selectedCategory === 'layouts' && (
          <div className="space-y-3">
            <div className="text-white font-bold mb-2 flex items-center justify-between">
              <span>Berkas XML Layout Proyek ({layoutFiles.length})</span>
              <span className="text-[10px] text-gray-400">Klik untuk membuka di Editor Visual Layout</span>
            </div>

            <div className="space-y-2">
              {layoutFiles
                .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((file) => (
                  <div
                    key={file.id}
                    className="p-3 bg-[#2b2d30] border border-[#393b40] rounded-xl flex items-center justify-between hover:border-[#3574f0] transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-[#3574f0]/20 text-[#3574f0] flex items-center justify-center">
                        <FileCode className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{file.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{file.path}</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleCopyRef(`@layout/${file.name.replace('.xml', '')}`)}
                        className="px-2 py-1 bg-[#1e1f22] text-gray-300 rounded font-mono text-[10px] flex items-center space-x-1 hover:text-white"
                        title="Salin referensi @layout"
                      >
                        <Copy className="w-2.5 h-2.5" />
                        <span>@layout/{file.name.replace('.xml', '')}</span>
                      </button>

                      {onOpenLayoutInEditor && (
                        <button
                          onClick={() => onOpenLayoutInEditor(file)}
                          className="px-3 py-1 bg-[#3574f0] hover:bg-[#2b64d6] text-white rounded font-bold text-xs flex items-center space-x-1"
                        >
                          <span>Buka di Layout Editor</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* DRAWABLES CATEGORY */}
        {selectedCategory === 'drawables' && (
          <div className="space-y-3">
            <div className="text-white font-bold mb-2">Resource Drawable ({drawableFiles.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {drawableFiles
                .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setInspectingFile(file)}
                    className="p-3 bg-[#2b2d30] border border-[#393b40] rounded-xl flex items-center space-x-3 font-mono cursor-pointer hover:border-[#3ddc84] transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#1e1f22] border border-white/10 flex items-center justify-center text-[#3ddc84] shrink-0">
                      <Image className="w-5 h-5" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate">{file.name}</div>
                      <div className="text-[10px] text-gray-400 truncate">@drawable/{file.name.replace(/\.[^/.]+$/, '')}</div>
                    </div>
                  </div>
                ))}
            </div>

            {inspectingFile && (
              <div className="mt-4 p-3 bg-[#18191c] rounded-xl border border-[#2b2d30] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Inspektor Berkas: {inspectingFile.name}</span>
                  <button onClick={() => setInspectingFile(null)} className="text-gray-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={inspectingFile.content}
                  onChange={(e) => onUpdateFile(inspectingFile.id, e.target.value)}
                  spellCheck={false}
                  className="w-full h-44 bg-[#1e1f22] text-[#bcbec4] p-2.5 font-mono text-xs rounded border border-[#393b40] resize-none focus:outline-none"
                />
              </div>
            )}
          </div>
        )}

        {/* MIPMAPS CATEGORY */}
        {selectedCategory === 'mipmaps' && (
          <div className="space-y-3">
            <div className="text-white font-bold mb-2">Ikon & Peluncur Mipmap ({mipmapFiles.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {mipmapFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 bg-[#2b2d30] border border-[#393b40] rounded-xl flex items-center space-x-3 font-mono"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3ddc84] to-[#07c160] flex items-center justify-center text-[#121316] font-bold text-xs shrink-0">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">{file.name}</div>
                    <div className="text-[10px] text-[#3ddc84] truncate">@mipmap/{file.name.replace(/\.[^/.]+$/, '')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
