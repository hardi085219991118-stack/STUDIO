import React, { useState, useMemo } from 'react';
import { 
  Package, Plus, Check, Search, X, Trash2, Layers, 
  ExternalLink, AlertCircle, RefreshCw, FileCode, CheckCircle2 
} from 'lucide-react';
import { ProjectFile } from '../types';

interface DependenciesModalProps {
  onClose: () => void;
  onAddDependency: (depLine: string) => void;
  onRemoveDependency?: (depRaw: string) => void;
  currentGradleContent: string;
  versionCatalogContent?: string;
  onUpdateVersionCatalog?: (content: string) => void;
  onTriggerGradleSync?: () => void;
}

interface ParsedDependency {
  rawLine: string;
  config: string;
  coordinate: string;
}

export const DependenciesModal: React.FC<DependenciesModalProps> = ({
  onClose,
  onAddDependency,
  onRemoveDependency,
  currentGradleContent,
  versionCatalogContent,
  onUpdateVersionCatalog,
  onTriggerGradleSync,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'active' | 'toml'>('catalog');
  const [customCoord, setCustomCoord] = useState('');
  const [customConfig, setCustomConfig] = useState('implementation');
  const [tomlText, setTomlText] = useState(versionCatalogContent || '');
  const [savedTomlSuccess, setSavedTomlSuccess] = useState(false);

  // Dynamic parser for current dependencies in Gradle script
  const activeDependencies = useMemo<ParsedDependency[]>(() => {
    const list: ParsedDependency[] = [];
    const lines = currentGradleContent.split('\n');
    const regex = /^\s*(implementation|testImplementation|androidTestImplementation|api|compileOnly|runtimeOnly|kapt|ksp)\s*\(?['"]([^'"]+)['"]\)?/;

    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        list.push({
          rawLine: line,
          config: match[1],
          coordinate: match[2],
        });
      }
    }
    return list;
  }, [currentGradleContent]);

  // Curated modern Android dependencies
  const libraryCatalog = [
    { group: 'AndroidX Core KTX', name: 'androidx.core:core-ktx:1.12.0', desc: 'Core Kotlin extensions for Android standard platform', category: 'Core' },
    { group: 'AppCompat', name: 'androidx.appcompat:appcompat:1.6.1', desc: 'Backport of modern Android themes, action bar, and resources', category: 'UI' },
    { group: 'Material Components', name: 'com.google.android.material:material:1.11.0', desc: 'Official Material Design UI components and typography', category: 'UI' },
    { group: 'ConstraintLayout', name: 'androidx.constraintlayout:constraintlayout:2.1.4', desc: 'Flat hierarchy layout engine with relative positioning', category: 'UI' },
    { group: 'Lifecycle ViewModel', name: 'androidx.lifecycle:lifecycle-viewmodel-ktx:2.7.0', desc: 'Architecture components for state retention and lifecycle', category: 'Architecture' },
    { group: 'Retrofit 2', name: 'com.squareup.retrofit2:retrofit:2.9.0', desc: 'Type-safe HTTP REST client for Android and Kotlin', category: 'Network' },
    { group: 'OkHttp 3', name: 'com.squareup.okhttp3:okhttp:4.12.0', desc: 'Efficient HTTP/2 network transport and interceptor client', category: 'Network' },
    { group: 'Kotlin Coroutines Android', name: 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3', desc: 'Asynchronous and thread dispatching programming model', category: 'Concurrency' },
    { group: 'Room Database Runtime', name: 'androidx.room:room-runtime:2.6.1', desc: 'SQLite persistence layer and object relational mapping', category: 'Database' },
    { group: 'Gson', name: 'com.google.code.gson:gson:2.10.1', desc: 'Java/Kotlin JSON parser and serializer', category: 'Data' },
    { group: 'Glide Image Loader', name: 'com.github.bumptech.glide:glide:4.16.0', desc: 'Smooth image caching, decoding, and bitmap pipeline', category: 'Media' },
  ];

  const filteredCatalog = libraryCatalog.filter(lib => {
    const q = search.toLowerCase();
    return lib.group.toLowerCase().includes(q) || lib.name.toLowerCase().includes(q) || lib.desc.toLowerCase().includes(q);
  });

  const handleAddCatalogItem = (depName: string) => {
    const isKts = currentGradleContent.includes('implementation(');
    const depString = isKts ? `    implementation("${depName}")` : `    implementation '${depName}'`;
    onAddDependency(depString);
  };

  const handleAddCustom = () => {
    if (!customCoord.trim()) return;
    const isKts = currentGradleContent.includes('implementation(');
    const depString = isKts ? `    ${customConfig}("${customCoord.trim()}")` : `    ${customConfig} '${customCoord.trim()}'`;
    onAddDependency(depString);
    setCustomCoord('');
  };

  const handleSaveToml = () => {
    if (onUpdateVersionCatalog) {
      onUpdateVersionCatalog(tomlText);
      setSavedTomlSuccess(true);
      setTimeout(() => setSavedTomlSuccess(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 select-none backdrop-blur-xs">
      <div className="bg-[#1e1f22] border border-[#393b40] rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] text-xs">
        {/* Header */}
        <div className="bg-[#18191c] border-b border-[#2b2d30] px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-[#3574f0]" />
            <h2 className="font-bold text-white text-sm">Dependensi & Version Catalog</h2>
            <span className="text-[10px] bg-[#3574f0]/15 text-[#3574f0] px-1.5 py-0.5 rounded font-mono border border-[#3574f0]/30 font-semibold">
              Gradle
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {onTriggerGradleSync && (
              <button
                onClick={() => {
                  onTriggerGradleSync();
                  onClose();
                }}
                className="px-2 py-1 bg-[#3ddc84]/15 hover:bg-[#3ddc84]/25 border border-[#3ddc84]/30 text-[#3ddc84] rounded font-mono text-[10px] font-semibold flex items-center space-x-1"
                title="Sinkronkan proyek dengan berkas Gradle"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Sinkron Sekarang</span>
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-[#2b2d30] text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="bg-[#2b2d30] px-4 py-2 border-b border-[#393b40] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                activeTab === 'catalog' ? 'bg-[#3574f0] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Tambah Dependensi
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'active' ? 'bg-[#3574f0] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>Aktif di Proyek</span>
              <span className="bg-black/30 px-1.5 py-0.2 rounded font-mono text-[10px]">
                {activeDependencies.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('toml')}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'toml' ? 'bg-[#3574f0] text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3 h-3" />
              <span>libs.versions.toml</span>
            </button>
          </div>
        </div>

        {/* Search if in catalog */}
        {activeTab === 'catalog' && (
          <div className="p-3 bg-[#18191c] border-b border-[#2b2d30]">
            <div className="flex items-center space-x-2 bg-[#2b2d30] px-3 py-1.5 rounded border border-[#393b40]">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari dependensi Maven (Retrofit, Room, Coroutines)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-white focus:outline-none text-xs"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-3 overflow-y-auto space-y-2">
          {activeTab === 'catalog' ? (
            <>
              {/* Custom coordinate manual adder */}
              <div className="p-3 bg-[#2b2d30] rounded-xl border border-[#393b40] space-y-2 mb-3">
                <span className="font-bold text-white text-[11px] block">Tambah Koordinat Maven Kustom</span>
                <div className="flex items-center space-x-2">
                  <select
                    value={customConfig}
                    onChange={(e) => setCustomConfig(e.target.value)}
                    className="bg-[#1e1f22] border border-[#393b40] rounded px-2 py-1.5 text-white font-mono text-[11px] focus:outline-none"
                  >
                    <option value="implementation">implementation</option>
                    <option value="testImplementation">testImplementation</option>
                    <option value="androidTestImplementation">androidTestImplementation</option>
                    <option value="api">api</option>
                    <option value="kapt">kapt</option>
                  </select>
                  <input
                    type="text"
                    placeholder="group:artifact:version"
                    value={customCoord}
                    onChange={(e) => setCustomCoord(e.target.value)}
                    className="flex-1 bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#3574f0]"
                  />
                  <button
                    onClick={handleAddCustom}
                    className="px-3 py-1.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white font-bold text-xs"
                  >
                    Tambah
                  </button>
                </div>
              </div>

              {/* Curated list */}
              {filteredCatalog.map(lib => {
                const isAlreadyAdded = activeDependencies.some(d => d.coordinate.includes(lib.name.split(':')[1]));
                return (
                  <div
                    key={lib.name}
                    className="p-3 bg-[#2b2d30] border border-[#393b40] rounded-xl flex items-center justify-between"
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold text-white text-xs">{lib.group}</span>
                        <span className="text-[10px] bg-[#1e1f22] px-1.5 py-0.5 rounded text-gray-400 font-mono">
                          {lib.category}
                        </span>
                      </div>
                      <div className="font-mono text-[11px] text-[#3574f0] mb-0.5">{lib.name}</div>
                      <p className="text-[11px] text-gray-400">{lib.desc}</p>
                    </div>

                    <div>
                      {isAlreadyAdded ? (
                        <span className="flex items-center text-[#3ddc84] text-[11px] font-bold gap-1 bg-[#3ddc84]/10 px-2.5 py-1 rounded border border-[#3ddc84]/30">
                          <Check className="w-3.5 h-3.5" />
                          Ditambahkan
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddCatalogItem(lib.name)}
                          className="px-3 py-1.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white font-bold text-[11px] flex items-center gap-1 active:scale-95 transition-transform"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Tambah</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          ) : activeTab === 'active' ? (
            /* Active dependencies view */
            <div className="space-y-2">
              <div className="text-gray-400 text-xs mb-2">
                Dianalisis dari <span className="font-mono text-white">app/build.gradle.kts</span>:
              </div>

              {activeDependencies.length === 0 ? (
                <div className="p-4 bg-[#2b2d30] rounded-xl text-center text-gray-400">
                  Tidak ada dependensi yang ditemukan dari skrip build saat ini.
                </div>
              ) : (
                activeDependencies.map((dep, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#2b2d30] border border-[#393b40] rounded-xl flex items-center justify-between font-mono"
                  >
                    <div>
                      <span className="text-[10px] bg-[#1e1f22] text-[#3ddc84] px-1.5 py-0.5 rounded font-bold mr-2">
                        {dep.config}
                      </span>
                      <span className="text-white text-xs font-semibold">{dep.coordinate}</span>
                    </div>

                    {onRemoveDependency && (
                      <button
                        onClick={() => onRemoveDependency(dep.rawLine)}
                        className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-colors"
                        title="Hapus dependensi"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Version Catalog Tab */
            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-bold text-xs">gradle/libs.versions.toml</span>
                {savedTomlSuccess && (
                  <span className="text-[#3ddc84] text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tersimpan!</span>
                  </span>
                )}
              </div>
              <textarea
                value={tomlText}
                onChange={(e) => setTomlText(e.target.value)}
                spellCheck={false}
                className="w-full h-80 bg-[#18191c] text-[#bcbec4] p-3 font-mono text-xs rounded border border-[#393b40] resize-none focus:outline-none focus:border-[#3574f0]"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleSaveToml}
                  className="px-4 py-1.5 bg-[#3574f0] hover:bg-[#2b64d6] text-white rounded font-bold text-xs"
                >
                  Simpan Version Catalog
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
