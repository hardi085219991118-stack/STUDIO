import React, { useState, useEffect } from 'react';
import { Search, FileCode, Layers, Settings, X, ArrowRight } from 'lucide-react';
import { ProjectFile } from '../types';

interface SearchEverywhereModalProps {
  files: ProjectFile[];
  onSelectFile: (file: ProjectFile) => void;
  onClose: () => void;
}

export const SearchEverywhereModal: React.FC<SearchEverywhereModalProps> = ({
  files,
  onSelectFile,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'files' | 'symbols' | 'actions'>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const searchResults = files.filter(f => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q) || f.content.toLowerCase().includes(q);
  }).slice(0, 12);

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-start justify-center pt-16 p-3 select-none">
      <div className="bg-[#1e1f22] border border-[#393b40] rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[80vh] text-xs">
        {/* Search Input Box */}
        <div className="bg-[#18191c] border-b border-[#2b2d30] p-3 flex items-center space-x-2">
          <Search className="w-4 h-4 text-[#3574f0]" />
          <input
            type="text"
            autoFocus
            placeholder="Cari berkas, kelas, simbol, atau aksi (Shift-Shift)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white focus:outline-none text-xs"
          />
          <button onClick={onClose} className="p-1 hover:bg-[#2b2d30] rounded text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex items-center space-x-1 px-3 py-1.5 bg-[#2b2d30] border-b border-[#393b40] text-[11px] font-mono">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2 py-0.5 rounded ${activeFilter === 'all' ? 'bg-[#3574f0] text-white font-bold' : 'text-gray-400'}`}
          >
            Semua
          </button>
          <button
            onClick={() => setActiveFilter('files')}
            className={`px-2 py-0.5 rounded ${activeFilter === 'files' ? 'bg-[#3574f0] text-white font-bold' : 'text-gray-400'}`}
          >
            Berkas
          </button>
          <button
            onClick={() => setActiveFilter('symbols')}
            className={`px-2 py-0.5 rounded ${activeFilter === 'symbols' ? 'bg-[#3574f0] text-white font-bold' : 'text-gray-400'}`}
          >
            Simbol
          </button>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {searchResults.map(file => (
            <div
              key={file.id}
              onClick={() => {
                onSelectFile(file);
                onClose();
              }}
              className="p-2 rounded hover:bg-[#2b2d30] cursor-pointer flex items-center justify-between group transition-colors"
            >
              <div className="flex items-center space-x-2.5 truncate">
                <FileCode className="w-4 h-4 text-[#3ddc84] shrink-0" />
                <div className="truncate font-mono">
                  <div className="text-white font-medium truncate text-xs">{file.name}</div>
                  <div className="text-gray-500 text-[10px] truncate">{file.path}</div>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white shrink-0" />
            </div>
          ))}
          {searchResults.length === 0 && (
            <div className="text-center py-6 text-gray-500 font-mono text-[11px]">
              Tidak ditemukan berkas atau simbol yang cocok.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
