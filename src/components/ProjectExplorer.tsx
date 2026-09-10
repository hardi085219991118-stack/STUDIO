import React, { useState, useRef } from 'react';
import { 
  Folder, FolderOpen, FileText, ChevronRight, ChevronDown, 
  Trash2, Edit2, Copy, Scissors, Clipboard, FilePlus, FolderPlus, RefreshCw, 
  MoreVertical, Info, ExternalLink, Package
} from 'lucide-react';
import { ProjectFile, ProjectViewMode, FileType, FileClipboard } from '../types';

interface ProjectExplorerProps {
  files: ProjectFile[];
  activeFileId: string | null;
  onSelectFile: (file: ProjectFile) => void;
  onCreateFile: (name: string, type: FileType, folderPath: string) => void;
  onCreateFolder: (name: string, parentPath: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onCopyFile?: (file: ProjectFile) => void;
  onCutFile?: (file: ProjectFile) => void;
  onPasteFile?: (targetFolder: string) => void;
  onRefresh?: () => void;
  clipboard?: FileClipboard | null;
  projectName: string;
}

export const ProjectExplorer: React.FC<ProjectExplorerProps> = ({
  files,
  activeFileId,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRenameFile,
  onCopyFile,
  onCutFile,
  onPasteFile,
  onRefresh,
  clipboard,
  projectName,
}) => {
  const [viewMode, setViewMode] = useState<ProjectViewMode>('android');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    'app': true,
    'manifests': true,
    'java': true,
    'kotlin': true,
    'res': true,
    'layout': true,
    'values': true,
    'gradle': true,
    'root': true,
  });

  // Modal states
  const [modalType, setModalType] = useState<'new_file' | 'new_folder' | 'rename' | 'properties' | null>(null);
  const [targetFile, setTargetFile] = useState<ProjectFile | null>(null);
  const [targetFolderPath, setTargetFolderPath] = useState<string>('app/src/main/java');
  const [inputName, setInputName] = useState('');
  const [selectedFileType, setSelectedFileType] = useState<FileType>('kotlin');

  // Delete Confirmation Modal
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<ProjectFile | null>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    file: ProjectFile | null;
    isFolder?: boolean;
    folderPath?: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    file: null,
  });

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleFolder = (key: string) => {
    setExpandedFolders(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getFileIcon = (file: ProjectFile) => {
    if (file.name.endsWith('.kt')) {
      return <span className="text-[#a97bff] font-bold text-[10px] w-4 text-center">KT</span>;
    }
    if (file.name.endsWith('.java')) {
      return <span className="text-[#e76f51] font-bold text-[10px] w-4 text-center">J</span>;
    }
    if (file.name.endsWith('.xml')) {
      return <span className="text-[#3ddc84] font-bold text-[10px] w-4 text-center">&lt;&gt;</span>;
    }
    if (file.name.includes('gradle')) {
      return <span className="text-[#023047] bg-[#4cc9f0] rounded px-0.5 text-[8px] font-bold">G</span>;
    }
    return <FileText className="w-3.5 h-3.5 text-[#868a98]" />;
  };

  // Open Modals
  const handleOpenNewFileModal = (folderPath = 'app/src/main/java') => {
    setTargetFolderPath(folderPath);
    setInputName('');
    setModalType('new_file');
    closeContextMenu();
  };

  const handleOpenNewFolderModal = (parentPath = 'app/src/main') => {
    setTargetFolderPath(parentPath);
    setInputName('');
    setModalType('new_folder');
    closeContextMenu();
  };

  const handleOpenRenameModal = (file: ProjectFile) => {
    setTargetFile(file);
    setInputName(file.name);
    setModalType('rename');
    closeContextMenu();
  };

  const handleOpenPropertiesModal = (file: ProjectFile) => {
    setTargetFile(file);
    setModalType('properties');
    closeContextMenu();
  };

  const handleConfirmAction = () => {
    if (!inputName.trim()) return;

    if (modalType === 'new_file') {
      let finalName = inputName.trim();
      const extMap: Record<FileType, string> = {
        kotlin: '.kt',
        java: '.java',
        xml: '.xml',
        gradle: '.gradle.kts',
        json: '.json',
        markdown: '.md',
        c_cpp: '.cpp',
        text: '.txt',
        image: '.png',
        other: '',
      };
      const expectedExt = extMap[selectedFileType];
      if (expectedExt && !finalName.endsWith(expectedExt)) {
        finalName += expectedExt;
      }
      onCreateFile(finalName, selectedFileType, targetFolderPath);
    } else if (modalType === 'new_folder') {
      onCreateFolder(inputName.trim(), targetFolderPath);
    } else if (modalType === 'rename' && targetFile) {
      onRenameFile(targetFile.id, inputName.trim());
    }

    setModalType(null);
    setTargetFile(null);
    setInputName('');
  };

  // Context Menu Helpers
  const openContextMenu = (e: React.MouseEvent, file: ProjectFile | null, isFolder = false, folderPath = '') => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: Math.min(e.clientX, window.innerWidth - 180),
      y: Math.min(e.clientY, window.innerHeight - 240),
      file,
      isFolder,
      folderPath,
    });
  };

  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // Touch Long-Press handlers
  const handleTouchStart = (file: ProjectFile | null, isFolder = false, folderPath = '') => {
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({
        visible: true,
        x: window.innerWidth / 2 - 80,
        y: window.innerHeight / 3,
        file,
        isFolder,
        folderPath,
      });
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Categorized file sets
  const manifestFiles = files.filter(f => f.name === 'AndroidManifest.xml');
  const sourceFiles = files.filter(f => f.name.endsWith('.kt') || f.name.endsWith('.java'));
  const layoutFiles = files.filter(f => f.path.includes('res/layout'));
  const valueFiles = files.filter(f => f.path.includes('res/values'));
  const gradleFiles = files.filter(f => f.path.includes('gradle') || f.name.includes('gradle'));

  return (
    <aside 
      aria-label="Project Structure" 
      onClick={closeContextMenu}
      className="w-full h-full flex flex-col bg-[#1e1f22] border-r border-[#2b2d30] select-none text-xs text-[#bcbec4]"
    >
      {/* Header with View Mode Selector & Action Icons */}
      <div className="flex items-center justify-between px-2.5 py-2 border-b border-[#2b2d30] bg-[#18191c]">
        <div className="flex items-center space-x-1">
          <select
            aria-label="Project View Mode"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ProjectViewMode)}
            className="bg-[#2b2d30] text-white border border-[#393b40] rounded px-1.5 py-0.5 text-xs font-semibold focus:outline-none"
          >
            <option value="android">Android</option>
            <option value="project">Project Files</option>
            <option value="packages">Packages</option>
          </select>
        </div>

        <div className="flex items-center space-x-1">
          {clipboard && (
            <span className="text-[10px] bg-[#3574f0]/20 text-[#3574f0] px-1 py-0.5 rounded font-mono" title={`Clipboard: ${clipboard.operation} ${clipboard.fileName}`}>
              {clipboard.operation === 'cut' ? 'Cut' : 'Copied'}
            </span>
          )}

          <button
            id="btn-explorer-refresh"
            onClick={onRefresh}
            title="Refresh Filesystem"
            className="p-1 hover:bg-[#2b2d30] rounded text-[#bcbec4] hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#868a98]" />
          </button>

          <button
            id="btn-explorer-new-file"
            onClick={() => handleOpenNewFileModal()}
            title="New File (Kotlin / Java / XML)"
            className="p-1 hover:bg-[#2b2d30] rounded text-[#bcbec4] hover:text-white"
          >
            <FilePlus className="w-3.5 h-3.5 text-[#3ddc84]" />
          </button>

          <button
            id="btn-explorer-new-folder"
            onClick={() => handleOpenNewFolderModal()}
            title="New Folder / Directory"
            className="p-1 hover:bg-[#2b2d30] rounded text-[#bcbec4] hover:text-white"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#3574f0]" />
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto px-1 py-1.5 font-mono text-[11px] leading-tight space-y-0.5">
        {viewMode === 'android' ? (
          /* Specialized Android View */
          <div>
            {/* Top Node: app */}
            <div
              onClick={() => toggleFolder('app')}
              onContextMenu={(e) => openContextMenu(e, null, true, 'app')}
              className="flex items-center px-1.5 py-1 hover:bg-[#2b2d30] rounded cursor-pointer text-[#dfe1e5] font-semibold"
            >
              {expandedFolders['app'] ? <ChevronDown className="w-3.5 h-3.5 mr-1 text-[#868a98]" /> : <ChevronRight className="w-3.5 h-3.5 mr-1 text-[#868a98]" />}
              <FolderOpen className="w-3.5 h-3.5 mr-1.5 text-[#3574f0]" />
              <span>app</span>
            </div>

            {expandedFolders['app'] && (
              <div className="pl-3.5 space-y-0.5 border-l border-[#2b2d30]/60 ml-2">
                {/* manifests */}
                <div>
                  <div
                    onClick={() => toggleFolder('manifests')}
                    onContextMenu={(e) => openContextMenu(e, null, true, 'app/src/main')}
                    className="flex items-center px-1.5 py-1 hover:bg-[#2b2d30] rounded cursor-pointer text-[#bcbec4]"
                  >
                    {expandedFolders['manifests'] ? <ChevronDown className="w-3 h-3 mr-1 text-[#868a98]" /> : <ChevronRight className="w-3 h-3 mr-1 text-[#868a98]" />}
                    <Folder className="w-3.5 h-3.5 mr-1.5 text-[#f0a732]" />
                    <span>manifests</span>
                  </div>
                  {expandedFolders['manifests'] && (
                    <div className="pl-4">
                      {manifestFiles.map(file => (
                        <div
                          key={file.id}
                          onClick={() => onSelectFile(file)}
                          onContextMenu={(e) => openContextMenu(e, file)}
                          onTouchStart={() => handleTouchStart(file)}
                          onTouchEnd={handleTouchEnd}
                          className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer group ${
                            activeFileId === file.id ? 'bg-[#3574f0] text-white font-medium' : 'hover:bg-[#2b2d30]'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5 truncate">
                            {getFileIcon(file)}
                            <span className="truncate">{file.name}</span>
                          </div>
                          <button
                            onClick={(e) => openContextMenu(e, file)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-white"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* java / kotlin */}
                <div>
                  <div
                    onClick={() => toggleFolder('kotlin')}
                    onContextMenu={(e) => openContextMenu(e, null, true, 'app/src/main/java')}
                    className="flex items-center px-1.5 py-1 hover:bg-[#2b2d30] rounded cursor-pointer text-[#bcbec4]"
                  >
                    {expandedFolders['kotlin'] ? <ChevronDown className="w-3 h-3 mr-1 text-[#868a98]" /> : <ChevronRight className="w-3 h-3 mr-1 text-[#868a98]" />}
                    <Folder className="w-3.5 h-3.5 mr-1.5 text-[#3ddc84]" />
                    <span>java / kotlin</span>
                  </div>
                  {expandedFolders['kotlin'] && (
                    <div className="pl-4 space-y-0.5">
                      {sourceFiles.map(file => (
                        <div
                          key={file.id}
                          onClick={() => onSelectFile(file)}
                          onContextMenu={(e) => openContextMenu(e, file)}
                          onTouchStart={() => handleTouchStart(file)}
                          onTouchEnd={handleTouchEnd}
                          className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer group ${
                            activeFileId === file.id ? 'bg-[#3574f0] text-white font-medium' : 'hover:bg-[#2b2d30]'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5 truncate">
                            {getFileIcon(file)}
                            <span className="truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenRenameModal(file); }}
                              title="Rename"
                              className="p-0.5 text-gray-400 hover:text-white"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmTarget(file); }}
                              title="Delete"
                              className="p-0.5 text-gray-400 hover:text-red-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => openContextMenu(e, file)}
                              title="More Options"
                              className="p-0.5 text-gray-400 hover:text-white"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* res */}
                <div>
                  <div
                    onClick={() => toggleFolder('res')}
                    onContextMenu={(e) => openContextMenu(e, null, true, 'app/src/main/res')}
                    className="flex items-center px-1.5 py-1 hover:bg-[#2b2d30] rounded cursor-pointer text-[#bcbec4]"
                  >
                    {expandedFolders['res'] ? <ChevronDown className="w-3 h-3 mr-1 text-[#868a98]" /> : <ChevronRight className="w-3 h-3 mr-1 text-[#868a98]" />}
                    <Folder className="w-3.5 h-3.5 mr-1.5 text-[#e76f51]" />
                    <span>res</span>
                  </div>
                  {expandedFolders['res'] && (
                    <div className="pl-3.5 space-y-0.5 border-l border-[#2b2d30]/60 ml-2">
                      {/* layout */}
                      <div>
                        <div
                          onClick={() => toggleFolder('layout')}
                          onContextMenu={(e) => openContextMenu(e, null, true, 'app/src/main/res/layout')}
                          className="flex items-center px-1 py-0.5 hover:bg-[#2b2d30] rounded cursor-pointer text-[#dfe1e5]"
                        >
                          {expandedFolders['layout'] ? <ChevronDown className="w-3 h-3 mr-1 text-[#868a98]" /> : <ChevronRight className="w-3 h-3 mr-1 text-[#868a98]" />}
                          <span>layout</span>
                        </div>
                        {expandedFolders['layout'] && (
                          <div className="pl-3 space-y-0.5">
                            {layoutFiles.map(file => (
                              <div
                                key={file.id}
                                onClick={() => onSelectFile(file)}
                                onContextMenu={(e) => openContextMenu(e, file)}
                                onTouchStart={() => handleTouchStart(file)}
                                onTouchEnd={handleTouchEnd}
                                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer group ${
                                  activeFileId === file.id ? 'bg-[#3574f0] text-white font-medium' : 'hover:bg-[#2b2d30]'
                                }`}
                              >
                                <div className="flex items-center space-x-1.5 truncate">
                                  {getFileIcon(file)}
                                  <span className="truncate">{file.name}</span>
                                </div>
                                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenRenameModal(file); }}
                                    className="p-0.5 text-gray-400 hover:text-white"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmTarget(file); }}
                                    className="p-0.5 text-gray-400 hover:text-red-400"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* values */}
                      <div>
                        <div
                          onClick={() => toggleFolder('values')}
                          onContextMenu={(e) => openContextMenu(e, null, true, 'app/src/main/res/values')}
                          className="flex items-center px-1 py-0.5 hover:bg-[#2b2d30] rounded cursor-pointer text-[#dfe1e5]"
                        >
                          {expandedFolders['values'] ? <ChevronDown className="w-3 h-3 mr-1 text-[#868a98]" /> : <ChevronRight className="w-3 h-3 mr-1 text-[#868a98]" />}
                          <span>values</span>
                        </div>
                        {expandedFolders['values'] && (
                          <div className="pl-3 space-y-0.5">
                            {valueFiles.map(file => (
                              <div
                                key={file.id}
                                onClick={() => onSelectFile(file)}
                                onContextMenu={(e) => openContextMenu(e, file)}
                                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer group ${
                                  activeFileId === file.id ? 'bg-[#3574f0] text-white font-medium' : 'hover:bg-[#2b2d30]'
                                }`}
                              >
                                <div className="flex items-center space-x-1.5 truncate">
                                  {getFileIcon(file)}
                                  <span className="truncate">{file.name}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gradle Scripts Node */}
            <div className="mt-2">
              <div
                onClick={() => toggleFolder('gradle')}
                onContextMenu={(e) => openContextMenu(e, null, true, '')}
                className="flex items-center px-1.5 py-1 hover:bg-[#2b2d30] rounded cursor-pointer text-[#dfe1e5] font-semibold"
              >
                {expandedFolders['gradle'] ? <ChevronDown className="w-3.5 h-3.5 mr-1 text-[#868a98]" /> : <ChevronRight className="w-3.5 h-3.5 mr-1 text-[#868a98]" />}
                <Folder className="w-3.5 h-3.5 mr-1.5 text-[#4cc9f0]" />
                <span>Gradle Scripts</span>
              </div>
              {expandedFolders['gradle'] && (
                <div className="pl-4 space-y-0.5">
                  {gradleFiles.map(file => (
                    <div
                      key={file.id}
                      onClick={() => onSelectFile(file)}
                      onContextMenu={(e) => openContextMenu(e, file)}
                      className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer group ${
                        activeFileId === file.id ? 'bg-[#3574f0] text-white font-medium' : 'hover:bg-[#2b2d30]'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 truncate">
                        {getFileIcon(file)}
                        <span className="truncate">{file.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : viewMode === 'packages' ? (
          /* Packages View */
          <div className="space-y-1">
            <div className="font-semibold text-white px-2 py-1 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-[#3ddc84]" />
              <span>com.androidstudiomobile.ide</span>
            </div>
            <div className="pl-3 space-y-0.5">
              {sourceFiles.map(file => (
                <div
                  key={file.id}
                  onClick={() => onSelectFile(file)}
                  onContextMenu={(e) => openContextMenu(e, file)}
                  className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer group ${
                    activeFileId === file.id ? 'bg-[#3574f0] text-white font-medium' : 'hover:bg-[#2b2d30]'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    {getFileIcon(file)}
                    <span className="truncate">{file.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Project Physical Files View */
          <div className="space-y-0.5">
            <div 
              onContextMenu={(e) => openContextMenu(e, null, true, '')}
              className="font-semibold text-white px-2 py-1 flex items-center justify-between group rounded hover:bg-[#2b2d30]"
            >
              <div className="flex items-center gap-1.5 truncate">
                <FolderOpen className="w-3.5 h-3.5 text-[#3574f0]" />
                <span className="truncate">{projectName}</span>
              </div>
              <button
                onClick={(e) => openContextMenu(e, null, true, '')}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-white"
              >
                <MoreVertical className="w-3 h-3" />
              </button>
            </div>
            {files.map(file => (
              <div
                key={file.id}
                onClick={() => onSelectFile(file)}
                onContextMenu={(e) => openContextMenu(e, file)}
                onTouchStart={() => handleTouchStart(file)}
                onTouchEnd={handleTouchEnd}
                className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer group ${
                  activeFileId === file.id ? 'bg-[#3574f0] text-white font-medium' : 'hover:bg-[#2b2d30]'
                }`}
              >
                <div className="flex items-center space-x-1.5 truncate">
                  {getFileIcon(file)}
                  <span className="truncate">{file.path}</span>
                </div>
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleOpenRenameModal(file); }}
                    className="p-0.5 text-gray-400 hover:text-white"
                    title="Rename"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmTarget(file); }}
                    className="p-0.5 text-gray-400 hover:text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => openContextMenu(e, file)}
                    className="p-0.5 text-gray-400 hover:text-white"
                    title="More Options"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context Menu Popup */}
      {contextMenu.visible && (
        <div 
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 bg-[#2b2d30] border border-[#393b40] rounded shadow-2xl py-1 text-xs text-gray-200 min-w-[160px]"
        >
          {contextMenu.file ? (
            // File Context Menu
            <>
              <button
                onClick={() => {
                  onSelectFile(contextMenu.file!);
                  closeContextMenu();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Editor</span>
              </button>
              <button
                onClick={() => handleOpenRenameModal(contextMenu.file!)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Rename...</span>
              </button>
              <button
                onClick={() => {
                  if (onCopyFile) onCopyFile(contextMenu.file!);
                  closeContextMenu();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center gap-2"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy File</span>
              </button>
              <button
                onClick={() => {
                  if (onCutFile) onCutFile(contextMenu.file!);
                  closeContextMenu();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center gap-2"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>Cut File</span>
              </button>
              <div className="border-t border-[#393b40] my-1" />
              <button
                onClick={() => handleOpenPropertiesModal(contextMenu.file!)}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center gap-2"
              >
                <Info className="w-3.5 h-3.5" />
                <span>File Properties</span>
              </button>
              <button
                onClick={() => {
                  const f = contextMenu.file!;
                  closeContextMenu();
                  setDeleteConfirmTarget(f);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#e76f51] hover:text-white flex items-center gap-2 text-[#e76f51]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete File</span>
              </button>
            </>
          ) : (
            // Folder Context Menu
            <>
              <button
                onClick={() => handleOpenNewFileModal(contextMenu.folderPath || 'app/src/main')}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center gap-2"
              >
                <FilePlus className="w-3.5 h-3.5 text-[#3ddc84]" />
                <span>New File...</span>
              </button>
              <button
                onClick={() => handleOpenNewFolderModal(contextMenu.folderPath || 'app/src/main')}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center gap-2"
              >
                <FolderPlus className="w-3.5 h-3.5 text-[#3574f0]" />
                <span>New Directory...</span>
              </button>
              {clipboard && onPasteFile && (
                <button
                  onClick={() => {
                    onPasteFile(contextMenu.folderPath || '');
                    closeContextMenu();
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center gap-2"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste ({clipboard.fileName})</span>
                </button>
              )}
              <div className="border-t border-[#393b40] my-1" />
              <button
                onClick={() => {
                  if (onRefresh) onRefresh();
                  closeContextMenu();
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#3574f0] hover:text-white flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Folder</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2b2d30] border border-[#393b40] rounded-lg shadow-2xl w-full max-w-sm p-4 text-white">
            <h3 className="text-sm font-semibold text-[#e76f51] flex items-center gap-1.5 mb-2">
              <Trash2 className="w-4 h-4" />
              <span>DELETE FILE?</span>
            </h3>
            <p className="text-xs text-gray-300 mb-1">
              File: <strong className="text-white">{deleteConfirmTarget.name}</strong>
            </p>
            <p className="text-xs text-gray-400 mb-4">
              Path: <code className="text-gray-300">{deleteConfirmTarget.path}</code>
              <br />
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-3 py-1 text-xs rounded bg-[#35373c] hover:bg-[#43454b] text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = deleteConfirmTarget.id;
                  setDeleteConfirmTarget(null);
                  onDeleteFile(id);
                }}
                className="px-3 py-1 text-xs rounded bg-[#e76f51] hover:bg-[#d65d3e] text-white font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for New File, Folder, Rename, Properties */}
      {modalType && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#2b2d30] border border-[#393b40] rounded-lg shadow-2xl w-full max-w-sm p-4 text-white">
            <h3 className="text-sm font-semibold mb-3">
              {modalType === 'new_file' && 'Create New File'}
              {modalType === 'new_folder' && 'Create New Directory'}
              {modalType === 'rename' && 'Rename File'}
              {modalType === 'properties' && 'File Properties'}
            </h3>

            {modalType === 'properties' && targetFile ? (
              <div className="space-y-2 text-xs text-gray-300 font-mono">
                <div>
                  <span className="text-gray-400">File Name: </span>
                  <span className="text-white font-bold">{targetFile.name}</span>
                </div>
                <div>
                  <span className="text-gray-400">Relative Path: </span>
                  <span className="text-white break-all">{targetFile.path}</span>
                </div>
                <div>
                  <span className="text-gray-400">File Type: </span>
                  <span className="text-[#3ddc84] uppercase">{targetFile.type}</span>
                </div>
                <div>
                  <span className="text-gray-400">Size: </span>
                  <span>{targetFile.content?.length || 0} characters</span>
                </div>
                <div className="flex justify-end pt-3">
                  <button
                    onClick={() => setModalType(null)}
                    className="px-3 py-1 text-xs rounded bg-[#3574f0] text-white font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {modalType === 'new_file' && (
                  <div>
                    <label className="text-[11px] text-gray-400 block mb-1">File Type</label>
                    <select
                      value={selectedFileType}
                      onChange={(e) => setSelectedFileType(e.target.value as FileType)}
                      className="w-full bg-[#1e1f22] border border-[#393b40] rounded px-2 py-1.5 text-xs text-white"
                    >
                      <option value="kotlin">Kotlin File (.kt)</option>
                      <option value="java">Java Class (.java)</option>
                      <option value="xml">Android XML Layout / Resource (.xml)</option>
                      <option value="gradle">Gradle Script (.gradle.kts)</option>
                      <option value="json">JSON Configuration (.json)</option>
                      <option value="markdown">Markdown Documentation (.md)</option>
                      <option value="text">Text File (.txt)</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[11px] text-gray-400 block mb-1">
                    {modalType === 'rename' ? 'New Name' : 'Name'}
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder={modalType === 'new_file' ? 'e.g. DetailsActivity.kt' : 'e.g. viewmodel'}
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleConfirmAction();
                      if (e.key === 'Escape') setModalType(null);
                    }}
                    className="w-full bg-[#1e1f22] border border-[#393b40] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#3574f0] font-mono"
                  />
                </div>

                <div className="text-[10px] text-gray-400 font-mono">
                  Location: <code>{targetFolderPath}</code>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setModalType(null)}
                    className="px-3 py-1 text-xs rounded bg-[#35373c] hover:bg-[#3e4147] text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmAction}
                    className="px-3 py-1 text-xs rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white font-medium"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
