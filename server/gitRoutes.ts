import { Router } from 'express';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export function createGitRouter(workspaceDir: string): Router {
  const router = Router();

  function runGit(cmd: string, cwd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve) => {
      exec(cmd, { cwd, timeout: 30000, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
          exitCode: error ? (error.code || 1) : 0,
        });
      });
    });
  }

  function getProjectDir(projectName: string): string {
    const safeName = path.basename(projectName || 'MyApplication');
    const pPath = path.join(workspaceDir, safeName);
    if (!fs.existsSync(pPath)) {
      fs.mkdirSync(pPath, { recursive: true });
    }
    return pPath;
  }

  // Common secret regexes to prevent accidental credential leakage
  const SECRET_PATTERNS = [
    { name: 'Google API Key', regex: /AIza[0-9A-Za-z-_]{35}/g },
    { name: 'GitHub Personal Access Token', regex: /ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82}/g },
    { name: 'OpenAI API Key', regex: /sk-[a-zA-Z0-9]{32,}/g },
    { name: 'Private Key', regex: /-----BEGIN PRIVATE KEY-----/g },
  ];

  function scanForSecrets(diffText: string): string[] {
    const found: string[] = [];
    for (const item of SECRET_PATTERNS) {
      if (item.regex.test(diffText)) {
        found.push(item.name);
      }
    }
    return found;
  }

  // 1. Status: Check if repository exists and parse changes
  router.get('/status', async (req, res) => {
    try {
      const { projectName } = req.query;
      const projectDir = getProjectDir(projectName as string);

      const checkRepo = await runGit('git rev-parse --is-inside-work-tree', projectDir);
      if (checkRepo.exitCode !== 0) {
        return res.json({
          success: true,
          isRepo: false,
          message: 'Not a git repository. Click "Initialize Git" to begin tracking files.',
        });
      }

      // Branch
      const branchRes = await runGit('git branch --show-current', projectDir);
      const currentBranch = branchRes.stdout.trim() || 'HEAD (detached)';

      // Remote
      const remoteRes = await runGit('git remote get-url origin', projectDir);
      const remoteUrl = remoteRes.exitCode === 0 ? remoteRes.stdout.trim() : undefined;

      // Status porcelain
      const statusRes = await runGit('git status --porcelain=v1 -uall', projectDir);
      const lines = statusRes.stdout.split('\n').filter(Boolean);

      const stagedFiles: any[] = [];
      const unstagedFiles: any[] = [];
      const untrackedFiles: any[] = [];
      const conflicts: string[] = [];
      const changedFiles: any[] = [];

      for (const line of lines) {
        if (line.length < 3) continue;
        const x = line[0]; // Staging index
        const y = line[1]; // Working tree
        const filePath = line.slice(3).trim();

        const isConflict = (x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D'));
        if (isConflict) {
          conflicts.push(filePath);
          changedFiles.push({ path: filePath, status: 'C', statusLabel: 'Conflict', isStaged: false });
          continue;
        }

        // Untracked
        if (x === '?' && y === '?') {
          untrackedFiles.push({ path: filePath, status: '?', statusLabel: 'Untracked', isStaged: false });
          changedFiles.push({ path: filePath, status: '?', statusLabel: 'Untracked', isStaged: false });
          continue;
        }

        // Staged changes (X is M, A, D, R, C)
        if (x !== ' ' && x !== '?') {
          const label = x === 'M' ? 'Modified' : x === 'A' ? 'Added' : x === 'D' ? 'Deleted' : x === 'R' ? 'Renamed' : 'Copied';
          stagedFiles.push({ path: filePath, status: x, statusLabel: label, isStaged: true });
        }

        // Unstaged changes (Y is M, D)
        if (y !== ' ' && y !== '?') {
          const label = y === 'M' ? 'Modified' : y === 'D' ? 'Deleted' : 'Changed';
          unstagedFiles.push({ path: filePath, status: y, statusLabel: label, isStaged: false });
          changedFiles.push({ path: filePath, status: y, statusLabel: label, isStaged: false });
        }
      }

      // Check ahead / behind if upstream tracking branch exists
      let ahead = 0;
      let behind = 0;
      const countRes = await runGit('git rev-list --left-right --count HEAD...@{u}', projectDir);
      if (countRes.exitCode === 0) {
        const [a, b] = countRes.stdout.trim().split(/\s+/);
        ahead = parseInt(a, 10) || 0;
        behind = parseInt(b, 10) || 0;
      }

      res.json({
        success: true,
        isRepo: true,
        rootPath: projectDir,
        currentBranch,
        remoteUrl,
        isClean: lines.length === 0,
        ahead,
        behind,
        changedFiles,
        stagedFiles,
        unstagedFiles,
        untrackedFiles,
        conflicts,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Init: Initialize repository & configure sensible defaults
  router.post('/init', async (req, res) => {
    try {
      const { projectName, userName, userEmail } = req.body;
      const projectDir = getProjectDir(projectName);

      const initRes = await runGit('git init', projectDir);
      if (initRes.exitCode !== 0) {
        return res.status(500).json({ success: false, error: initRes.stderr });
      }

      // Ensure .gitignore exists for Android
      const gitignorePath = path.join(projectDir, '.gitignore');
      if (!fs.existsSync(gitignorePath)) {
        const defaultGitignore = `*.iml\n.gradle\n/local.properties\n/.idea/\n.DS_Store\n/build\n/captures\n.externalNativeBuild\n.cxx\n`;
        fs.writeFileSync(gitignorePath, defaultGitignore, 'utf-8');
      }

      // Set user.name and user.email if not set
      const uName = userName || 'Android Developer';
      const uEmail = userEmail || 'developer@androidstudio.mobile';
      await runGit(`git config user.name "${uName}"`, projectDir);
      await runGit(`git config user.email "${uEmail}"`, projectDir);

      res.json({
        success: true,
        message: 'Git repository successfully initialized.',
        output: initRes.stdout,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Stage Files (git add)
  router.post('/stage', async (req, res) => {
    try {
      const { projectName, files } = req.body;
      const projectDir = getProjectDir(projectName);

      let addCmd = 'git add -A';
      if (Array.isArray(files) && files.length > 0 && files[0] !== 'all') {
        const fileArgs = files.map((f: string) => `"${f.replace(/"/g, '\\"')}"`).join(' ');
        addCmd = `git add ${fileArgs}`;
      }

      const result = await runGit(addCmd, projectDir);
      if (result.exitCode !== 0) {
        return res.status(400).json({ success: false, error: result.stderr });
      }

      res.json({ success: true, message: 'Files staged successfully.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Unstage Files (git restore --staged)
  router.post('/unstage', async (req, res) => {
    try {
      const { projectName, files } = req.body;
      const projectDir = getProjectDir(projectName);

      let unstageCmd = 'git restore --staged .';
      if (Array.isArray(files) && files.length > 0 && files[0] !== 'all') {
        const fileArgs = files.map((f: string) => `"${f.replace(/"/g, '\\"')}"`).join(' ');
        unstageCmd = `git restore --staged ${fileArgs}`;
      }

      const result = await runGit(unstageCmd, projectDir);
      res.json({ success: result.exitCode === 0, error: result.exitCode !== 0 ? result.stderr : undefined });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Commit with Secret Scanning
  router.post('/commit', async (req, res) => {
    try {
      const { projectName, message, force } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ success: false, error: 'Commit message is required and cannot be empty.' });
      }

      const projectDir = getProjectDir(projectName);

      // Secret Scanning on staged changes
      const diffCached = await runGit('git diff --cached', projectDir);
      const detectedSecrets = scanForSecrets(diffCached.stdout);

      if (detectedSecrets.length > 0 && !force) {
        return res.status(400).json({
          success: false,
          secretDetected: true,
          secrets: detectedSecrets,
          error: `Commit blocked: Detected sensitive credential pattern (${detectedSecrets.join(', ')}). Protect secrets in .env or ignore them before committing.`,
        });
      }

      const safeMsg = message.replace(/"/g, '\\"');
      const commitRes = await runGit(`git commit -m "${safeMsg}"`, projectDir);

      if (commitRes.exitCode !== 0) {
        return res.status(400).json({ success: false, error: commitRes.stderr || commitRes.stdout });
      }

      res.json({
        success: true,
        message: 'Commit completed successfully.',
        output: commitRes.stdout,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Diff: Unified diff
  router.get('/diff', async (req, res) => {
    try {
      const { projectName, file, staged } = req.query;
      const projectDir = getProjectDir(projectName as string);

      let diffCmd = staged === 'true' ? 'git diff --cached' : 'git diff';
      if (file) {
        diffCmd += ` -- "${(file as string).replace(/"/g, '\\"')}"`;
      }

      const result = await runGit(diffCmd, projectDir);
      res.json({
        success: true,
        diff: result.stdout,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Log: Commit History
  router.get('/log', async (req, res) => {
    try {
      const { projectName, maxCount = '30' } = req.query;
      const projectDir = getProjectDir(projectName as string);

      const logRes = await runGit(`git log -n ${maxCount} --pretty=format:"%h|%an|%ar|%s"`, projectDir);
      if (logRes.exitCode !== 0) {
        return res.json({ success: true, commits: [] });
      }

      const commits = logRes.stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const parts = line.split('|');
          return {
            hash: parts[0],
            author: parts[1] || 'Developer',
            date: parts[2] || '',
            message: parts.slice(3).join('|') || '',
          };
        });

      res.json({ success: true, commits });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message, commits: [] });
    }
  });

  // 8. Branches
  router.get('/branches', async (req, res) => {
    try {
      const { projectName } = req.query;
      const projectDir = getProjectDir(projectName as string);

      const branchRes = await runGit('git branch -a', projectDir);
      const branches = branchRes.stdout
        .split('\n')
        .map(b => b.trim())
        .filter(Boolean)
        .map(b => {
          const isCurrent = b.startsWith('*');
          const name = b.replace('*', '').trim();
          return { name, isCurrent };
        });

      res.json({ success: true, branches });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message, branches: [] });
    }
  });

  // 9. Create Branch
  router.post('/create-branch', async (req, res) => {
    try {
      const { projectName, branchName } = req.body;
      if (!branchName) {
        return res.status(400).json({ success: false, error: 'Branch name is required' });
      }
      const projectDir = getProjectDir(projectName);
      const result = await runGit(`git checkout -b "${branchName.replace(/"/g, '')}"`, projectDir);

      res.json({
        success: result.exitCode === 0,
        output: result.stdout || result.stderr,
        error: result.exitCode !== 0 ? result.stderr : undefined,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Checkout Branch
  router.post('/checkout', async (req, res) => {
    try {
      const { projectName, branchName } = req.body;
      if (!branchName) {
        return res.status(400).json({ success: false, error: 'Branch name is required' });
      }
      const projectDir = getProjectDir(projectName);
      const result = await runGit(`git checkout "${branchName.replace(/"/g, '')}"`, projectDir);

      res.json({
        success: result.exitCode === 0,
        output: result.stdout || result.stderr,
        error: result.exitCode !== 0 ? result.stderr : undefined,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 11. Merge Branch
  router.post('/merge', async (req, res) => {
    try {
      const { projectName, branchName } = req.body;
      if (!branchName) {
        return res.status(400).json({ success: false, error: 'Branch to merge is required' });
      }
      const projectDir = getProjectDir(projectName);
      const result = await runGit(`git merge "${branchName.replace(/"/g, '')}"`, projectDir);

      // Check if merge resulted in conflicts
      const statusRes = await runGit('git diff --name-only --diff-filter=U', projectDir);
      const conflictFiles = statusRes.stdout.split('\n').filter(Boolean);

      res.json({
        success: result.exitCode === 0 && conflictFiles.length === 0,
        hasConflicts: conflictFiles.length > 0,
        conflictFiles,
        output: result.stdout || result.stderr,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 12. Abort Merge
  router.post('/abort-merge', async (req, res) => {
    try {
      const { projectName } = req.body;
      const projectDir = getProjectDir(projectName);
      const result = await runGit('git merge --abort', projectDir);
      res.json({ success: result.exitCode === 0, output: result.stdout || result.stderr });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 13. Stash
  router.post('/stash', async (req, res) => {
    try {
      const { projectName, action = 'push', message } = req.body;
      const projectDir = getProjectDir(projectName);

      let stashCmd = 'git stash push';
      if (action === 'pop') stashCmd = 'git stash pop';
      else if (action === 'list') stashCmd = 'git stash list';
      else if (action === 'drop') stashCmd = 'git stash drop';
      else if (message) stashCmd = `git stash push -m "${message.replace(/"/g, '')}"`;

      const result = await runGit(stashCmd, projectDir);
      res.json({ success: result.exitCode === 0, output: result.stdout || result.stderr });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 14. Remotes
  router.get('/remotes', async (req, res) => {
    try {
      const { projectName } = req.query;
      const projectDir = getProjectDir(projectName as string);
      const result = await runGit('git remote -v', projectDir);

      const remotes: any[] = [];
      const lines = result.stdout.split('\n').filter(Boolean);
      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 2) {
          remotes.push({ name: parts[0], url: parts[1], type: parts[2] ? parts[2].replace(/[()]/g, '') : '' });
        }
      }
      res.json({ success: true, remotes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message, remotes: [] });
    }
  });

  // 15. Add Remote
  router.post('/add-remote', async (req, res) => {
    try {
      const { projectName, name = 'origin', url } = req.body;
      if (!url) return res.status(400).json({ success: false, error: 'Remote URL is required' });
      const projectDir = getProjectDir(projectName);
      const result = await runGit(`git remote add ${name} "${url}"`, projectDir);
      res.json({ success: result.exitCode === 0, error: result.exitCode !== 0 ? result.stderr : undefined });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 16. Pull
  router.post('/pull', async (req, res) => {
    try {
      const { projectName, remote = 'origin', branch } = req.body;
      const projectDir = getProjectDir(projectName);
      const cmd = branch ? `git pull ${remote} ${branch}` : `git pull ${remote}`;
      const result = await runGit(cmd, projectDir);
      res.json({
        success: result.exitCode === 0,
        output: result.stdout || result.stderr,
        error: result.exitCode !== 0 ? result.stderr : undefined,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 17. Push
  router.post('/push', async (req, res) => {
    try {
      const { projectName, remote = 'origin', branch } = req.body;
      const projectDir = getProjectDir(projectName);
      const cmd = branch ? `git push ${remote} ${branch}` : `git push ${remote}`;
      const result = await runGit(cmd, projectDir);
      res.json({
        success: result.exitCode === 0,
        output: result.stdout || result.stderr,
        error: result.exitCode !== 0 ? result.stderr : undefined,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 18. Clone External Repository
  router.post('/clone', async (req, res) => {
    try {
      const { url, targetProjectName } = req.body;
      if (!url) return res.status(400).json({ success: false, error: 'Repository URL is required' });
      const safeName = path.basename(targetProjectName || url.split('/').pop()?.replace('.git', '') || 'ClonedProject');
      const targetDir = path.join(workspaceDir, safeName);

      if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
        return res.status(400).json({ success: false, error: 'Target directory already exists and is not empty.' });
      }

      const cloneRes = await runGit(`git clone "${url}" "${targetDir}"`, workspaceDir);
      res.json({
        success: cloneRes.exitCode === 0,
        projectName: safeName,
        output: cloneRes.stdout || cloneRes.stderr,
        error: cloneRes.exitCode !== 0 ? cloneRes.stderr : undefined,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 19. GitHub API: Verify Personal Access Token
  router.post('/github/verify', async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ success: false, error: 'GitHub token required' });

      const ghRes = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'AndroidStudioMobile/1.0',
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!ghRes.ok) {
        return res.status(ghRes.status).json({ success: false, error: 'Invalid or expired GitHub token' });
      }

      const userData = await ghRes.json();
      res.json({
        success: true,
        user: {
          login: userData.login,
          avatar_url: userData.avatar_url,
          name: userData.name,
          html_url: userData.html_url,
          public_repos: userData.public_repos,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 20. GitHub API: List Repositories
  router.post('/github/repos', async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) return res.status(400).json({ success: false, error: 'GitHub token required' });

      const ghRes = await fetch('https://api.github.com/user/repos?sort=updated&per_page=30', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'AndroidStudioMobile/1.0',
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!ghRes.ok) {
        return res.status(ghRes.status).json({ success: false, error: 'Failed to fetch repositories' });
      }

      const repos = await ghRes.json();
      res.json({
        success: true,
        repos: repos.map((r: any) => ({
          id: r.id,
          name: r.name,
          full_name: r.full_name,
          private: r.private,
          html_url: r.html_url,
          clone_url: r.clone_url,
          description: r.description,
          default_branch: r.default_branch,
          updated_at: r.updated_at,
        })),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
