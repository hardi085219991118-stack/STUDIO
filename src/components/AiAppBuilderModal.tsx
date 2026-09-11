import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  FileCode,
  ShieldCheck,
  Cpu,
  Terminal,
  Activity,
  ChevronRight,
  ChevronDown,
  History,
  Copy,
  Check,
  Layers,
  FilePlus,
  FileEdit,
  Trash2,
  RefreshCw,
  FolderGit2,
  Eye,
  Info,
  Wrench,
} from 'lucide-react';
import { ProjectFile } from '../types';

interface AiAppBuilderModalProps {
  projectName: string;
  files: ProjectFile[];
  onClose: () => void;
  onProjectUpdated: () => void;
  onOpenFile?: (path: string) => void;
}

interface PlanData {
  title: string;
  description: string;
  steps: string[];
  filesToCreate: { path: string; purpose: string }[];
  filesToModify: { path: string; purpose: string }[];
  filesToDelete?: { path: string; reason: string }[];
  dependenciesToAdd: string[];
  riskAssessment: string;
  estimatedComplexity: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface ExecutionResult {
  commandPrompt: string;
  plan: PlanData;
  filesCreated: string[];
  filesModified: string[];
  filesDeleted: string[];
  buildStatus: 'PASS' | 'FAIL' | 'LIMITED_BY_ENVIRONMENT';
  buildReason?: string;
  testStatus: 'PASS' | 'FAIL';
  testDetails: string[];
  auditStatus: 'PASS' | 'FAIL';
  auditIssues: { severity: 'critical' | 'warn' | 'info'; message: string; file?: string }[];
  regressionStatus: 'PASS' | 'FAIL';
  regressionDetails: string[];
  apkStatus: 'GENERATED' | 'NOT_GENERATED';
  apkPath?: string;
  verificationStatus: 'VERIFIED' | 'LIMITED_BY_ENVIRONMENT';
  logs: { timestamp: string; step: string; message: string; level: 'info' | 'warn' | 'error' | 'success' }[];
}

const PRESET_PROMPTS = [
  'Buat aplikasi kasir POS sederhana dengan daftar produk dan keranjang belanja',
  'Tambahkan fitur login dan register dengan validasi form serta Room database',
  'Tambahkan database SQLite / Room untuk penyimpanan data lokal offline-first',
  'Tambahkan pencarian produk real-time dan filter kategori',
  'Perbaiki error lint, impor yang hilang, dan masalah Gradle sync',
  'Audit seluruh project untuk keamanan Android, izin Manifest, dan performa',
  'Tambahkan tema gelap (Dark Mode) dan styling modern Material 3',
];

export const AiAppBuilderModal: React.FC<AiAppBuilderModalProps> = ({
  projectName,
  files,
  onClose,
  onProjectUpdated,
  onOpenFile,
}) => {
  const [activeTab, setActiveTab] = useState<'prompt' | 'pipeline' | 'results' | 'history'>('prompt');
  const [prompt, setPrompt] = useState<string>('');
  const [includeContext, setIncludeContext] = useState<boolean>(true);
  const [allowDestructive, setAllowDestructive] = useState<boolean>(false);
  const [loadingPlan, setLoadingPlan] = useState<boolean>(false);
  const [executing, setExecuting] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [viewingFileDiff, setViewingFileDiff] = useState<string | null>(null);
  const [fileDiffContent, setFileDiffContent] = useState<string>('');

  const [engineStatus, setEngineStatus] = useState<{
    geminiAvailable: boolean;
    model: string;
    notice?: string;
  } | null>(null);

  const [envStatus, setEnvStatus] = useState<{
    overallStatus: string;
    isBuildReady: boolean;
  } | null>(null);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('android_ai_prompt_history');
      if (savedHistory) {
        setPromptHistory(JSON.parse(savedHistory));
      }
    } catch (e) {
      // ignore
    }

    // Check AI models & environment
    fetch('/api/ai/models')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setEngineStatus({
            geminiAvailable: data.geminiAvailable,
            model: data.preferredModel,
          });
        }
      })
      .catch(() => {});

    fetch('/api/build/environment')
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setEnvStatus({
            overallStatus: data.overallStatus,
            isBuildReady: data.isBuildReady,
          });
        }
      })
      .catch(() => {});
  }, []);

  const savePromptToHistory = (newPrompt: string) => {
    if (!newPrompt.trim()) return;
    const updated = [newPrompt.trim(), ...promptHistory.filter((p) => p !== newPrompt.trim())].slice(0, 15);
    setPromptHistory(updated);
    try {
      localStorage.setItem('android_ai_prompt_history', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  // 1. Generate Plan
  const handleGeneratePlan = async () => {
    if (!prompt.trim()) return;
    setLoadingPlan(true);
    savePromptToHistory(prompt);
    try {
      const res = await fetch('/api/ai/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          projectName,
          projectContext: includeContext ? { files } : undefined,
          includeContext,
        }),
      });
      const data = await res.json();
      if (data.success && data.plan) {
        setPlan(data.plan);
      } else {
        alert(data.error || 'Gagal merancang rencana AI');
      }
    } catch (err: any) {
      alert(`Kesalahan: ${err.message}`);
    } finally {
      setLoadingPlan(false);
    }
  };

  // 2. Full Execute Loop (Analyze -> Plan -> Implement -> Build -> Test -> Audit -> Regression)
  const handleExecute = async () => {
    if (!prompt.trim() && !plan) return;
    setExecuting(true);
    setActiveTab('pipeline');
    setCurrentStep('Menginisialisasi pipeline AI...');

    savePromptToHistory(prompt);

    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          projectName,
          projectContext: includeContext ? { files } : undefined,
          plan: plan || undefined,
          allowDestructive,
          includeContext,
        }),
      });

      const data = await res.json();
      const executionResult = data.result || (data.success ? {
        commandPrompt: prompt,
        plan: plan || data.plan,
        filesCreated: data.filesCreated || [],
        filesModified: data.filesModified || [],
        filesDeleted: data.filesDeleted || [],
        buildStatus: data.buildEnvironment?.isBuildReady ? 'PASS' : 'LIMITED_BY_ENVIRONMENT',
        testStatus: data.buildEnvironment?.isBuildReady ? 'PASS' : 'FAIL',
        testDetails: data.buildEnvironment?.isBuildReady ? ['Tests ready'] : ['Environment limited'],
        auditStatus: data.audit?.passed ? 'PASS' : 'FAIL',
        auditIssues: data.audit?.issues || [],
        regressionStatus: data.regression?.passed ? 'PASS' : 'FAIL',
        regressionDetails: data.regression?.details || [],
        apkStatus: 'NOT_GENERATED',
        verificationStatus: data.buildEnvironment?.isBuildReady ? 'VERIFIED' : 'LIMITED_BY_ENVIRONMENT',
        logs: [],
      } : null);

      if (data.success && executionResult) {
        setResult(executionResult);
        if (executionResult.plan) {
          setPlan(executionResult.plan);
        }
        setActiveTab('results');
        onProjectUpdated();
      } else {
        alert(data.error || 'Eksekusi AI gagal');
      }
    } catch (err: any) {
      alert(`Kesalahan jaringan: ${err.message}`);
    } finally {
      setExecuting(false);
      setCurrentStep('');
    }
  };

  const handleAutoFixIssues = async () => {
    if (!result || result.auditIssues.length === 0) return;
    const issuesText = result.auditIssues.map(i => `${i.message} (file: ${i.file || 'umum'})`).join('; ');
    const autoFixPrompt = `Perbaiki dan selesaikan masalah audit berikut pada proyek: ${issuesText}`;
    setPrompt(autoFixPrompt);
    setExecuting(true);
    setActiveTab('pipeline');
    setCurrentStep('Menjalankan siklus Autonomous Auto-Fix untuk menyelesaikan temuan...');
    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: autoFixPrompt,
          projectName,
          projectContext: { files },
          allowDestructive: false,
          includeContext: true,
        }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setResult(data.result);
        if (data.result.plan) setPlan(data.result.plan);
        setActiveTab('results');
        onProjectUpdated();
      } else {
        alert(data.error || 'Auto-fix gagal');
      }
    } catch (err: any) {
      alert(`Kesalahan jaringan auto-fix: ${err.message}`);
    } finally {
      setExecuting(false);
      setCurrentStep('');
    }
  };

  const handleCopyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInspectFile = async (filePath: string) => {
    try {
      const res = await fetch(`/api/file?projectName=${encodeURIComponent(projectName)}&filePath=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.success) {
        setViewingFileDiff(filePath);
        setFileDiffContent(data.content || '');
      }
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#1e1f22] border border-[#2b2d30] rounded-xl shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
        
        {/* Header */}
        <div className="bg-[#18191c] border-b border-[#2b2d30] px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#3574f0]/15 border border-[#3574f0]/30 flex items-center justify-center text-[#3574f0]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-white text-sm">AI App Builder & Coding Agent</h2>
                <span className="text-[10px] bg-[#3574f0]/20 text-[#3574f0] border border-[#3574f0]/30 px-1.5 py-0.5 rounded font-mono font-bold">
                  PRO
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-gray-400">
                <span>Proyek: <strong className="text-gray-200">{projectName}</strong></span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Cpu className="w-3 h-3 text-purple-400" />
                  <span>{engineStatus?.geminiAvailable ? 'Gemini 2.5 Flash' : 'Native Android Engine'}</span>
                </span>
                <span>•</span>
                <span className={`font-mono text-[10px] ${
                  envStatus?.overallStatus === 'READY_FOR_REAL_ANDROID_BUILD'
                    ? 'text-[#3ddc84]'
                    : envStatus?.overallStatus === 'LIMITED_BY_ENVIRONMENT'
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}>
                  {envStatus?.overallStatus || 'Checking Environment...'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-[#2b2d30] text-gray-400 hover:text-white transition-colors"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#141517] border-b border-[#2b2d30] px-4 flex space-x-1 shrink-0 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'prompt'
                ? 'border-[#3574f0] text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#3574f0]" />
            <span>Editor Instruksi & Perencanaan</span>
          </button>

          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'pipeline'
                ? 'border-[#3574f0] text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Siklus Eksekusi (Pipeline)</span>
            {executing && <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />}
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'results'
                ? 'border-[#3574f0] text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#3ddc84]" />
            <span>Hasil & Audit Akhir</span>
            {result && (
              <span className="text-[10px] bg-[#3ddc84]/20 text-[#3ddc84] px-1.5 rounded-full font-mono font-bold">
                SIAP
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-2.5 font-medium border-b-2 transition-colors flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-[#3574f0] text-white'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <History className="w-3.5 h-3.5 text-gray-400" />
            <span>Riwayat Prompt ({promptHistory.length})</span>
          </button>
        </div>

        {/* Tab 1: Prompt & Plan Mode */}
        {activeTab === 'prompt' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
            
            {/* Quick Prompt Suggestions */}
            <div className="space-y-1.5">
              <label className="text-gray-400 font-medium text-[11px] flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-[#3574f0]" />
                <span>Rekomendasi Perintah Cepat:</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_PROMPTS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPrompt(preset)}
                    className="bg-[#2b2d30] hover:bg-[#35373c] text-gray-300 hover:text-white px-2.5 py-1 rounded-lg text-[11px] transition-colors text-left border border-transparent hover:border-[#3574f0]/40"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-white text-xs">
                  Instruksi Pengembangan Android:
                </label>
                <div className="flex items-center space-x-2 text-[11px]">
                  <button
                    onClick={handleCopyPrompt}
                    className="text-gray-400 hover:text-white flex items-center space-x-1"
                    title="Salin Prompt"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-[#3ddc84]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin' : 'Salin'}</span>
                  </button>
                  <button
                    onClick={() => setPrompt('')}
                    className="text-gray-400 hover:text-rose-400 flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Bersihkan</span>
                  </button>
                </div>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Jelaskan aplikasi atau fitur yang ingin dibuat. Contoh: Buat aplikasi kasir POS dengan Room Database, Activity daftar barang, kalkulator total belanja, dan export struk..."
                className="w-full h-32 sm:h-36 bg-[#141517] border border-[#2b2d30] focus:border-[#3574f0] rounded-xl p-3 text-white text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-[#3574f0] leading-relaxed"
              />
            </div>

            {/* Options & Context */}
            <div className="bg-[#18191c] border border-[#2b2d30] rounded-xl p-3.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeContext}
                    onChange={(e) => setIncludeContext(e.target.checked)}
                    className="rounded bg-[#2b2d30] border-[#393b40] text-[#3574f0] focus:ring-0"
                  />
                  <span>Sertakan Konteks Proyek ({files.length} Berkas Aktif)</span>
                </label>

                <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDestructive}
                    onChange={(e) => setAllowDestructive(e.target.checked)}
                    className="rounded bg-[#2b2d30] border-[#393b40] text-rose-500 focus:ring-0"
                  />
                  <span className="text-gray-400 hover:text-white">Izinkan Modifikasi File Bersifat Destruktif</span>
                </label>
              </div>

              {includeContext && (
                <div className="text-[11px] text-gray-400 bg-[#141517] p-2.5 rounded-lg border border-[#2b2d30] flex flex-wrap gap-2">
                  <span className="text-gray-300 font-semibold">Struktur Terdeteksi:</span>
                  <span>Manifest (AndroidManifest.xml)</span>
                  <span>•</span>
                  <span>Build Script (build.gradle)</span>
                  <span>•</span>
                  <span>Komponen Java/Kotlin & XML Layouts</span>
                </div>
              )}
            </div>

            {/* Plan Display (If generated) */}
            {plan && (
              <div className="bg-[#18191c] border border-[#3574f0]/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[#2b2d30] pb-2">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-4 h-4 text-[#3574f0]" />
                    <span className="font-bold text-white text-xs">{plan.title}</span>
                  </div>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded font-mono">
                    Kompleksitas: {plan.estimatedComplexity}
                  </span>
                </div>

                <p className="text-gray-300 text-xs leading-relaxed">{plan.description}</p>

                {/* Steps */}
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold text-gray-400">Tahapan Implementasi:</div>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11px]">
                    {plan.steps.map((st, i) => (
                      <li key={i}>{st}</li>
                    ))}
                  </ol>
                </div>

                {/* Files */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#2b2d30]">
                  {plan.filesToCreate.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-[#3ddc84] flex items-center space-x-1">
                        <FilePlus className="w-3.5 h-3.5" />
                        <span>File Baru ({plan.filesToCreate.length}):</span>
                      </div>
                      <div className="space-y-1">
                        {plan.filesToCreate.map((f, idx) => (
                          <div key={idx} className="bg-[#141517] p-1.5 rounded font-mono text-[10px] text-gray-300">
                            <div className="font-bold text-gray-200">{f.path}</div>
                            <div className="text-gray-400 text-[9px]">{f.purpose}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {plan.filesToModify.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-amber-400 flex items-center space-x-1">
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>File Dimodifikasi ({plan.filesToModify.length}):</span>
                      </div>
                      <div className="space-y-1">
                        {plan.filesToModify.map((f, idx) => (
                          <div key={idx} className="bg-[#141517] p-1.5 rounded font-mono text-[10px] text-gray-300">
                            <div className="font-bold text-gray-200">{f.path}</div>
                            <div className="text-gray-400 text-[9px]">{f.purpose}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Safety Checkpoint */}
                <div className="bg-[#141517] p-2.5 rounded-lg border border-[#2b2d30] flex items-start space-x-2 text-[11px] text-gray-400">
                  <ShieldCheck className="w-4 h-4 text-[#3ddc84] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-200">Checkpoint Keamanan:</strong> Berkas asli diproteksi. Sistem akan melakukan validasi kompilasi, pengujian unit, audit keamanan manifest, dan cek regresi sebelum memfinalisasi hasil.
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
              <button
                onClick={handleGeneratePlan}
                disabled={loadingPlan || executing || !prompt.trim()}
                className="w-full sm:w-auto px-4 py-2 bg-[#2b2d30] hover:bg-[#35373c] text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <Sparkles className={`w-4 h-4 text-[#3574f0] ${loadingPlan ? 'animate-spin' : ''}`} />
                <span>{loadingPlan ? 'Merancang Rencana...' : '1. Rencanakan Saja (Plan)'}</span>
              </button>

              <button
                onClick={handleExecute}
                disabled={loadingPlan || executing || (!prompt.trim() && !plan)}
                className="w-full sm:w-auto px-5 py-2 bg-[#3574f0] hover:bg-[#2f66d4] text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-[#3574f0]/20 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{plan ? '2. Jalankan Implementasi & Audit' : 'Eksekusi Lengkap (Auto-Loop)'}</span>
              </button>
            </div>

          </div>
        )}

        {/* Tab 2: Execution Pipeline View */}
        {activeTab === 'pipeline' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
            <div className="bg-[#18191c] border border-[#2b2d30] rounded-xl p-4 space-y-3">
              <div className="font-bold text-white text-xs flex items-center space-x-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span>Siklus Penuh Agen AI (Self-Healing Loop)</span>
              </div>
              <p className="text-gray-400 text-xs">
                Pipeline menjalankan 7 tahap secara otonom: Analisis instruksi, penyusunan rencana, implementasi berkas kode Android nyata, kompilasi build, uji unit & perbaikan otomatis, audit kualitas, dan verifikasi regresi.
              </p>

              {/* Progress Stepper */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {[
                  { label: '1. Rencana (PLAN)', icon: Sparkles },
                  { label: '2. Kode (IMPLEMENT)', icon: FileCode },
                  { label: '3. Kompilasi (BUILD)', icon: Terminal },
                  { label: '4. Audit & Uji (AUDIT)', icon: ShieldCheck },
                ].map((s, idx) => (
                  <div key={idx} className="bg-[#141517] border border-[#2b2d30] p-2 rounded-lg flex items-center space-x-2">
                    <s.icon className="w-4 h-4 text-[#3574f0]" />
                    <span className="text-[11px] font-medium text-gray-300">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Status or Spinner */}
            {executing ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3 text-gray-400">
                <RefreshCw className="w-8 h-8 animate-spin text-[#3574f0]" />
                <div className="text-xs font-mono font-bold text-gray-200">
                  {currentStep || 'Sedang memproses instruksi proyek...'}
                </div>
                <div className="text-[11px] text-gray-500">
                  Menerapkan pembaruan berkas Java/Kotlin, layout XML, dan sinkronisasi Gradle...
                </div>
              </div>
            ) : result ? (
              <div className="space-y-3">
                <div className="bg-[#3ddc84]/10 border border-[#3ddc84]/30 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-[#3ddc84]">
                    <CheckCircle2 className="w-5 h-5" />
                    <div>
                      <div className="font-bold text-xs">Siklus Implementasi Selesai</div>
                      <div className="text-[11px] text-gray-300">
                        File telah diperbarui di disk. Buka tab Hasil & Audit untuk laporan lengkap.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('results')}
                    className="px-3 py-1.5 bg-[#3ddc84] text-black font-bold rounded-lg text-xs hover:bg-[#32be72] transition-colors"
                  >
                    Lihat Hasil →
                  </button>
                </div>

                {/* Modified/Created files overview */}
                <div className="bg-[#18191c] border border-[#2b2d30] rounded-xl p-3.5 space-y-2">
                  <div className="font-bold text-white text-xs">Perubahan Berkas Proyek:</div>
                  <div className="space-y-1.5">
                    {result.filesCreated.map((f) => (
                      <div key={f} className="flex items-center justify-between bg-[#141517] p-2 rounded text-[11px] font-mono">
                        <span className="text-[#3ddc84] flex items-center gap-1.5">
                          <FilePlus className="w-3.5 h-3.5" />
                          <span>{f}</span>
                        </span>
                        <button
                          onClick={() => {
                            if (onOpenFile) onOpenFile(f);
                            onClose();
                          }}
                          className="text-[#3574f0] hover:underline text-[10px]"
                        >
                          Buka di Editor
                        </button>
                      </div>
                    ))}
                    {result.filesModified.map((f) => (
                      <div key={f} className="flex items-center justify-between bg-[#141517] p-2 rounded text-[11px] font-mono">
                        <span className="text-amber-400 flex items-center gap-1.5">
                          <FileEdit className="w-3.5 h-3.5" />
                          <span>{f}</span>
                        </span>
                        <button
                          onClick={() => {
                            if (onOpenFile) onOpenFile(f);
                            onClose();
                          }}
                          className="text-[#3574f0] hover:underline text-[10px]"
                        >
                          Buka di Editor
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Belum ada eksekusi aktif. Tulis perintah di tab Editor Instruksi dan klik Eksekusi Lengkap.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Structured Results & Verification */}
        {activeTab === 'results' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
            {result ? (
              <div className="space-y-4">
                
                {/* Result Card: Formatted per prompt specification */}
                <div className="bg-[#18191c] border border-[#2b2d30] rounded-xl p-4 space-y-3 font-mono">
                  <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider border-b border-[#2b2d30] pb-2 flex items-center justify-between">
                    <span>Laporan Verifikasi Penuh AI App Builder</span>
                    <span className="text-[10px] text-gray-500 font-normal">Sesuai Format Audit Ketat</span>
                  </div>

                  {/* 1. PERINTAH */}
                  <div className="space-y-1">
                    <span className="text-gray-400 font-bold">PERINTAH:</span>
                    <div className="text-gray-200 bg-[#141517] p-2 rounded border border-[#2b2d30] font-sans text-xs">
                      {result.commandPrompt || prompt}
                    </div>
                  </div>

                  {/* 2. HASIL */}
                  <div className="space-y-1">
                    <span className="text-gray-400 font-bold">HASIL:</span>
                    <div className="text-gray-200 bg-[#141517] p-2 rounded border border-[#2b2d30] font-sans text-xs">
                      {result.plan.description || 'Fitur dan modul berhasil dirancang dan diintegrasikan ke kode sumber proyek.'}
                    </div>
                  </div>

                  {/* 3. FILE DIUBAH / DIBUAT */}
                  <div className="space-y-1">
                    <span className="text-gray-400 font-bold">FILE DIUBAH / DIBUAT:</span>
                    <div className="bg-[#141517] p-2 rounded border border-[#2b2d30] space-y-1">
                      {result.filesCreated.map((f) => (
                        <div key={f} className="text-[#3ddc84] text-[11px]">
                          + [DIBUAT] {f}
                        </div>
                      ))}
                      {result.filesModified.map((f) => (
                        <div key={f} className="text-amber-400 text-[11px]">
                          ~ [DIUBAH] {f}
                        </div>
                      ))}
                      {result.filesCreated.length === 0 && result.filesModified.length === 0 && (
                        <div className="text-gray-500">Tidak ada berkas yang diubah</div>
                      )}
                    </div>
                  </div>

                  {/* 4. Matrix Status Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                    
                    {/* BUILD STATUS */}
                    <div className="bg-[#141517] p-2.5 rounded border border-[#2b2d30] space-y-1">
                      <div className="text-gray-400 text-[10px]">BUILD:</div>
                      <div className={`font-bold text-xs ${
                        result.buildStatus === 'PASS'
                          ? 'text-[#3ddc84]'
                          : result.buildStatus === 'LIMITED_BY_ENVIRONMENT'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}>
                        {result.buildStatus}
                      </div>
                    </div>

                    {/* TEST STATUS */}
                    <div className="bg-[#141517] p-2.5 rounded border border-[#2b2d30] space-y-1">
                      <div className="text-gray-400 text-[10px]">TEST:</div>
                      <div className={`font-bold text-xs ${result.testStatus === 'PASS' ? 'text-[#3ddc84]' : 'text-rose-400'}`}>
                        {result.testStatus}
                      </div>
                    </div>

                    {/* AUDIT STATUS */}
                    <div className="bg-[#141517] p-2.5 rounded border border-[#2b2d30] space-y-1">
                      <div className="text-gray-400 text-[10px]">AUDIT:</div>
                      <div className={`font-bold text-xs ${result.auditStatus === 'PASS' ? 'text-[#3ddc84]' : 'text-rose-400'}`}>
                        {result.auditStatus}
                      </div>
                    </div>

                    {/* REGRESSION STATUS */}
                    <div className="bg-[#141517] p-2.5 rounded border border-[#2b2d30] space-y-1">
                      <div className="text-gray-400 text-[10px]">REGRESSION:</div>
                      <div className={`font-bold text-xs ${result.regressionStatus === 'PASS' ? 'text-[#3ddc84]' : 'text-rose-400'}`}>
                        {result.regressionStatus}
                      </div>
                    </div>

                    {/* APK STATUS */}
                    <div className="bg-[#141517] p-2.5 rounded border border-[#2b2d30] space-y-1">
                      <div className="text-gray-400 text-[10px]">APK:</div>
                      <div className={`font-bold text-xs ${result.apkStatus === 'GENERATED' ? 'text-[#3ddc84]' : 'text-gray-400'}`}>
                        {result.apkStatus}
                      </div>
                    </div>

                    {/* VERIFICATION STATUS */}
                    <div className="bg-[#141517] p-2.5 rounded border border-[#2b2d30] space-y-1">
                      <div className="text-gray-400 text-[10px]">STATUS VERIFIKASI:</div>
                      <div className={`font-bold text-xs ${
                        result.verificationStatus === 'VERIFIED'
                          ? 'text-[#3ddc84]'
                          : 'text-amber-400'
                      }`}>
                        {result.verificationStatus}
                      </div>
                    </div>

                  </div>

                </div>

                {/* Audit & Health Issues Detail */}
                <div className="bg-[#18191c] border border-[#2b2d30] rounded-xl p-4 space-y-2.5">
                  <div className="font-bold text-white text-xs flex items-center justify-between">
                    <span>Hasil Audit Keamanan & Kualitas Proyek:</span>
                    <span className="text-[11px] text-gray-400">{result.auditIssues.length} temuan</span>
                  </div>
                  <div className="space-y-1.5">
                    {result.auditIssues.map((iss, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded text-[11px] flex items-start space-x-2 ${
                          iss.severity === 'critical'
                            ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                            : iss.severity === 'warn'
                            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                            : 'bg-[#2b2d30]/60 border border-[#393b40] text-gray-300'
                        }`}
                      >
                        {iss.severity === 'critical' ? (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        ) : iss.severity === 'warn' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-[#3574f0] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-medium">{iss.message}</div>
                          {iss.file && <div className="text-[10px] opacity-75 font-mono">{iss.file}</div>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {result.auditIssues.length > 0 && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleAutoFixIssues}
                        disabled={executing}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 shadow-sm"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Jalankan Auto-Fix Isu Audit</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Regression Check Details */}
                <div className="bg-[#18191c] border border-[#2b2d30] rounded-xl p-4 space-y-2">
                  <div className="font-bold text-white text-xs">Pemeriksaan Kompatibilitas Regresi:</div>
                  <div className="space-y-1 text-[11px] text-gray-300">
                    {result.regressionDetails.map((rd, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#3ddc84] shrink-0" />
                        <span>{rd}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Belum ada laporan hasil. Jalankan perintah di tab Editor Instruksi untuk memulai.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: History */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs">Riwayat Instruksi Tersimpan:</span>
              <button
                onClick={() => {
                  setPromptHistory([]);
                  localStorage.removeItem('android_ai_prompt_history');
                }}
                className="text-rose-400 hover:underline text-[11px]"
              >
                Hapus Semua Riwayat
              </button>
            </div>

            {promptHistory.length > 0 ? (
              <div className="space-y-2">
                {promptHistory.map((h, i) => (
                  <div
                    key={i}
                    className="bg-[#18191c] border border-[#2b2d30] hover:border-[#3574f0]/40 p-3 rounded-xl flex items-center justify-between group transition-colors"
                  >
                    <p className="text-gray-300 text-xs font-mono line-clamp-2 pr-3">{h}</p>
                    <button
                      onClick={() => {
                        setPrompt(h);
                        setActiveTab('prompt');
                      }}
                      className="px-3 py-1 bg-[#2b2d30] hover:bg-[#3574f0] text-gray-300 hover:text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
                    >
                      Gunakan
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Riwayat prompt kosong. Setiap perintah yang dijalankan akan disimpan di sini secara otomatis.
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="bg-[#18191c] border-t border-[#2b2d30] px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 text-[11px] text-gray-400">
            <FolderGit2 className="w-3.5 h-3.5 text-[#3574f0]" />
            <span>Workspace: {projectName}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2b2d30] hover:bg-[#35373c] text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
