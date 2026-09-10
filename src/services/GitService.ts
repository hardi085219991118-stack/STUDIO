import { GitRepoStatus, GitCommitItem, GitHubUser, GitHubRepoItem } from '../types';

export class GitService {
  static async getStatus(projectName: string): Promise<GitRepoStatus> {
    try {
      const res = await fetch(`/api/git/status?projectName=${encodeURIComponent(projectName)}`);
      return await res.json();
    } catch (err: any) {
      return {
        isRepo: false,
        isClean: true,
        ahead: 0,
        behind: 0,
        changedFiles: [],
        stagedFiles: [],
        unstagedFiles: [],
        untrackedFiles: [],
        conflicts: [],
      };
    }
  }

  static async initRepo(
    projectName: string,
    userName?: string,
    userEmail?: string
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      const res = await fetch('/api/git/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, userName, userEmail }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async stageFiles(projectName: string, files: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/git/stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, files }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async unstageFiles(projectName: string, files: string[]): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/git/unstage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, files }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async commit(
    projectName: string,
    message: string,
    force?: boolean
  ): Promise<{ success: boolean; message?: string; secretDetected?: boolean; secrets?: string[]; error?: string }> {
    try {
      const res = await fetch('/api/git/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, message, force }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async getDiff(projectName: string, file?: string, staged?: boolean): Promise<string> {
    try {
      const query = new URLSearchParams({ projectName });
      if (file) query.append('file', file);
      if (staged) query.append('staged', 'true');
      const res = await fetch(`/api/git/diff?${query.toString()}`);
      const data = await res.json();
      return data.diff || '';
    } catch (err) {
      return '';
    }
  }

  static async getLog(projectName: string, maxCount: number = 30): Promise<GitCommitItem[]> {
    try {
      const res = await fetch(`/api/git/log?projectName=${encodeURIComponent(projectName)}&maxCount=${maxCount}`);
      const data = await res.json();
      return data.commits || [];
    } catch (err) {
      return [];
    }
  }

  static async getBranches(projectName: string): Promise<{ name: string; isCurrent: boolean }[]> {
    try {
      const res = await fetch(`/api/git/branches?projectName=${encodeURIComponent(projectName)}`);
      const data = await res.json();
      return data.branches || [];
    } catch (err) {
      return [];
    }
  }

  static async createBranch(projectName: string, branchName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/git/create-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, branchName }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async checkoutBranch(projectName: string, branchName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/git/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, branchName }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async mergeBranch(
    projectName: string,
    branchName: string
  ): Promise<{ success: boolean; hasConflicts?: boolean; conflictFiles?: string[]; error?: string }> {
    try {
      const res = await fetch('/api/git/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, branchName }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async abortMerge(projectName: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch('/api/git/abort-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName }),
      });
      return await res.json();
    } catch (err) {
      return { success: false };
    }
  }

  static async stash(
    projectName: string,
    action: 'push' | 'pop' | 'list' | 'drop',
    message?: string
  ): Promise<{ success: boolean; output?: string }> {
    try {
      const res = await fetch('/api/git/stash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, action, message }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, output: err.message };
    }
  }

  static async getRemotes(projectName: string): Promise<{ name: string; url: string; type: string }[]> {
    try {
      const res = await fetch(`/api/git/remotes?projectName=${encodeURIComponent(projectName)}`);
      const data = await res.json();
      return data.remotes || [];
    } catch (err) {
      return [];
    }
  }

  static async addRemote(projectName: string, name: string, url: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetch('/api/git/add-remote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, name, url }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async pull(projectName: string, remote?: string, branch?: string): Promise<{ success: boolean; output?: string; error?: string }> {
    try {
      const res = await fetch('/api/git/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, remote, branch }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async push(projectName: string, remote?: string, branch?: string): Promise<{ success: boolean; output?: string; error?: string }> {
    try {
      const res = await fetch('/api/git/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName, remote, branch }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async clone(url: string, targetProjectName?: string): Promise<{ success: boolean; projectName?: string; error?: string }> {
    try {
      const res = await fetch('/api/git/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, targetProjectName }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async verifyGitHubToken(token: string): Promise<{ success: boolean; user?: GitHubUser; error?: string }> {
    try {
      const res = await fetch('/api/git/github/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async getGitHubRepos(token: string): Promise<{ success: boolean; repos?: GitHubRepoItem[]; error?: string }> {
    try {
      const res = await fetch('/api/git/github/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
