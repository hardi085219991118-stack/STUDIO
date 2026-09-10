import React, { useState, useMemo } from 'react';
import { 
  Palette, FileText, Image, Layers, Plus, Trash2, Edit2, 
  Check, Smartphone, Search, RefreshCw, Folder, FileCode,
  Tag, Sliders, Eye
} from 'lucide-react';
import { ProjectFile } from '../types';

interface ResourceManagerProps {
  files: ProjectFile[];
  onUpdateFile: (fileId: string, content: string) => void;
  onClose: () => void;
}

type ResourceCategory = 'values' | 'layouts' | 'drawables' | 'mipmaps' | 'menus' | 'raw';

export const ResourceManager: React.FC<ResourceManagerProps> = ({
  files,
  onUpdateFile,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory>('values');
  const [valuesSubTab, setValuesSubTab] = useState<'colors' | 'strings' | 'dimens' | 'themes'>('colors');
  const [searchQuery, setSearchQuery] = useState('');

  // Add resource modal/inputs
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#3DDC84');
  const [newStringName, setNewStringName] = useState('');
  const [newStringVal, setNewStringVal] = useState('');

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
      dimens.push({ name: match[1], value: match[2] });
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

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1f22] text-[#bcbec4] text-xs select-none overflow-hidden">
      {/* Top Header */}
      <div className="bg-[#18191c] border-b border-[#2b2d30] px-3 py-1.5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <Palette className="w-3.5 h-3.5 text-[#3574f0]" />
          <span className="font-semibold text-white">Resource Manager</span>
          <span className="text-[10px] bg-[#3574f0]/15 text-[#3574f0] font-mono px-1.5 py-0.5 rounded border border-[#3574f0]/30 font-semibold">
            res/ SCANNER
          </span>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center space-x-1 bg-[#2b2d30] p-0.5 rounded border border-[#393b40] font-mono text-[11px]">
          <button
            onClick={() => setSelectedCategory('values')}
            className={`px-2.5 py-0.5 rounded transition-colors ${selectedCategory === 'values' ? 'bg-[#3574f0] text-white font-medium' : 'text-gray-400 hover:text-white'}`}
          >
            Values ({parsedColors.length + parsedStrings.length + parsedDimens.length})
          </button>
          <button
            onClick={() => setSelectedCategory('layouts')}
            className={`px-2.5 py-0.5 rounded transition-colors ${selectedCategory === 'layouts' ? 'bg-[#3574f0] text-white font-medium' : 'text-gray-400 hover:text-white'}`}
          >
            Layouts ({layoutFiles.length})
          </button>
          <button
            onClick={() => setSelectedCategory('drawables')}
            className={`px-2.5 py-0.5 rounded transition-colors ${selectedCategory === 'drawables' ? 'bg-[#3574f0] text-white font-medium' : 'text-gray-400 hover:text-white'}`}
          >
            Drawables ({drawableFiles.length})
          </button>
          <button
            onClick={() => setSelectedCategory('mipmaps')}
            className={`px-2.5 py-0.5 rounded transition-colors ${selectedCategory === 'mipmaps' ? 'bg-[#3574f0] text-white font-medium' : 'text-gray-400 hover:text-white'}`}
          >
            Mipmaps ({mipmapFiles.length})
          </button>
          <button
            onClick={() => setSelectedCategory('menus')}
            className={`px-2.5 py-0.5 rounded transition-colors ${selectedCategory === 'menus' ? 'bg-[#3574f0] text-white font-medium' : 'text-gray-400 hover:text-white'}`}
          >
            Menu ({menuFiles.length})
          </button>
        </div>
      </div>

      {/* Sub-bar for search and sub-categories */}
      <div className="bg-[#18191c] px-3 py-2 border-b border-[#2b2d30] flex items-center justify-between gap-3 shrink-0">
        {selectedCategory === 'values' ? (
          <div className="flex items-center space-x-1 font-mono text-[11px]">
            <button
              onClick={() => setValuesSubTab('colors')}
              className={`px-2 py-0.5 rounded ${valuesSubTab === 'colors' ? 'bg-[#2b2d30] text-[#3ddc84] font-bold border border-[#3ddc84]/30' : 'text-gray-400 hover:text-white'}`}
            >
              @color ({parsedColors.length})
            </button>
            <button
              onClick={() => setValuesSubTab('strings')}
              className={`px-2 py-0.5 rounded ${valuesSubTab === 'strings' ? 'bg-[#2b2d30] text-[#3574f0] font-bold border border-[#3574f0]/30' : 'text-gray-400 hover:text-white'}`}
            >
              @string ({parsedStrings.length})
            </button>
            <button
              onClick={() => setValuesSubTab('dimens')}
              className={`px-2 py-0.5 rounded ${valuesSubTab === 'dimens' ? 'bg-[#2b2d30] text-amber-400 font-bold border border-amber-400/30' : 'text-gray-400 hover:text-white'}`}
            >
              @dimen ({parsedDimens.length})
            </button>
          </div>
        ) : (
          <div className="text-gray-400 font-mono text-xs">
            Scanning project tree for {selectedCategory} resources...
          </div>
        )}

        <div className="flex items-center space-x-2 bg-[#2b2d30] px-2.5 py-1 rounded border border-[#393b40]">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Filter resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-white focus:outline-none text-xs w-44 font-mono"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {/* VALUES CATEGORY */}
        {selectedCategory === 'values' && valuesSubTab === 'colors' && (
          <div className="space-y-4">
            {/* Add Color Form */}
            <div className="bg-[#2b2d30] p-3 rounded-xl border border-[#393b40] flex items-center space-x-3">
              <input
                type="text"
                placeholder="color_name (e.g. primary_accent)"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                className="bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none flex-1"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-7 h-7 rounded border border-white/20 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-20 bg-[#1e1f22] border border-[#393b40] rounded px-2 py-1.5 text-white font-mono text-xs focus:outline-none uppercase"
                />
              </div>
              <button
                onClick={handleAddColor}
                className="px-3 py-1.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white font-bold text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Color</span>
              </button>
            </div>

            {/* Colors Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {parsedColors
                .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.hex.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((col, idx) => (
                  <div key={idx} className="p-3 bg-[#2b2d30] border border-[#393b40] rounded-xl flex items-center space-x-3 hover:border-gray-500 transition-colors">
                    <div
                      style={{ backgroundColor: col.hex }}
                      className="w-10 h-10 rounded-lg shadow border border-white/20 shrink-0"
                    />
                    <div className="font-mono truncate flex-1">
                      <div className="font-bold text-white text-xs truncate">@color/{col.name}</div>
                      <div className="text-gray-400 text-[11px] uppercase mt-0.5">{col.hex}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {selectedCategory === 'values' && valuesSubTab === 'strings' && (
          <div className="space-y-4">
            {/* Add String Form */}
            <div className="bg-[#2b2d30] p-3 rounded-xl border border-[#393b40] flex items-center space-x-2">
              <input
                type="text"
                placeholder="string_key (e.g. welcome_message)"
                value={newStringName}
                onChange={(e) => setNewStringName(e.target.value)}
                className="w-56 bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none"
              />
              <input
                type="text"
                placeholder="String value..."
                value={newStringVal}
                onChange={(e) => setNewStringVal(e.target.value)}
                className="flex-1 bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-white font-sans text-xs focus:outline-none"
              />
              <button
                onClick={handleAddString}
                className="px-3 py-1.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white font-bold text-xs flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add String</span>
              </button>
            </div>

            {/* Strings List */}
            <div className="space-y-2 font-mono">
              {parsedStrings
                .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.value.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((str, idx) => (
                  <div key={idx} className="p-2.5 bg-[#2b2d30] border border-[#393b40] rounded-lg flex items-center justify-between">
                    <div>
                      <span className="text-[#3ddc84] font-bold text-xs">@string/{str.name}</span>
                      <div className="text-white font-sans text-xs mt-0.5">"{str.value}"</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {selectedCategory === 'values' && valuesSubTab === 'dimens' && (
          <div className="space-y-2 font-mono">
            {parsedDimens.length === 0 ? (
              <div className="p-4 bg-[#2b2d30]/50 border border-dashed border-[#393b40] rounded-xl text-center text-gray-400">
                No dimens.xml resource file declared in this project.
              </div>
            ) : (
              parsedDimens.map((d, idx) => (
                <div key={idx} className="p-2.5 bg-[#2b2d30] border border-[#393b40] rounded-lg flex items-center justify-between">
                  <span className="text-amber-400 font-bold">@dimen/{d.name}</span>
                  <span className="text-white">{d.value}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* LAYOUTS CATEGORY */}
        {selectedCategory === 'layouts' && (
          <div className="space-y-2">
            <div className="text-white font-bold mb-3 flex items-center justify-between">
              <span>Layout XML Files ({layoutFiles.length})</span>
            </div>
            {layoutFiles.map(file => (
              <div key={file.id} className="p-3 bg-[#2b2d30] border border-[#393b40] rounded-xl flex items-center justify-between font-mono">
                <div className="flex items-center space-x-2.5">
                  <FileCode className="w-4 h-4 text-[#3574f0]" />
                  <div>
                    <div className="font-bold text-white text-xs">{file.name}</div>
                    <div className="text-[10px] text-gray-400">{file.path}</div>
                  </div>
                </div>
                <span className="text-[10px] bg-[#1e1f22] text-gray-400 px-2 py-1 rounded">
                  {file.content.length} chars
                </span>
              </div>
            ))}
          </div>
        )}

        {/* DRAWABLES CATEGORY */}
        {selectedCategory === 'drawables' && (
          <div className="space-y-3">
            <div className="text-white font-bold mb-2">Drawable Resources ({drawableFiles.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {drawableFiles.map(file => (
                <div key={file.id} className="p-3 bg-[#2b2d30] border border-[#393b40] rounded-xl flex items-center space-x-3 font-mono">
                  <div className="w-10 h-10 rounded-lg bg-[#1e1f22] border border-white/10 flex items-center justify-center text-[#3ddc84]">
                    <Image className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">{file.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">{file.path}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MIPMAPS CATEGORY */}
        {selectedCategory === 'mipmaps' && (
          <div className="space-y-3">
            <div className="text-white font-bold mb-2">Mipmap Resources & Icons ({mipmapFiles.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {mipmapFiles.map(file => (
                <div key={file.id} className="p-3 bg-[#2b2d30] border border-[#393b40] rounded-xl flex items-center space-x-3 font-mono">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3ddc84] to-[#07c160] flex items-center justify-center text-[#121316]">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-bold text-white truncate">{file.name}</div>
                    <div className="text-[10px] text-gray-400 truncate">{file.path}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MENUS CATEGORY */}
        {selectedCategory === 'menus' && (
          <div className="space-y-2">
            {menuFiles.length === 0 ? (
              <div className="p-4 bg-[#2b2d30]/50 border border-dashed border-[#393b40] rounded-xl text-center text-gray-400">
                No menu XML resources found in res/menu/.
              </div>
            ) : (
              menuFiles.map(file => (
                <div key={file.id} className="p-3 bg-[#2b2d30] border border-[#393b40] rounded-xl flex items-center justify-between font-mono">
                  <span className="font-bold text-white">{file.name}</span>
                  <span className="text-[10px] text-gray-400">{file.path}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
