import React, { useState, useEffect, useRef } from 'react';
import { 
  ProjectFile, EditorTab, ProjectConfig, DeviceInfo, 
  BuildResult, BuildLogEntry, BuildStepPhase, LogcatMessage, 
  SplitMode, IdeSettings, BottomToolTab, BuildEnvironmentStatus, 
  BuildTaskType, FileClipboard, FileType
} from './types';
import { INITIAL_PROJECT_CONFIG, generateProjectFiles } from './data/templates';
import { TopMenuBar } from './components/TopMenuBar';
import { Toolbar } from './components/Toolbar';
import { ProjectExplorer } from './components/ProjectExplorer';
import { CodeEditor } from './components/CodeEditor';
import { TouchKeyboard } from './components/TouchKeyboard';
import { LayoutEditor } from './components/LayoutEditor';
import { BuildPanel } from './components/BuildPanel';
import { DeviceSimulator } from './components/DeviceSimulator';
import { TerminalPanel } from './components/TerminalPanel';
import { LogcatPanel } from './components/LogcatPanel';
import { DeviceManagerModal } from './components/DeviceManagerModal';
import { NewProjectModal } from './components/NewProjectModal';
import { SearchEverywhereModal } from './components/SearchEverywhereModal';
import { DependenciesModal } from './components/DependenciesModal';
import { SettingsModal } from './components/SettingsModal';
import { ManifestEditor } from './components/ManifestEditor';
import { ResourceManager } from './components/ResourceManager';
import { GitPanel } from './components/GitPanel';
import { ApkManagerPanel } from './components/ApkManagerPanel';
import { AdbService } from './services/AdbService';
import { ApkService } from './services/ApkService';
import { 
  Terminal as TerminalIcon, Hammer, Smartphone, 
  ChevronUp, ChevronDown, Package, GitBranch
} from 'lucide-react';

const STORAGE_KEY_FILES = 'asm_project_files_v2';
const STORAGE_KEY_CONFIG = 'asm_project_config_v2';
const STORAGE_KEY_SETTINGS = 'asm_ide_settings_v2';

export default function App() {
  // Project Config & Files
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return INITIAL_PROJECT_CONFIG;
  });

  const [files, setFiles] = useState<ProjectFile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FILES);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return generateProjectFiles(INITIAL_PROJECT_CONFIG, 'empty_views');
  });

  // Editor State
  const [openTabs, setOpenTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<FileClipboard | null>(null);
  const [splitMode, setSplitMode] = useState<SplitMode>('none');
  const [showLayoutDesigner, setShowLayoutDesigner] = useState(false);
  const [showManifestEditor, setShowManifestEditor] = useState(false);
  const [showResourceManager, setShowResourceManager] = useState(false);

  // Bottom Panel State
  const [bottomTab, setBottomTab] = useState<BottomToolTab>('build');
  const [isBottomOpen, setIsBottomOpen] = useState(true);

  // Toolchain and Build Environment
  const [environmentStatus, setEnvironmentStatus] = useState<BuildEnvironmentStatus | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [currentBuildPhase, setCurrentBuildPhase] = useState<BuildStepPhase | null>(null);
  const [buildLogs, setBuildLogs] = useState<BuildLogEntry[]>([]);

  // Devices & ADB State (Tahap 4 Real Devices)
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [adbAvailable, setAdbAvailable] = useState<boolean>(false);
  const [adbLimitationReason, setAdbLimitationReason] = useState<string>('');
  const [isRefreshingDevices, setIsRefreshingDevices] = useState<boolean>(false);
  const [isAppRunning, setIsAppRunning] = useState(false);
  const [runButtonState, setRunButtonState] = useState<string>('Run');

  // Query real ADB devices
  const refreshAdbDevices = async () => {
    setIsRefreshingDevices(true);
    try {
      const status = await AdbService.getStatus();
      setAdbAvailable(status.available);
      setAdbLimitationReason(status.limitationReason || '');

      const devRes = await AdbService.getDevices();
      setDevices(devRes.devices);
      if (devRes.devices.length > 0) {
        if (!selectedDevice || !devRes.devices.some(d => d.id === selectedDevice.id)) {
          setSelectedDevice(devRes.devices[0]);
        }
      } else {
        setSelectedDevice(null);
      }
    } catch (err: any) {
      setAdbAvailable(false);
      setAdbLimitationReason(err.message || 'ADB connection error');
      setDevices([]);
      setSelectedDevice(null);
    } finally {
      setIsRefreshingDevices(false);
    }
  };

  useEffect(() => {
    refreshAdbDevices();
  }, []);

  // Logcat
  const [logcatMessages, setLogcatMessages] = useState<LogcatMessage[]>([
    { id: '1', timestamp: new Date().toLocaleTimeString(), pid: 1420, tid: 1420, level: 'I', tag: 'AndroidStudioMobile', message: 'Workspace initialized for ' + projectConfig.name },
  ]);

  // Modals
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showDeviceManagerModal, setShowDeviceManagerModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDependenciesModal, setShowDependenciesModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGitModal, setShowGitModal] = useState(false);

  // Settings
  const [settings, setSettings] = useState<IdeSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return {
      theme: 'darcula',
      fontSize: 13,
      tabSize: 4,
      autoComplete: true,
      lineNumbers: true,
      wordWrap: false,
      sdkPath: '/workspace/android-sdk',
      jvmArgs: '-Xmx2048m -Dfile.encoding=UTF-8',
      touchKeyboardEnabled: true,
      autosave: '1m',
    };
  });

  // Touch Keyboard Events
  const [touchKeyboardVisible, setTouchKeyboardVisible] = useState(true);
  const [touchInsertAction, setTouchInsertAction] = useState<{ text: string; id: number } | null>(null);
  const [touchKeyAction, setTouchKeyAction] = useState<{ action: string; id: number } | null>(null);

  // Auto-save timer ref
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Save state to localStorage whenever files or config change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FILES, JSON.stringify(files));
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(projectConfig));
  }, [files, projectConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // Fetch build environment on mount & save project to disk backend
  useEffect(() => {
    fetchBuildEnvironment();

    // Push initial project files to server filesystem so real commands have files on disk
    fetch('/api/fs/save-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: projectConfig.name, files }),
    }).catch(err => console.warn('Sync to disk error:', err));
  }, [projectConfig.name]);

  // Open initial file (MainActivity.kt) on mount
  useEffect(() => {
    const mainKt = files.find(f => f.name === 'MainActivity.kt' || f.name === 'MainActivity.java');
    if (mainKt) {
      handleOpenFile(mainKt);
    }
  }, []);

  // Autosave interval handler
  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearInterval(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (!settings.autosave || settings.autosave === 'off') return;

    let intervalMs = 60000;
    if (settings.autosave === '30s') intervalMs = 30000;
    else if (settings.autosave === '1m') intervalMs = 60000;
    else if (settings.autosave === '5m') intervalMs = 300000;

    autosaveTimerRef.current = setInterval(() => {
      handleSaveAll();
    }, intervalMs);

    return () => {
      if (autosaveTimerRef.current) {
        clearInterval(autosaveTimerRef.current);
      }
    };
  }, [settings.autosave, openTabs]);

  // Keyboard shortcut listener (Shift-Shift for Search Everywhere, Ctrl+S for Save)
  useEffect(() => {
    let lastShiftTime = 0;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        const now = Date.now();
        if (now - lastShiftTime < 350) {
          setShowSearchModal(true);
        }
        lastShiftTime = now;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, openTabs, files]);

  // Fetch Build Environment from backend
  const fetchBuildEnvironment = async () => {
    try {
      const res = await fetch('/api/build/environment');
      if (res.ok) {
        const data: BuildEnvironmentStatus = await res.json();
        setEnvironmentStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch build environment:', err);
    }
  };

  // Open File in Tab
  const handleOpenFile = (file: ProjectFile) => {
    // Add to recent files
    setRecentFiles(prev => [file.path, ...prev.filter(p => p !== file.path)].slice(0, 15));

    // Check if already open
    const existing = openTabs.find(t => t.fileId === file.id || t.filePath === file.path);
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      const newTab: EditorTab = {
        id: 'tab-' + Date.now(),
        fileId: file.id,
        fileName: file.name,
        filePath: file.path,
        fileType: file.type,
        content: file.content,
        isModified: false,
        isPinned: false,
        cursorPosition: { line: 1, column: 1 },
      };
      setOpenTabs(prev => [...prev, newTab]);
      setActiveTabId(newTab.id);
    }

    // Toggle layout designer if xml layout
    if (file.name.endsWith('.xml') && file.path.includes('res/layout')) {
      setShowLayoutDesigner(true);
    } else {
      setShowLayoutDesigner(false);
    }
  };

  // Close Tab
  const handleCloseTab = (tabId: string) => {
    setOpenTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      if (activeTabId === tabId) {
        setActiveTabId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
      }
      return filtered;
    });
  };

  const handleCloseOthers = (tabId: string) => {
    setOpenTabs(prev => prev.filter(t => t.id === tabId || t.isPinned));
    setActiveTabId(tabId);
  };

  const handlePinTab = (tabId: string) => {
    setOpenTabs(prev => prev.map(t => t.id === tabId ? { ...t, isPinned: !t.isPinned } : t));
  };

  // Tab Content Change
  const handleTabContentChange = (tabId: string, newContent: string) => {
    setOpenTabs(prev => prev.map(t => {
      if (t.id === tabId) {
        return { ...t, content: newContent, isModified: true };
      }
      return t;
    }));

    // Update in files store as well
    const tab = openTabs.find(t => t.id === tabId);
    if (tab) {
      setFiles(prev => prev.map(f => f.id === tab.fileId ? { ...f, content: newContent } : f));
    }
  };

  // Save Single Tab to Backend FS
  const handleSaveTab = async (tabId: string) => {
    const tab = openTabs.find(t => t.id === tabId);
    if (!tab) return;

    try {
      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectConfig.name,
          relativePath: tab.filePath,
          content: tab.content,
        }),
      });

      setOpenTabs(prev => prev.map(t => t.id === tabId ? { ...t, isModified: false } : t));
      setFiles(prev => prev.map(f => f.id === tab.fileId ? { ...f, content: tab.content } : f));
    } catch (err) {
      console.error('Failed to write file to disk:', err);
    }
  };

  // Save All Dirty Tabs
  const handleSaveAll = async () => {
    const dirtyTabs = openTabs.filter(t => t.isModified);
    for (const tab of dirtyTabs) {
      await handleSaveTab(tab.id);
    }
  };

  // Create new file
  const handleCreateFile = async (name: string, type: FileType, folderPath: string) => {
    const cleanFolder = folderPath.replace(/^\/+|\/+$/g, '');
    const relativePath = cleanFolder ? `${cleanFolder}/${name}` : name;

    // Boilerplate content
    let content = '';
    if (type === 'kotlin') {
      const className = name.replace(/\.kt$/, '');
      content = `package ${projectConfig.packageName}\n\nclass ${className} {\n    // TODO: Implement\n}\n`;
    } else if (type === 'java') {
      const className = name.replace(/\.java$/, '');
      content = `package ${projectConfig.packageName};\n\npublic class ${className} {\n    // TODO: Implement\n}\n`;
    } else if (type === 'xml') {
      content = `<?xml version="1.0" encoding="utf-8"?>\n<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"\n    android:layout_width="match_parent"\n    android:layout_height="match_parent"\n    android:orientation="vertical">\n\n</LinearLayout>\n`;
    } else {
      content = `// ${name}\n`;
    }

    try {
      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectConfig.name,
          relativePath,
          content,
        }),
      });
    } catch (err) {
      console.warn('Backend write failed, saving locally:', err);
    }

    const newFile: ProjectFile = {
      id: 'file-' + Date.now(),
      name,
      path: relativePath,
      content,
      type,
    };

    setFiles(prev => [...prev, newFile]);
    handleOpenFile(newFile);
  };

  // Create new directory
  const handleCreateFolder = async (name: string, parentPath: string) => {
    const cleanParent = parentPath.replace(/^\/+|\/+$/g, '');
    const relativePath = cleanParent ? `${cleanParent}/${name}` : name;

    try {
      await fetch('/api/fs/mkdir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectConfig.name,
          relativePath,
        }),
      });
    } catch (err) {
      console.warn('Backend mkdir failed:', err);
    }

    // Insert a dummy marker file or keep in state
    const placeholderFile: ProjectFile = {
      id: 'file-' + Date.now(),
      name: '.keep',
      path: `${relativePath}/.keep`,
      content: '',
      type: 'other',
    };
    setFiles(prev => [...prev, placeholderFile]);
  };

  // Rename File
  const handleRenameFile = async (fileId: string, newName: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    const pathParts = file.path.split('/');
    pathParts[pathParts.length - 1] = newName;
    const newPath = pathParts.join('/');

    try {
      await fetch('/api/fs/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectConfig.name,
          oldPath: file.path,
          newPath,
        }),
      });
    } catch (err) {
      console.warn('Backend rename failed:', err);
    }

    setFiles(prev => prev.map(f => f.id === fileId ? { ...f, name: newName, path: newPath } : f));
    setOpenTabs(prev => prev.map(t => t.fileId === fileId ? { ...t, fileName: newName, filePath: newPath } : t));
  };

  // Delete file
  const handleDeleteFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      try {
        await fetch('/api/fs/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName: projectConfig.name,
            relativePath: file.path,
          }),
        });
      } catch (err) {
        console.warn('Backend delete failed:', err);
      }
    }

    setFiles(prev => prev.filter(f => f.id !== fileId));
    const tab = openTabs.find(t => t.fileId === fileId);
    if (tab) handleCloseTab(tab.id);
  };

  // Clipboard operations
  const handleCopyFile = (file: ProjectFile) => {
    setClipboard({
      fileId: file.id,
      fileName: file.name,
      filePath: file.path,
      operation: 'copy',
    });
  };

  const handleCutFile = (file: ProjectFile) => {
    setClipboard({
      fileId: file.id,
      fileName: file.name,
      filePath: file.path,
      operation: 'cut',
    });
  };

  const handlePasteFile = async (targetFolder: string) => {
    if (!clipboard) return;
    const sourceFile = files.find(f => f.id === clipboard.fileId);
    if (!sourceFile) return;

    const cleanFolder = targetFolder.replace(/^\/+|\/+$/g, '');
    const newPath = cleanFolder ? `${cleanFolder}/${clipboard.fileName}` : clipboard.fileName;

    if (clipboard.operation === 'copy') {
      const newFile: ProjectFile = {
        id: 'file-' + Date.now(),
        name: clipboard.fileName,
        path: newPath,
        content: sourceFile.content,
        type: sourceFile.type,
      };
      await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: projectConfig.name,
          relativePath: newPath,
          content: sourceFile.content,
        }),
      });
      setFiles(prev => [...prev, newFile]);
    } else if (clipboard.operation === 'cut') {
      await handleRenameFile(sourceFile.id, clipboard.fileName);
      setClipboard(null);
    }
  };

  // Refresh Filesystem
  const handleRefreshFs = async () => {
    await fetchBuildEnvironment();
    try {
      const res = await fetch(`/api/fs/list?projectName=${encodeURIComponent(projectConfig.name)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.files && Array.isArray(data.files) && data.files.length > 0) {
          // Sync files
        }
      }
    } catch (err) {
      // fallback
    }
  };

  // Create New Project
  const handleCreateNewProject = (config: ProjectConfig, templateId: string) => {
    setProjectConfig(config);
    const newFiles = generateProjectFiles(config, templateId);
    setFiles(newFiles);
    setOpenTabs([]);
    setActiveTabId(null);
    setShowNewProjectModal(false);

    // Save project on disk
    fetch('/api/fs/save-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: config.name, files: newFiles }),
    }).catch(err => console.warn('Sync new project error:', err));

    // Open MainActivity
    const mainKt = newFiles.find(f => f.name === 'MainActivity.kt' || f.name === 'MainActivity.java');
    if (mainKt) {
      handleOpenFile(mainKt);
    }
  };

  // Real Gradle Build & Toolchain Execution (Tahap 3 Anti-Falsu)
  const handleTriggerBuild = async (task: BuildTaskType = 'assembleDebug') => {
    setIsBuilding(true);
    setBottomTab('build');
    setIsBottomOpen(true);
    setBuildLogs([]);
    setBuildResult(null);

    const startTime = Date.now();
    const ts = () => new Date().toTimeString().split(' ')[0];

    // Log step 1: Environment probe
    setCurrentBuildPhase('INITIALIZATION');
    setBuildLogs(prev => [
      ...prev,
      {
        id: 'log-init-1',
        timestamp: ts(),
        phase: 'INITIALIZATION',
        level: 'info',
        message: `Starting Gradle execution :app:${task}...`,
      },
      {
        id: 'log-init-2',
        timestamp: ts(),
        phase: 'INITIALIZATION',
        level: 'info',
        message: 'Probing Android build toolchain and environment capabilities...',
      }
    ]);

    try {
      // 1. Probing system
      const envRes = await fetch('/api/build/environment');
      const envData: BuildEnvironmentStatus = await envRes.json();
      setEnvironmentStatus(envData);

      // Log toolchain availability
      const jAvail = envData.tools.java.available;
      const gAvail = envData.tools.gradle.available;
      const sdkAvail = envData.tools.androidSdk.available;

      setBuildLogs(prev => [
        ...prev,
        {
          id: 'log-env-java',
          timestamp: ts(),
          phase: 'INITIALIZATION',
          level: jAvail ? 'info' : 'warn',
          message: `JDK / Java: ${jAvail ? `AVAILABLE (${envData.tools.java.version})` : 'NOT AVAILABLE (Requires OpenJDK 17)'}`,
        },
        {
          id: 'log-env-gradle',
          timestamp: ts(),
          phase: 'INITIALIZATION',
          level: gAvail ? 'info' : 'warn',
          message: `Gradle: ${gAvail ? `AVAILABLE (${envData.tools.gradle.version})` : 'NOT AVAILABLE'}`,
        },
        {
          id: 'log-env-sdk',
          timestamp: ts(),
          phase: 'INITIALIZATION',
          level: sdkAvail ? 'info' : 'warn',
          message: `Android SDK: ${sdkAvail ? 'AVAILABLE' : 'NOT AVAILABLE (ANDROID_HOME not configured)'}`,
        },
      ]);

      // If toolchain is incomplete: strictly report BUILD LIMITED BY ENVIRONMENT
      if (!envData.isBuildReady) {
        setBuildLogs(prev => [
          ...prev,
          {
            id: 'log-env-limitation',
            timestamp: ts(),
            phase: 'INITIALIZATION',
            level: 'error',
            message: 'BUILD LIMITED BY ENVIRONMENT: Android/Gradle build toolchain is not available in the current container environment.',
          },
          {
            id: 'log-env-help',
            timestamp: ts(),
            phase: 'INITIALIZATION',
            level: 'warn',
            message: 'To compile native APK packages, install OpenJDK 17, Gradle 8.7+, and Android SDK 34 command line tools, or run on Android hardware with Termux.',
          }
        ]);

        setBuildResult({
          success: false,
          task,
          durationMs: Date.now() - startTime,
          errorSummary: {
            file: 'build.gradle.kts',
            line: 1,
            message: 'BUILD LIMITED BY ENVIRONMENT: Toolchain not available in container sandbox.',
            stackTrace: 'JDK, Gradle, and Android SDK (platforms;android-34) are required to execute Gradle tasks natively.',
          },
        });
        return;
      }

      // If toolchain is available: Execute genuine Gradle build
      setCurrentBuildPhase('COMPILATION');
      const gradRes = await fetch('/api/build/gradle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          projectName: projectConfig.name,
        }),
      });
      const gradData = await gradRes.json();
      setBuildResult(gradData);

      if (gradData.success) {
        setBuildLogs(prev => [
          ...prev,
          {
            id: 'log-success',
            timestamp: ts(),
            phase: 'SIGNING',
            level: 'success',
            message: `BUILD SUCCESSFUL in ${(gradData.durationMs / 1000).toFixed(1)}s.`,
          }
        ]);
      } else {
        setBuildLogs(prev => [
          ...prev,
          {
            id: 'log-failed',
            timestamp: ts(),
            phase: 'COMPILATION',
            level: 'error',
            message: `BUILD FAILED: ${gradData.errorSummary?.message || 'Gradle execution returned non-zero code'}`,
          }
        ]);
      }
    } catch (err: any) {
      setBuildResult({
        success: false,
        task,
        durationMs: Date.now() - startTime,
        errorSummary: {
          file: 'build.gradle.kts',
          line: 1,
          message: err.message || 'Build server connection error',
        }
      });
    } finally {
      setIsBuilding(false);
      setCurrentBuildPhase(null);
    }
  };

  // Tahap 4: Real APK Run & ADB Execution Loop (Strict Anti-Fake)
  const handleRunApp = async () => {
    // 1. Device check
    if (!selectedDevice) {
      setBottomTab('device');
      setIsBottomOpen(true);
      const ts = new Date().toLocaleTimeString();
      setLogcatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: ts,
          pid: 0,
          tid: 0,
          level: 'W',
          tag: 'DeviceManager',
          message: 'Cannot run app: No target device connected. Connect an Android device via USB or Wireless ADB in Device Manager.',
        }
      ]);
      return;
    }

    setBottomTab('logcat');
    setIsBottomOpen(true);
    setRunButtonState('Checking APK...');

    const ts = new Date().toLocaleTimeString();
    setLogcatMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: ts,
        pid: 100,
        tid: 100,
        level: 'I',
        tag: 'DeployTarget',
        message: `Deploying ${projectConfig.name} to target: ${selectedDevice.name} (${selectedDevice.id})...`,
      }
    ]);

    try {
      // 2. Check for real APK
      let apks = await ApkService.listApks(projectConfig.name);
      let targetApk = apks.find(a => a.buildVariant === 'debug') || apks[0];

      if (!targetApk) {
        setRunButtonState('Building APK...');
        setLogcatMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            pid: 100,
            tid: 100,
            level: 'I',
            tag: 'Gradle',
            message: 'No compiled APK found. Running assembleDebug build...',
          }
        ]);

        await handleTriggerBuild('assembleDebug');
        apks = await ApkService.listApks(projectConfig.name);
        targetApk = apks.find(a => a.buildVariant === 'debug') || apks[0];
      }

      if (!targetApk) {
        setRunButtonState('Run');
        setLogcatMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            pid: 100,
            tid: 100,
            level: 'E',
            tag: 'ApkInstaller',
            message: 'ABORT: No installable APK package found. Build assembleDebug must succeed before deployment.',
          }
        ]);
        return;
      }

      // 3. Install APK on device via real ADB
      setRunButtonState('Installing APK...');
      setLogcatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          pid: 100,
          tid: 100,
          level: 'I',
          tag: 'ApkInstaller',
          message: `Streaming APK install to ${selectedDevice.id}: ${targetApk.fileName} (${(targetApk.sizeBytes / 1024 / 1024).toFixed(2)} MB)...`,
        }
      ]);

      const installRes = await AdbService.installApk(selectedDevice.id, targetApk.fullPath, projectConfig.name);
      if (!installRes.success) {
        setRunButtonState('Run');
        setLogcatMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            pid: 100,
            tid: 100,
            level: 'E',
            tag: 'ApkInstaller',
            message: `INSTALLATION FAILED: ${installRes.reason || installRes.error || 'Failed to install APK on device'}`,
          }
        ]);
        return;
      }

      setLogcatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          pid: 100,
          tid: 100,
          level: 'I',
          tag: 'ApkInstaller',
          message: `INSTALL SUCCESSFUL: Package ${projectConfig.packageName} installed on ${selectedDevice.name}`,
        }
      ]);

      // 4. Launch Application
      setRunButtonState('Launching...');
      const launchRes = await AdbService.launchApp(selectedDevice.id, projectConfig.packageName, '.MainActivity');

      if (!launchRes.success) {
        setRunButtonState('Run');
        setLogcatMessages(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            timestamp: new Date().toLocaleTimeString(),
            pid: 100,
            tid: 100,
            level: 'E',
            tag: 'ActivityManager',
            message: `LAUNCH FAILED: ${launchRes.error || 'Activity not found or device refused intent'}`,
          }
        ]);
        return;
      }

      // 5. Genuine execution running
      setIsAppRunning(true);
      setRunButtonState('Running');
      setLogcatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          pid: 2480,
          tid: 2480,
          level: 'I',
          tag: 'ActivityManager',
          message: `START u0 {act=android.intent.action.MAIN cat=[android.intent.category.LAUNCHER] cmp=${projectConfig.packageName}/.MainActivity}`,
        },
        {
          id: (Date.now() + 1).toString(),
          timestamp: new Date().toLocaleTimeString(),
          pid: 2480,
          tid: 2480,
          level: 'D',
          tag: 'MainActivity',
          message: `Application running on ${selectedDevice.name}`,
        }
      ]);

      setBottomTab('device');
    } catch (err: any) {
      setRunButtonState('Run');
      setLogcatMessages(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          pid: 100,
          tid: 100,
          level: 'E',
          tag: 'DeployTarget',
          message: `DEPLOY ERROR: ${err.message || 'Unknown deployment error'}`,
        }
      ]);
    }
  };

  const handleStopApp = async () => {
    if (selectedDevice && isAppRunning) {
      await AdbService.stopApp(selectedDevice.id, projectConfig.packageName);
    }
    setIsAppRunning(false);
    setRunButtonState('Run');
    setLogcatMessages(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        pid: 0,
        tid: 0,
        level: 'I',
        tag: 'ActivityManager',
        message: `Force stopping process: ${projectConfig.packageName}`,
      }
    ]);
  };

  // Add dependency to build.gradle.kts
  const handleAddDependency = (depLine: string) => {
    const gradleFile = files.find(f => f.name === 'build.gradle.kts' || f.name === 'build.gradle');
    if (!gradleFile) return;

    const idx = gradleFile.content.lastIndexOf('dependencies {');
    if (idx !== -1) {
      const closingIdx = gradleFile.content.indexOf('}', idx);
      const updated = gradleFile.content.slice(0, closingIdx) + '    ' + depLine + '\n' + gradleFile.content.slice(closingIdx);
      setFiles(prev => prev.map(f => f.id === gradleFile.id ? { ...f, content: updated } : f));
      
      const tab = openTabs.find(t => t.fileId === gradleFile.id);
      if (tab) {
        handleTabContentChange(tab.id, updated);
      }
    }
  };

  // Active tab file
  const activeTab = openTabs.find(t => t.id === activeTabId) || null;
  const activityXmlFile = files.find(f => f.name === 'activity_main.xml');
  const manifestXmlFile = files.find(f => f.name === 'AndroidManifest.xml');
  const gradleAppFile = files.find(f => f.name === 'build.gradle.kts' || f.name === 'build.gradle');

  return (
    <div className="flex flex-col h-screen w-screen bg-[#1e1f22] text-[#bcbec4] overflow-hidden select-none font-sans">
      {/* 1. Top Menu Bar */}
      <TopMenuBar
        projectName={projectConfig.name}
        onNewProject={() => setShowNewProjectModal(true)}
        onOpenProject={() => setShowNewProjectModal(true)}
        onSave={handleSaveAll}
        onRun={handleRunApp}
        onDebug={handleRunApp}
        onBuild={handleTriggerBuild}
        onOpenTerminal={() => { setBottomTab('terminal'); setIsBottomOpen(true); }}
        onOpenLogcat={() => { setBottomTab('logcat'); setIsBottomOpen(true); }}
        onOpenDeviceManager={() => setShowDeviceManagerModal(true)}
        onOpenSdkManager={() => setShowSettingsModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onSearchEverywhere={() => setShowSearchModal(true)}
        onOpenResourceManager={() => setShowResourceManager(true)}
        onOpenManifestEditor={() => setShowManifestEditor(true)}
        onOpenLayoutEditor={() => setShowLayoutDesigner(true)}
        onOpenGit={() => setShowGitModal(true)}
        onOpenApkManager={() => { setBottomTab('apk'); setIsBottomOpen(true); }}
        toggleSplit={setSplitMode}
      />

      {/* 2. Main Toolbar */}
      <Toolbar
        onNewProject={() => setShowNewProjectModal(true)}
        onOpenProject={() => setShowNewProjectModal(true)}
        onSave={handleSaveAll}
        onUndo={() => setTouchKeyAction({ action: 'undo', id: Date.now() })}
        onRedo={() => setTouchKeyAction({ action: 'redo', id: Date.now() })}
        onSearch={() => setShowSearchModal(true)}
        onRun={handleRunApp}
        onDebug={handleRunApp}
        onStop={handleStopApp}
        onBuild={handleTriggerBuild}
        onSyncGradle={() => handleTriggerBuild('assembleDebug')}
        onToggleTerminal={() => { setBottomTab('terminal'); setIsBottomOpen(!isBottomOpen || bottomTab !== 'terminal'); }}
        onToggleLogcat={() => { setBottomTab('logcat'); setIsBottomOpen(!isBottomOpen || bottomTab !== 'logcat'); }}
        onToggleDeviceManager={() => setShowDeviceManagerModal(true)}
        onToggleSettings={() => setShowSettingsModal(true)}
        onOpenLayoutEditor={() => setShowLayoutDesigner(true)}
        onOpenApkManager={() => { setBottomTab('apk'); setIsBottomOpen(true); }}
        onOpenGit={() => setShowGitModal(true)}
        devices={devices}
        selectedDevice={selectedDevice}
        onSelectDevice={setSelectedDevice}
        isRunning={isAppRunning}
        isBuilding={isBuilding}
        runButtonState={runButtonState}
      />

      {/* 3. Middle Body Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Project Explorer Sidebar */}
        <div className="w-64 sm:w-72 shrink-0 h-full">
          <ProjectExplorer
            files={files}
            activeFileId={activeTab ? activeTab.fileId : null}
            onSelectFile={handleOpenFile}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
            onCopyFile={handleCopyFile}
            onCutFile={handleCutFile}
            onPasteFile={handlePasteFile}
            onRefresh={handleRefreshFs}
            clipboard={clipboard}
            projectName={projectConfig.name}
          />
        </div>

        {/* Center Main Editor & Work Area */}
        <div className="flex-1 flex flex-col h-full bg-[#1e1f22] overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {showLayoutDesigner && activityXmlFile ? (
              <LayoutEditor
                xmlContent={activityXmlFile.content}
                onUpdateXml={(newXml) => {
                  setFiles(prev => prev.map(f => f.id === activityXmlFile.id ? { ...f, content: newXml } : f));
                  const tab = openTabs.find(t => t.fileId === activityXmlFile.id);
                  if (tab) handleTabContentChange(tab.id, newXml);
                }}
                onClose={() => setShowLayoutDesigner(false)}
              />
            ) : showManifestEditor && manifestXmlFile ? (
              <ManifestEditor
                content={manifestXmlFile.content}
                onSaveContent={(newXml) => {
                  setFiles(prev => prev.map(f => f.id === manifestXmlFile.id ? { ...f, content: newXml } : f));
                }}
                onClose={() => setShowManifestEditor(false)}
              />
            ) : showResourceManager ? (
              <ResourceManager
                files={files}
                onUpdateFile={(fileId, content) => {
                  setFiles(prev => prev.map(f => f.id === fileId ? { ...f, content: content } : f));
                }}
                onClose={() => setShowResourceManager(false)}
              />
            ) : (
              <CodeEditor
                tabs={openTabs}
                activeTabId={activeTabId}
                onSelectTab={setActiveTabId}
                onCloseTab={handleCloseTab}
                onCloseOthers={handleCloseOthers}
                onPinTab={handlePinTab}
                onContentChange={handleTabContentChange}
                onSaveTab={handleSaveTab}
                onSaveAll={handleSaveAll}
                splitMode={splitMode}
                onToggleSplit={setSplitMode}
                fontSize={settings.fontSize}
                wordWrap={settings.wordWrap}
                touchInsertAction={touchInsertAction}
                touchKeyAction={touchKeyAction}
              />
            )}
          </div>

          {/* Mobile Touch Programmer Keyboard */}
          {settings.touchKeyboardEnabled && (
            <TouchKeyboard
              isVisible={touchKeyboardVisible}
              onToggleVisibility={() => setTouchKeyboardVisible(!touchKeyboardVisible)}
              onInsertText={(text) => setTouchInsertAction({ text, id: Date.now() })}
              onActionKey={(action) => setTouchKeyAction({ action, id: Date.now() })}
            />
          )}
        </div>
      </div>

      {/* 4. Bottom Dockable Tool Windows (Gradle Build, Terminal, Logcat, Device Simulator) */}
      <div className={`bg-[#18191c] border-t border-[#2b2d30] flex flex-col transition-all duration-200 ${isBottomOpen ? 'h-64 sm:h-72' : 'h-7'}`}>
        {/* Tool Window Bar */}
        <div className="h-7 bg-[#1e1f22] border-b border-[#2b2d30] px-2 flex items-center justify-between text-xs select-none">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => { setBottomTab('build'); setIsBottomOpen(true); }}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 font-medium transition-colors ${
                bottomTab === 'build' && isBottomOpen ? 'bg-[#2b2d30] text-[#3ddc84] font-bold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Hammer className="w-3.5 h-3.5" />
              <span>Gradle Build</span>
              {isBuilding && <span className="w-1.5 h-1.5 rounded-full bg-[#3574f0] animate-pulse" />}
            </button>

            <button
              onClick={() => { setBottomTab('apk'); setIsBottomOpen(true); }}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 font-medium transition-colors ${
                bottomTab === 'apk' && isBottomOpen ? 'bg-[#2b2d30] text-[#3ddc84] font-bold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>APK Manager</span>
            </button>

            <button
              onClick={() => { setBottomTab('logcat'); setIsBottomOpen(true); }}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 font-medium transition-colors ${
                bottomTab === 'logcat' && isBottomOpen ? 'bg-[#2b2d30] text-[#3574f0] font-bold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>Logcat</span>
            </button>

            <button
              onClick={() => { setBottomTab('terminal'); setIsBottomOpen(true); }}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 font-medium transition-colors ${
                bottomTab === 'terminal' && isBottomOpen ? 'bg-[#2b2d30] text-gray-200 font-bold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <TerminalIcon className="w-3.5 h-3.5" />
              <span>Terminal</span>
            </button>

            <button
              onClick={() => { setBottomTab('device'); setIsBottomOpen(true); }}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1.5 font-medium transition-colors ${
                bottomTab === 'device' && isBottomOpen ? 'bg-[#2b2d30] text-[#3ddc84] font-bold' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Running Device</span>
              {isAppRunning && <span className="w-1.5 h-1.5 rounded-full bg-[#3ddc84]" />}
            </button>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsBottomOpen(!isBottomOpen)}
              className="p-1 hover:bg-[#2b2d30] rounded text-gray-400 hover:text-white"
              title={isBottomOpen ? 'Minimize tool window' : 'Expand tool window'}
            >
              {isBottomOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Tool Window Content */}
        {isBottomOpen && (
          <div className="flex-1 overflow-hidden flex">
            {bottomTab === 'build' && (
              <BuildPanel
                buildResult={buildResult}
                isBuilding={isBuilding}
                currentPhase={currentBuildPhase}
                liveLogs={buildLogs}
                onRetryBuild={handleTriggerBuild}
                environmentStatus={environmentStatus}
                onRefreshEnvironment={fetchBuildEnvironment}
              />
            )}
            {bottomTab === 'apk' && (
              <ApkManagerPanel
                projectName={projectConfig.name}
                selectedDevice={selectedDevice}
                onBuildApk={(variant) => handleTriggerBuild(variant === 'release' ? 'assembleRelease' : 'assembleDebug')}
                onSelectDeviceTab={() => setShowDeviceManagerModal(true)}
              />
            )}
            {bottomTab === 'logcat' && (
              <LogcatPanel
                logs={logcatMessages}
                onClearLogs={() => setLogcatMessages([])}
                selectedDevice={selectedDevice}
                onAppendLog={(msg) => setLogcatMessages(prev => [...prev, msg])}
              />
            )}
            {bottomTab === 'terminal' && (
              <TerminalPanel
                projectName={projectConfig.name}
                onRunBuild={() => handleTriggerBuild('assembleDebug')}
              />
            )}
            {bottomTab === 'device' && (
              <DeviceSimulator
                device={selectedDevice}
                config={projectConfig}
                isRunning={isAppRunning}
                onStop={handleStopApp}
                onRestart={handleRunApp}
                onOpenDeviceManager={() => setShowDeviceManagerModal(true)}
                onSendLog={(tag, msg) => {
                  const ts = new Date().toLocaleTimeString();
                  setLogcatMessages(prev => [
                    ...prev,
                    {
                      id: Date.now().toString(),
                      timestamp: ts,
                      pid: 2480,
                      tid: 2480,
                      level: 'D',
                      tag,
                      message: msg,
                    }
                  ]);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* 5. Modals and Dialogs */}
      {showNewProjectModal && (
        <NewProjectModal
          onClose={() => setShowNewProjectModal(false)}
          onCreateProject={handleCreateNewProject}
        />
      )}

      {showDeviceManagerModal && (
        <DeviceManagerModal
          devices={devices}
          selectedDevice={selectedDevice}
          onSelectDevice={setSelectedDevice}
          onClose={() => setShowDeviceManagerModal(false)}
          onRefreshDevices={refreshAdbDevices}
          isRefreshing={isRefreshingDevices}
          adbAvailable={adbAvailable}
          limitationReason={adbLimitationReason}
        />
      )}

      {showSearchModal && (
        <SearchEverywhereModal
          files={files}
          onSelectFile={handleOpenFile}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {showDependenciesModal && (
        <DependenciesModal
          onClose={() => setShowDependenciesModal(false)}
          onAddDependency={handleAddDependency}
          currentGradleContent={gradleAppFile?.content || ''}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          onSaveSettings={setSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showGitModal && (
        <GitPanel
          onClose={() => setShowGitModal(false)}
          projectName={projectConfig.name}
        />
      )}
    </div>
  );
}
