import React, { useState } from 'react';
import { 
  FolderPlus, Smartphone, LayoutGrid, Layers, Lock, 
  Menu, Coffee, Check, X, ArrowRight, ArrowLeft
} from 'lucide-react';
import { ProjectConfig } from '../types';
import { PROJECT_TEMPLATES } from '../data/templates';

interface NewProjectModalProps {
  onClose: () => void;
  onCreateProject: (config: ProjectConfig, templateId: string) => void;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  onClose,
  onCreateProject,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('empty_views');

  // Config State
  const [appName, setAppName] = useState('My Application');
  const [packageName, setPackageName] = useState('com.androidstudiomobile.ide');
  const [language, setLanguage] = useState<'Kotlin' | 'Java'>('Kotlin');
  const [minSdk, setMinSdk] = useState<number>(24);
  const [buildSystem, setBuildSystem] = useState<'Gradle (Kotlin DSL)' | 'Gradle (Groovy)'>('Gradle (Kotlin DSL)');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAppName(val);
    const sanitized = val.toLowerCase().replace(/[^a-z0-9]/g, '');
    setPackageName(`com.example.${sanitized || 'myapp'}`);
  };

  const handleFinish = () => {
    const config: ProjectConfig = {
      id: 'proj-' + Date.now(),
      name: appName.trim() || 'My Application',
      packageName: packageName.trim() || 'com.androidstudiomobile.ide',
      language,
      buildSystem,
      minSdk,
      targetSdk: 34,
      compileSdk: 34,
      versionName: '1.0.0',
      versionCode: 1,
      lastOpened: Date.now(),
    };

    onCreateProject(config, selectedTemplateId);
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-3 select-none">
      <div className="bg-[#1e1f22] border border-[#393b40] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] text-xs">
        {/* Header */}
        <div className="bg-[#18191c] border-b border-[#2b2d30] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderPlus className="w-4 h-4 text-[#3574f0]" />
            <h2 className="font-bold text-white text-sm">New Project Wizard</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-[#2b2d30] text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Select Template */}
        {step === 1 && (
          <div className="flex-1 p-4 overflow-y-auto flex flex-col">
            <h3 className="text-white font-bold mb-2">Choose a Project Template</h3>
            <p className="text-gray-400 text-[11px] mb-4">
              Select a template to generate full project structure with Activity, layouts, and Gradle configurations.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {PROJECT_TEMPLATES.map(tpl => {
                const isSelected = selectedTemplateId === tpl.id;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start space-x-3 ${
                      isSelected
                        ? 'bg-[#3574f0]/15 border-[#3574f0] ring-1 ring-[#3574f0]'
                        : 'bg-[#2b2d30] border-[#393b40] hover:border-gray-500'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-lg bg-[#1e1f22] flex items-center justify-center text-[#3ddc84] shrink-0">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-white flex items-center justify-between">
                        <span>{tpl.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#3ddc84]" />}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Configure Project Settings */}
        {step === 2 && (
          <div className="flex-1 p-4 overflow-y-auto space-y-3 font-mono">
            <h3 className="text-white font-bold mb-2 font-sans">Configure Your Project</h3>

            <div>
              <label className="text-[11px] text-gray-400 block mb-1">Application Name</label>
              <input
                type="text"
                value={appName}
                onChange={handleNameChange}
                className="w-full bg-[#121316] border border-[#393b40] rounded px-3 py-2 text-white text-xs"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-400 block mb-1">Package Name</label>
              <input
                type="text"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                className="w-full bg-[#121316] border border-[#393b40] rounded px-3 py-2 text-white text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'Kotlin' | 'Java')}
                  className="w-full bg-[#121316] border border-[#393b40] rounded px-2.5 py-2 text-white text-xs"
                >
                  <option value="Kotlin">Kotlin (Recommended)</option>
                  <option value="Java">Java</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-gray-400 block mb-1">Minimum SDK</label>
                <select
                  value={minSdk}
                  onChange={(e) => setMinSdk(Number(e.target.value))}
                  className="w-full bg-[#121316] border border-[#393b40] rounded px-2.5 py-2 text-white text-xs"
                >
                  <option value={24}>API 24 ("Nougat"; Android 7.0)</option>
                  <option value={26}>API 26 ("Oreo"; Android 8.0)</option>
                  <option value={28}>API 28 ("Pie"; Android 9.0)</option>
                  <option value={31}>API 31 ("Snow Cone"; Android 12.0)</option>
                  <option value={34}>API 34 ("Upside Down Cake"; Android 14.0)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 block mb-1">Build Configuration Language</label>
              <select
                value={buildSystem}
                onChange={(e) => setBuildSystem(e.target.value as any)}
                className="w-full bg-[#121316] border border-[#393b40] rounded px-2.5 py-2 text-white text-xs"
              >
                <option value="Gradle (Kotlin DSL)">Kotlin DSL (build.gradle.kts) - Recommended</option>
                <option value="Gradle (Groovy)">Groovy DSL (build.gradle)</option>
              </select>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="bg-[#18191c] border-t border-[#2b2d30] px-4 py-3 flex items-center justify-between">
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="px-3 py-1.5 rounded bg-[#2b2d30] text-gray-300 hover:text-white flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : <div />}

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-[#2b2d30] text-gray-300 hover:bg-[#35373c]"
            >
              Cancel
            </button>

            {step === 1 ? (
              <button
                onClick={() => setStep(2)}
                className="px-4 py-1.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white font-bold flex items-center gap-1"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="px-4 py-1.5 rounded bg-[#3ddc84] hover:bg-[#46e68d] text-[#121316] font-bold"
              >
                Create Project
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
