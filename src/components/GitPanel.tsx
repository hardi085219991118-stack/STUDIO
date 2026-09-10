import React, { useState, useEffect } from 'react';
import { 
  GitBranch, GitCommit, RefreshCw, Check, ArrowUpCircle, 
  ArrowDownCircle, Plus, FileCode, Github, FolderGit2, X, 
  AlertTriangle, ShieldAlert, CheckCircle2, ChevronRight,
  GitMerge, Archive, UploadCloud, DownloadCloud, Eye
} from 'lucide-react';
import { GitRepoStatus, GitCommitItem, GitFileChange, GitHubUser, GitHubRepoItem } from '../types';
import { GitService } from '../services/GitService';

interface GitPanelProps {
  onClose: () => void;
  projectName: string;
}

export const GitPanel: React.FC<GitPanelProps> = ({
  onClose,
  projectName,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'diff' | 'history' | 'branches' | 'github'>('status');
  const [repoStatus, setRepoStatus] = useState<GitRepoStatus | null>(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'warn' } | null>(null);

  // Diff
  const [selectedFileForDiff, setSelectedFileForDiff] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState<string>('');
  const [diffIsStaged, setDiffIsStaged] = useState<boolean>(false);

  // History & Branches
  const [commits, setCommits] = useState<GitCommitItem[]>([]);
  const [branches, setBranches] = useState<{ name: string; isCurrent: boolean }[]>([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [mergeBranchName, setMergeBranchName] = useState('');

  // GitHub Integration
  const [githubToken, setGithubToken] = useState(() => localStorage.getItem('asm_github_token') || '');
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [githubRepos, setGithubRepos] = useState<GitHubRepoItem[]>([]);
  const [cloneUrl, setCloneUrl] = useState('');

  // Load Status
  const loadGitStatus = async () => {
    setIsProcessing(true);
    try {
      const status = await GitService.getStatus(projectName);
      setRepoStatus(status);
      if (status.isRepo) {
        const branchList = await GitService.getBranches(projectName);
        setBranches(branchList);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    loadGitStatus();
  }, [projectName]);

  // Load Commits when history tab is active
  useEffect(() => {
    if (activeTab === 'history' && repoStatus?.isRepo) {
      GitService.getLog(projectName).then(setCommits);
    }
  }, [activeTab, repoStatus?.isRepo]);

  // Load Diff
  const viewDiff = async (filePath: string, staged: boolean) => {
    setSelectedFileForDiff(filePath);
    setDiffIsStaged(staged);
    setActiveTab('diff');
    try {
      const diff = await GitService.getDiff(projectName, filePath, staged);
      setDiffContent(diff || '(No diff output or binary file)');
    } catch (err: any) {
      setDiffContent('Error loading diff: ' + err.message);
    }
  };

  // Init Repository
  const handleInitRepo = async () => {
    setIsProcessing(true);
    try {
      const res = await GitService.initRepo(projectName);
      if (res.success) {
        setStatusMsg({ text: 'Initialized new Git repository for ' + projectName, type: 'success' });
        await loadGitStatus();
      } else {
        setStatusMsg({ text: res.error || 'Failed to initialize repository', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Stage All / Single
  const handleStage = async (files: string[]) => {
    setIsProcessing(true);
    try {
      const res = await GitService.stageFiles(projectName, files);
      if (res.success) {
        await loadGitStatus();
      } else {
        setStatusMsg({ text: res.error || 'Failed to stage files', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Unstage All / Single
  const handleUnstage = async (files: string[]) => {
    setIsProcessing(true);
    try {
      const res = await GitService.unstageFiles(projectName, files);
      if (res.success) {
        await loadGitStatus();
      } else {
        setStatusMsg({ text: res.error || 'Failed to unstage files', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Commit
  const handleCommit = async (force: boolean = false) => {
    if (!commitMessage.trim()) {
      setStatusMsg({ text: 'Please enter a valid commit message', type: 'warn' });
      return;
    }
    setIsProcessing(true);
    try {
      const res = await GitService.commit(projectName, commitMessage, force);
      if (res.success) {
        setStatusMsg({ text: 'Committed successfully: ' + commitMessage, type: 'success' });
        setCommitMessage('');
        await loadGitStatus();
      } else if (res.secretDetected) {
        setStatusMsg({
          text: `Commit Blocked: Detected secret tokens (${res.secrets?.join(', ')}). Protect sensitive keys or use force commit.`,
          type: 'error',
        });
      } else {
        setStatusMsg({ text: res.error || 'Commit failed', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Branch operations
  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    setIsProcessing(true);
    try {
      const res = await GitService.createBranch(projectName, newBranchName);
      if (res.success) {
        setStatusMsg({ text: `Created and checked out branch: ${newBranchName}`, type: 'success' });
        setNewBranchName('');
        await loadGitStatus();
      } else {
        setStatusMsg({ text: res.error || 'Failed to create branch', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckoutBranch = async (name: string) => {
    setIsProcessing(true);
    try {
      const res = await GitService.checkoutBranch(projectName, name);
      if (res.success) {
        setStatusMsg({ text: `Switched to branch: ${name}`, type: 'success' });
        await loadGitStatus();
      } else {
        setStatusMsg({ text: res.error || 'Failed to checkout branch', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMergeBranch = async () => {
    if (!mergeBranchName.trim()) return;
    setIsProcessing(true);
    try {
      const res = await GitService.mergeBranch(projectName, mergeBranchName);
      if (res.success) {
        setStatusMsg({ text: `Merged branch ${mergeBranchName} successfully!`, type: 'success' });
        await loadGitStatus();
      } else if (res.hasConflicts) {
        setStatusMsg({ text: `Merge conflict in files: ${res.conflictFiles?.join(', ')}`, type: 'warn' });
        await loadGitStatus();
      } else {
        setStatusMsg({ text: res.error || 'Merge failed', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Push / Pull / Stash
  const handlePush = async () => {
    setIsProcessing(true);
    try {
      const res = await GitService.push(projectName);
      if (res.success) {
        setStatusMsg({ text: 'Pushed commits to remote repository.', type: 'success' });
        await loadGitStatus();
      } else {
        setStatusMsg({ text: res.error || 'Push failed. Check remote configuration.', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePull = async () => {
    setIsProcessing(true);
    try {
      const res = await GitService.pull(projectName);
      if (res.success) {
        setStatusMsg({ text: 'Pulled latest changes from remote repository.', type: 'success' });
        await loadGitStatus();
      } else {
        setStatusMsg({ text: res.error || 'Pull failed. Check network or remote.', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  // GitHub Auth
  const handleVerifyGithubToken = async () => {
    if (!githubToken.trim()) return;
    setIsProcessing(true);
    try {
      const res = await GitService.verifyGitHubToken(githubToken);
      if (res.success && res.user) {
        setGithubUser(res.user);
        localStorage.setItem('asm_github_token', githubToken);
        const reposRes = await GitService.getGitHubRepos(githubToken);
        if (reposRes.repos) setGithubRepos(reposRes.repos);
        setStatusMsg({ text: `Authenticated as @${res.user.login}`, type: 'success' });
      } else {
        setStatusMsg({ text: res.error || 'Invalid GitHub token', type: 'error' });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 select-none backdrop-blur-xs">
      <div className="bg-[#1e1f22] border border-[#393b40] rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] text-xs">
        {/* Header */}
        <div className="bg-[#18191c] border-b border-[#2b2d30] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderGit2 className="w-4 h-4 text-[#3574f0]" />
            <span className="font-bold text-white text-sm">Git Version Control</span>
            {repoStatus?.isRepo && (
              <span className="text-[11px] bg-[#2b2d30] text-gray-300 px-2 py-0.5 rounded font-mono flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-[#3ddc84]" />
                {repoStatus.currentBranch || 'main'}
                {repoStatus.ahead > 0 && <span className="text-[#3ddc84]">↑{repoStatus.ahead}</span>}
                {repoStatus.behind > 0 && <span className="text-amber-400">↓{repoStatus.behind}</span>}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#2b2d30] text-gray-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-[#2b2d30] border-b border-[#393b40] px-3 font-mono text-[11px] overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 ${
              activeTab === 'status' ? 'border-[#3574f0] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Changes ({repoStatus?.changedFiles?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('diff')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 ${
              activeTab === 'diff' ? 'border-[#3574f0] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Diff Viewer
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 ${
              activeTab === 'history' ? 'border-[#3574f0] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Commit Log
          </button>
          <button
            onClick={() => setActiveTab('branches')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 ${
              activeTab === 'branches' ? 'border-[#3574f0] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Branches & Merge
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'github' ? 'border-[#3574f0] text-white' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub Sync</span>
          </button>
        </div>

        {/* Status banner */}
        {statusMsg && (
          <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
            statusMsg.type === 'success' 
              ? 'bg-[#3ddc84]/15 border-[#3ddc84]/30 text-[#3ddc84]' 
              : statusMsg.type === 'error'
              ? 'bg-red-500/15 border-red-500/30 text-red-300'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
          }`}>
            <span className="font-medium">{statusMsg.text}</span>
            <button onClick={() => setStatusMsg(null)} className="text-gray-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab contents */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: CHANGES & COMMIT */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              {!repoStatus?.isRepo ? (
                <div className="bg-[#18191c] border border-dashed border-[#393b40] rounded-xl p-8 text-center flex flex-col items-center">
                  <FolderGit2 className="w-12 h-12 text-gray-600 mb-3 stroke-[1.5]" />
                  <div className="text-white font-bold text-sm mb-1">Git Repository Not Initialized</div>
                  <p className="text-xs text-gray-400 max-w-sm mb-4">
                    This project does not have a local Git version control repository yet.
                  </p>
                  <button
                    onClick={handleInitRepo}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded bg-[#3574f0] hover:bg-[#2662db] text-white font-semibold text-xs flex items-center space-x-2 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Initialize Git Repository</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: Staged & Unstaged Lists */}
                  <div className="space-y-3">
                    {/* Staged Changes */}
                    <div className="bg-[#18191c] border border-[#2b2d30] rounded-lg overflow-hidden">
                      <div className="bg-[#212226] px-3 py-1.5 flex items-center justify-between text-[11px] font-semibold text-gray-300">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#3ddc84]" />
                          <span>Staged Changes ({repoStatus.stagedFiles.length})</span>
                        </span>
                        {repoStatus.stagedFiles.length > 0 && (
                          <button
                            onClick={() => handleUnstage(['all'])}
                            className="text-[#3574f0] hover:text-white font-normal"
                          >
                            Unstage All
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-[#2b2d30]/60 max-h-40 overflow-y-auto">
                        {repoStatus.stagedFiles.length === 0 ? (
                          <div className="p-3 text-center text-gray-500 text-[11px]">No files staged for commit.</div>
                        ) : (
                          repoStatus.stagedFiles.map((file) => (
                            <div key={file.path} className="px-3 py-1.5 flex items-center justify-between hover:bg-[#232428] text-xs">
                              <span className="text-white truncate font-mono text-[11px]">{file.path}</span>
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  onClick={() => viewDiff(file.path, true)}
                                  className="p-1 rounded hover:bg-[#2b2d30] text-gray-400 hover:text-white"
                                  title="View unified diff"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleUnstage([file.path])}
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-[#2b2d30] text-gray-300 hover:text-white"
                                >
                                  -
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Unstaged / Untracked Changes */}
                    <div className="bg-[#18191c] border border-[#2b2d30] rounded-lg overflow-hidden">
                      <div className="bg-[#212226] px-3 py-1.5 flex items-center justify-between text-[11px] font-semibold text-gray-300">
                        <span>Changes ({repoStatus.unstagedFiles.length + repoStatus.untrackedFiles.length})</span>
                        {(repoStatus.unstagedFiles.length > 0 || repoStatus.untrackedFiles.length > 0) && (
                          <button
                            onClick={() => handleStage(['all'])}
                            className="text-[#3ddc84] hover:text-white font-normal"
                          >
                            Stage All
                          </button>
                        )}
                      </div>
                      <div className="divide-y divide-[#2b2d30]/60 max-h-48 overflow-y-auto">
                        {repoStatus.unstagedFiles.length === 0 && repoStatus.untrackedFiles.length === 0 ? (
                          <div className="p-3 text-center text-gray-500 text-[11px]">Working tree clean.</div>
                        ) : (
                          [...repoStatus.unstagedFiles, ...repoStatus.untrackedFiles].map((file) => (
                            <div key={file.path} className="px-3 py-1.5 flex items-center justify-between hover:bg-[#232428] text-xs">
                              <span className="text-gray-300 truncate font-mono text-[11px]">{file.path}</span>
                              <div className="flex items-center space-x-1 shrink-0">
                                <button
                                  onClick={() => viewDiff(file.path, false)}
                                  className="p-1 rounded hover:bg-[#2b2d30] text-gray-400 hover:text-white"
                                  title="View unified diff"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleStage([file.path])}
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-[#3ddc84]/20 text-[#3ddc84] hover:bg-[#3ddc84] hover:text-black font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Commit Box & Quick Actions */}
                  <div className="bg-[#18191c] border border-[#2b2d30] rounded-lg p-4 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="text-white font-semibold text-xs mb-1">Commit Staged Changes</div>
                      <p className="text-[11px] text-gray-400 mb-2">
                        Automatic secret scanning protects your API keys and tokens from accidental commit.
                      </p>
                      <textarea
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="Commit message (e.g. Implement user login layout)..."
                        rows={4}
                        className="w-full bg-[#141517] border border-[#393b40] rounded p-2 text-white font-mono text-xs focus:outline-none focus:border-[#3574f0] resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleCommit(false)}
                          disabled={isProcessing || !commitMessage.trim()}
                          className="flex-1 px-3 py-2 rounded bg-[#3574f0] hover:bg-[#2662db] text-white font-semibold flex items-center justify-center space-x-1.5 disabled:opacity-40 transition-colors shadow-sm"
                        >
                          <GitCommit className="w-3.5 h-3.5" />
                          <span>Commit</span>
                        </button>
                        <button
                          onClick={() => handleCommit(true)}
                          disabled={isProcessing || !commitMessage.trim()}
                          className="px-3 py-2 rounded bg-[#2b2d30] hover:bg-[#35373c] text-gray-300 hover:text-white border border-[#393b40] text-[11px] transition-colors"
                          title="Force commit (bypass token scanning if false positive)"
                        >
                          Force
                        </button>
                      </div>

                      {/* Remote Push / Pull bar */}
                      <div className="pt-2 border-t border-[#2b2d30] flex items-center justify-between">
                        <button
                          onClick={handlePull}
                          disabled={isProcessing}
                          className="px-2.5 py-1.5 rounded bg-[#2b2d30] hover:bg-[#35373c] text-gray-300 hover:text-white border border-[#393b40] flex items-center space-x-1.5 transition-colors"
                        >
                          <DownloadCloud className="w-3.5 h-3.5 text-[#3574f0]" />
                          <span>Pull</span>
                        </button>
                        <button
                          onClick={handlePush}
                          disabled={isProcessing}
                          className="px-2.5 py-1.5 rounded bg-[#2b2d30] hover:bg-[#35373c] text-gray-300 hover:text-white border border-[#393b40] flex items-center space-x-1.5 transition-colors"
                        >
                          <UploadCloud className="w-3.5 h-3.5 text-[#3ddc84]" />
                          <span>Push</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DIFF VIEWER */}
          {activeTab === 'diff' && (
            <div className="space-y-3 flex flex-col h-full">
              <div className="flex items-center justify-between">
                <span className="font-mono text-white text-xs font-semibold flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-[#3574f0]" />
                  <span>{selectedFileForDiff ? `${selectedFileForDiff} (${diffIsStaged ? 'Staged' : 'Working Tree'})` : 'Entire Diff'}</span>
                </span>
                <button
                  onClick={() => setActiveTab('status')}
                  className="text-[#3574f0] hover:text-white text-[11px]"
                >
                  ← Back to Changes
                </button>
              </div>

              <div className="bg-[#141517] border border-[#2b2d30] rounded-lg p-3 font-mono text-[11px] text-gray-300 h-80 overflow-y-auto whitespace-pre">
                {diffContent ? (
                  diffContent.split('\n').map((line, idx) => {
                    const isAdd = line.startsWith('+') && !line.startsWith('+++');
                    const isDel = line.startsWith('-') && !line.startsWith('---');
                    const isHeader = line.startsWith('@@') || line.startsWith('diff ');
                    return (
                      <div
                        key={idx}
                        className={
                          isAdd
                            ? 'bg-[#3ddc84]/15 text-[#3ddc84]'
                            : isDel
                            ? 'bg-red-500/15 text-red-300'
                            : isHeader
                            ? 'text-[#3574f0] font-bold'
                            : ''
                        }
                      >
                        {line}
                      </div>
                    );
                  })
                ) : (
                  <span className="text-gray-500">No diff to display. Select a modified file from Changes tab.</span>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: COMMIT LOG (HISTORY) */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-xs">Commit History</h3>
                <span className="text-gray-400 text-[11px] font-mono">{commits.length} commits</span>
              </div>

              <div className="bg-[#18191c] border border-[#2b2d30] rounded-lg divide-y divide-[#2b2d30]">
                {commits.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-xs">No commits recorded yet.</div>
                ) : (
                  commits.map((commit) => (
                    <div key={commit.hash} className="p-3 hover:bg-[#202125] transition-colors flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-white text-xs">{commit.message}</div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                          by <span className="text-gray-300">{commit.author}</span> • {commit.date}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-[#2b2d30] text-gray-300 rounded shrink-0">
                        {commit.hash}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: BRANCHES & MERGE */}
          {activeTab === 'branches' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Branch list */}
                <div className="bg-[#18191c] border border-[#2b2d30] rounded-lg p-3 space-y-3">
                  <div className="text-white font-semibold text-xs">Active Branches</div>
                  <div className="space-y-1.5">
                    {branches.map((b) => (
                      <div
                        key={b.name}
                        className={`p-2 rounded flex items-center justify-between text-xs font-mono ${
                          b.isCurrent ? 'bg-[#2b2d30] text-[#3ddc84] font-bold' : 'text-gray-300 hover:bg-[#202125]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5" />
                          <span>{b.name}</span>
                        </span>
                        {!b.isCurrent && (
                          <button
                            onClick={() => handleCheckoutBranch(b.name)}
                            className="px-2 py-0.5 rounded bg-[#212226] text-gray-300 hover:text-white text-[10px]"
                          >
                            Checkout
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Create & Merge Controls */}
                <div className="space-y-3">
                  <div className="bg-[#18191c] border border-[#2b2d30] rounded-lg p-3 space-y-2">
                    <div className="text-white font-semibold text-xs">Create New Branch</div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        placeholder="feature/login-screen"
                        className="flex-1 bg-[#141517] border border-[#393b40] rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#3574f0]"
                      />
                      <button
                        onClick={handleCreateBranch}
                        disabled={isProcessing || !newBranchName.trim()}
                        className="px-3 py-1 rounded bg-[#3574f0] text-white font-semibold text-xs disabled:opacity-40"
                      >
                        Create
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#18191c] border border-[#2b2d30] rounded-lg p-3 space-y-2">
                    <div className="text-white font-semibold text-xs">Merge Branch into Current</div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={mergeBranchName}
                        onChange={(e) => setMergeBranchName(e.target.value)}
                        placeholder="branch to merge"
                        className="flex-1 bg-[#141517] border border-[#393b40] rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#3574f0]"
                      />
                      <button
                        onClick={handleMergeBranch}
                        disabled={isProcessing || !mergeBranchName.trim()}
                        className="px-3 py-1 rounded bg-[#3ddc84] text-black font-semibold text-xs disabled:opacity-40"
                      >
                        Merge
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: GITHUB INTEGRATION */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-white font-semibold text-xs">GitHub Authentication & Sync</h3>
                <p className="text-[11px] text-gray-400">
                  Connect via Personal Access Token (PAT) with repo scope to push, pull, and clone repositories.
                </p>
              </div>

              {!githubUser ? (
                <div className="bg-[#18191c] border border-[#2b2d30] rounded-lg p-4 space-y-3">
                  <label className="block text-[11px] text-gray-300 font-mono">
                    GitHub Personal Access Token (PAT)
                  </label>
                  <input
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-[#141517] border border-[#393b40] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#3574f0]"
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-gray-500">Stored safely in client-side secure local storage.</span>
                    <button
                      onClick={handleVerifyGithubToken}
                      disabled={isProcessing || !githubToken.trim()}
                      className="px-4 py-1.5 rounded bg-[#3574f0] hover:bg-[#2662db] text-white font-semibold flex items-center space-x-1.5 disabled:opacity-40 transition-colors shadow-sm"
                    >
                      <Github className="w-3.5 h-3.5" />
                      <span>Connect GitHub</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* User Profile Card */}
                  <div className="bg-[#18191c] border border-[#2b2d30] rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {githubUser.avatar_url && (
                        <img
                          src={githubUser.avatar_url}
                          alt={githubUser.login}
                          className="w-10 h-10 rounded-full border border-[#393b40]"
                        />
                      )}
                      <div>
                        <div className="text-white font-bold text-sm">@{githubUser.login}</div>
                        <div className="text-[11px] text-gray-400">{githubUser.public_repos} public repositories</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setGithubUser(null);
                        localStorage.removeItem('asm_github_token');
                      }}
                      className="px-2.5 py-1 rounded bg-[#2b2d30] hover:bg-[#35373c] text-gray-300 hover:text-white border border-[#393b40]"
                    >
                      Disconnect
                    </button>
                  </div>

                  {/* Remote Repositories list */}
                  <div className="bg-[#18191c] border border-[#2b2d30] rounded-lg p-3 space-y-2">
                    <div className="text-white font-semibold text-xs">Your GitHub Repositories</div>
                    <div className="max-h-52 overflow-y-auto divide-y divide-[#2b2d30]">
                      {githubRepos.map((r) => (
                        <div key={r.id} className="py-2 flex items-center justify-between hover:bg-[#202125] px-2 rounded">
                          <div>
                            <div className="font-semibold text-white text-xs">{r.name}</div>
                            <div className="text-[10px] text-gray-400">{r.html_url}</div>
                          </div>
                          <span className="text-[10px] text-gray-500 font-mono">{r.default_branch}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
