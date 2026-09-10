export type FileType = 'kotlin' | 'java' | 'xml' | 'gradle' | 'json' | 'markdown' | 'c_cpp' | 'text' | 'image' | 'other';

export interface ProjectFile {
  id: string;
  name: string;
  path: string; // Relative to project root, e.g. "app/src/main/java/com/androidstudiomobile/ide/MainActivity.kt"
  content: string;
  type: FileType;
  isFolder?: boolean;
  children?: ProjectFile[];
  parentId?: string | null;
  size?: number;
  lastModified?: number;
}

export type ProjectViewMode = 'android' | 'project' | 'packages';

export interface EditorTab {
  id: string;
  fileId?: string;
  filePath: string;
  fileName: string;
  fileType: FileType;
  content: string;
  isModified: boolean;
  cursorLine?: number;
  cursorCol?: number;
  cursorPosition?: { line: number; column: number };
  selection?: { start: number; end: number };
  scrollPosition?: { top: number; left: number };
  isPinned?: boolean;
}

export type SplitMode = 'none' | 'vertical' | 'horizontal';

export type BuildTaskType = 'assembleDebug' | 'assembleRelease' | 'clean' | 'build' | 'test' | 'lint';

export type BuildStepPhase = 'INITIALIZATION' | 'CONFIGURATION' | 'COMPILATION' | 'AAPT' | 'DEX' | 'PACKAGING' | 'SIGNING' | 'SUCCESS' | 'FAILED';

export interface BuildLogEntry {
  id: string;
  timestamp: string;
  phase: BuildStepPhase;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  filePath?: string;
  lineNumber?: number;
}

export interface BuildResult {
  success: boolean;
  task: BuildTaskType;
  durationMs: number;
  apkPath?: string;
  apkName?: string;
  apkSizeFormatted?: string;
  apkSizeBytes?: number;
  logs: BuildLogEntry[];
  errorSummary?: {
    file: string;
    line: number;
    message: string;
    stackTrace: string;
  };
}

export type LogLevel = 'V' | 'D' | 'I' | 'W' | 'E' | 'F';

export interface LogcatMessage {
  id: string;
  timestamp: string;
  pid: number;
  tid: number;
  level: LogLevel;
  tag: string;
  message: string;
}

export type DeviceConnectionStatus = 'ONLINE' | 'OFFLINE' | 'UNAUTHORIZED' | 'DISCONNECTED' | 'CONNECTING' | 'ERROR' | 'LIMITED';

export interface DeviceInfo {
  id: string;
  serial?: string;
  name: string;
  model?: string;
  manufacturer?: string;
  androidVersion: string;
  apiLevel: number;
  architecture: string;
  connectionType: 'USB' | 'Wireless ADB' | 'Virtual Device' | 'Emulator';
  ipAddress?: string;
  port?: number;
  status: DeviceConnectionStatus;
  batteryLevel?: number;
  screenResolution?: string;
  density?: string;
  availableStorage?: string;
  isDefault?: boolean;
}

export type ApkValidationStatus = 'NOT_FOUND' | 'FOUND' | 'UNVERIFIED' | 'VALIDATED' | 'INVALID' | 'LIMITED_BY_ENVIRONMENT';

export interface ApkInfo {
  fileName: string;
  relativePath: string;
  fullPath: string;
  sizeBytes: number;
  sizeFormatted: string;
  buildVariant: 'debug' | 'release' | string;
  packageName: string;
  versionName: string;
  versionCode: number | string;
  buildTime: string;
  status: ApkValidationStatus;
  isValid: boolean;
  validationDetails?: {
    hasZipMagic: boolean;
    hasManifest?: boolean;
    hasDex?: boolean;
    apksignerVerified?: boolean;
    minSdk?: number | string;
    targetSdk?: number | string;
    validationMethod?: string;
    reason?: string;
  };
}

export interface RunConfiguration {
  id: string;
  name: string;
  module: string;
  buildVariant: 'debug' | 'release';
  targetDeviceId?: string;
  launchMode: 'DEFAULT_ACTIVITY' | 'SPECIFIED_ACTIVITY';
  specifiedActivity?: string;
}

export type RunButtonState = 'READY' | 'BUILDING' | 'INSTALLING' | 'LAUNCHING' | 'RUNNING' | 'FAILED' | 'STOPPED' | 'NO_DEVICE';

export interface GitFileChange {
  path: string;
  status: 'M' | 'A' | 'D' | 'R' | '?' | 'C';
  statusLabel: 'Modified' | 'Added' | 'Deleted' | 'Renamed' | 'Untracked' | 'Conflict';
  isStaged: boolean;
  oldPath?: string;
}

export interface GitRepoStatus {
  isRepo: boolean;
  rootPath?: string;
  currentBranch?: string;
  remoteUrl?: string;
  isClean: boolean;
  ahead: number;
  behind: number;
  changedFiles: GitFileChange[];
  stagedFiles: GitFileChange[];
  unstagedFiles: GitFileChange[];
  untrackedFiles: GitFileChange[];
  conflicts: string[];
}

export interface GitCommitItem {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitHubUser {
  login: string;
  avatar_url?: string;
  name?: string;
  html_url?: string;
  public_repos?: number;
}

export interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description?: string;
  default_branch: string;
  updated_at: string;
}

export interface LayoutNode {
  id: string;
  tag: 'LinearLayout' | 'ConstraintLayout' | 'FrameLayout' | 'ScrollView' | 'CardView' | 'RecyclerView' | 'TextView' | 'Button' | 'EditText' | 'ImageView' | 'Switch' | 'CheckBox' | 'RadioButton' | 'ProgressBar' | 'FloatingActionButton';
  attributes: Record<string, string>;
  children?: LayoutNode[];
}

export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked';
  isStaged: boolean;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultLanguage: 'Kotlin' | 'Java';
  minSdk: number;
  targetSdk: number;
  compileSdk: number;
}

export interface ProjectConfig {
  id: string;
  name: string;
  packageName: string;
  language: 'Kotlin' | 'Java';
  buildSystem: 'Gradle (Kotlin DSL)' | 'Gradle (Groovy)';
  minSdk: number;
  targetSdk: number;
  compileSdk: number;
  versionName: string;
  versionCode: number;
  lastOpened: number;
}

export type BottomPanelTab = 'terminal' | 'logcat' | 'build' | 'git' | 'problems' | 'appRunner' | 'apk' | 'adb';
export type BottomToolTab = 'terminal' | 'logcat' | 'build' | 'device' | 'git' | 'problems' | 'apk' | 'adb';

export type AutosaveOption = 'off' | '30s' | '1m' | '5m';

export interface FileClipboard {
  fileId: string;
  fileName: string;
  filePath: string;
  operation: 'copy' | 'cut';
}

export interface RecentItem {
  id: string;
  name: string;
  path: string;
  timestamp: number;
}

export interface BuildToolInfo {
  available: boolean;
  version?: string;
  path?: string;
  requiredVersion?: string;
}

export interface BuildEnvironmentStatus {
  platform: string;
  arch: string;
  nodeVersion: string;
  isBuildReady: boolean;
  limitationReason?: string;
  status: 'READY_FOR_ANDRIOD_BUILD' | 'BUILD_TOOLCHAIN_INCOMPLETE';
  tools: {
    java: BuildToolInfo;
    gradle: BuildToolInfo;
    androidSdk: { available: boolean; path: string; compileSdk: number };
    aapt2: BuildToolInfo;
    d8: BuildToolInfo;
    adb: BuildToolInfo;
  };
}

export interface IdeSettings {
  theme: 'darcula' | 'dark' | 'light' | 'high_contrast';
  fontSize: number;
  tabSize: number;
  autoComplete: boolean;
  lineNumbers: boolean;
  wordWrap: boolean;
  autosave?: AutosaveOption;
  sdkPath: string;
  jvmArgs: string;
  touchKeyboardEnabled: boolean;
}

export type ActiveTool = 'explorer' | 'search' | 'git' | 'run' | 'layout' | 'manifest' | 'resources' | 'sdk' | 'device' | 'settings';
