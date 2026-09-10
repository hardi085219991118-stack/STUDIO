import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, Plus, Trash2, Code, FileText, Check, AlertCircle, 
  Settings2, Activity as ActivityIcon, Radio, Server, ShieldAlert
} from 'lucide-react';

interface ManifestEditorProps {
  content: string;
  onSaveContent: (newContent: string) => void;
  onClose: () => void;
}

interface ParsedActivity {
  name: string;
  exported: string;
  isLauncher: boolean;
  actions: string[];
  categories: string[];
}

interface ParsedManifest {
  packageName: string;
  permissions: string[];
  application: {
    label?: string;
    icon?: string;
    theme?: string;
    allowBackup?: string;
  };
  activities: ParsedActivity[];
  services: string[];
  receivers: string[];
  providers: string[];
}

export const ManifestEditor: React.FC<ManifestEditorProps> = ({
  content,
  onSaveContent,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'form' | 'xml'>('form');
  const [rawXml, setRawXml] = useState(content);
  const [newPermissionInput, setNewPermissionInput] = useState('');
  const [newActivityInput, setNewActivityInput] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Common suggested permissions
  const suggestedPermissions = [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.CAMERA',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.VIBRATE',
    'android.permission.WAKE_LOCK',
    'android.permission.FOREGROUND_SERVICE',
  ];

  // Dynamic XML Parser using DOMParser
  const parsedManifest = useMemo<ParsedManifest | null>(() => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawXml, 'application/xml');
      const err = doc.querySelector('parsererror');
      if (err) {
        setParseError(err.textContent || 'XML Parsing Error');
        return null;
      }
      setParseError(null);

      const manifestEl = doc.querySelector('manifest');
      const packageName = manifestEl?.getAttribute('package') || '';

      // Permissions
      const permElements = doc.querySelectorAll('uses-permission');
      const permissions: string[] = [];
      permElements.forEach((el) => {
        const name = el.getAttribute('android:name');
        if (name) permissions.push(name);
      });

      // Application
      const appEl = doc.querySelector('application');
      const application = {
        label: appEl?.getAttribute('android:label') || undefined,
        icon: appEl?.getAttribute('android:icon') || undefined,
        theme: appEl?.getAttribute('android:theme') || undefined,
        allowBackup: appEl?.getAttribute('android:allowBackup') || undefined,
      };

      // Activities
      const actElements = doc.querySelectorAll('activity');
      const activities: ParsedActivity[] = [];
      actElements.forEach((el) => {
        const name = el.getAttribute('android:name') || '';
        const exported = el.getAttribute('android:exported') || 'not specified';
        
        const actions: string[] = [];
        const categories: string[] = [];
        let isLauncher = false;

        el.querySelectorAll('action').forEach(a => {
          const actName = a.getAttribute('android:name');
          if (actName) actions.push(actName);
        });

        el.querySelectorAll('category').forEach(c => {
          const catName = c.getAttribute('android:name');
          if (catName) {
            categories.push(catName);
            if (catName.includes('LAUNCHER')) isLauncher = true;
          }
        });

        activities.push({
          name,
          exported,
          isLauncher,
          actions,
          categories,
        });
      });

      // Services, Receivers, Providers
      const services: string[] = [];
      doc.querySelectorAll('service').forEach(s => {
        const n = s.getAttribute('android:name');
        if (n) services.push(n);
      });

      const receivers: string[] = [];
      doc.querySelectorAll('receiver').forEach(r => {
        const n = r.getAttribute('android:name');
        if (n) receivers.push(n);
      });

      const providers: string[] = [];
      doc.querySelectorAll('provider').forEach(p => {
        const n = p.getAttribute('android:name');
        if (n) providers.push(n);
      });

      return {
        packageName,
        permissions,
        application,
        activities,
        services,
        receivers,
        providers,
      };
    } catch (e: any) {
      setParseError(e.message);
      return null;
    }
  }, [rawXml]);

  // Mutate XML using DOM and serialize back cleanly
  const mutateXml = (mutator: (doc: Document) => void) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawXml, 'application/xml');
      mutator(doc);
      const serializer = new XMLSerializer();
      const serialized = serializer.serializeToString(doc);
      setRawXml(serialized);
      onSaveContent(serialized);
    } catch (e) {
      console.error('Failed to mutate manifest XML:', e);
    }
  };

  const handleAddPermission = (permName: string) => {
    if (!permName.trim()) return;
    const cleanName = permName.trim();
    if (parsedManifest?.permissions.includes(cleanName)) return;

    mutateXml((doc) => {
      const manifest = doc.querySelector('manifest');
      if (manifest) {
        const newPerm = doc.createElement('uses-permission');
        newPerm.setAttribute('android:name', cleanName);
        const app = doc.querySelector('application');
        if (app) {
          manifest.insertBefore(newPerm, app);
        } else {
          manifest.appendChild(newPerm);
        }
      }
    });
    setNewPermissionInput('');
  };

  const handleRemovePermission = (permName: string) => {
    mutateXml((doc) => {
      const perms = doc.querySelectorAll('uses-permission');
      perms.forEach(p => {
        if (p.getAttribute('android:name') === permName) {
          p.parentNode?.removeChild(p);
        }
      });
    });
  };

  const handleToggleExported = (activityName: string, currentVal: string) => {
    const newVal = currentVal === 'true' ? 'false' : 'true';
    mutateXml((doc) => {
      doc.querySelectorAll('activity').forEach(a => {
        if (a.getAttribute('android:name') === activityName) {
          a.setAttribute('android:exported', newVal);
        }
      });
    });
  };

  const handleAddActivity = () => {
    if (!newActivityInput.trim()) return;
    let actName = newActivityInput.trim();
    if (!actName.startsWith('.')) actName = '.' + actName;

    mutateXml((doc) => {
      const app = doc.querySelector('application');
      if (app) {
        const newAct = doc.createElement('activity');
        newAct.setAttribute('android:name', actName);
        newAct.setAttribute('android:exported', 'false');
        app.appendChild(newAct);
      }
    });
    setNewActivityInput('');
  };

  const handleRemoveActivity = (actName: string) => {
    mutateXml((doc) => {
      doc.querySelectorAll('activity').forEach(a => {
        if (a.getAttribute('android:name') === actName) {
          a.parentNode?.removeChild(a);
        }
      });
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1f22] text-[#bcbec4] text-xs select-none overflow-hidden">
      {/* Top Header */}
      <div className="bg-[#18191c] border-b border-[#2b2d30] px-3 py-1.5 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-[#3ddc84]" />
          <span className="font-semibold text-white">AndroidManifest.xml</span>
          <span className="text-[10px] bg-[#3ddc84]/10 text-[#3ddc84] font-mono px-1.5 py-0.5 rounded border border-[#3ddc84]/30">
            DYNAMIC PARSER
          </span>
        </div>

        <div className="flex items-center space-x-1 bg-[#2b2d30] p-0.5 rounded border border-[#393b40]">
          <button
            onClick={() => setActiveTab('form')}
            className={`px-2.5 py-0.5 rounded text-[11px] ${activeTab === 'form' ? 'bg-[#3574f0] text-white font-medium' : 'text-gray-400'}`}
          >
            Form GUI
          </button>
          <button
            onClick={() => setActiveTab('xml')}
            className={`px-2.5 py-0.5 rounded text-[11px] ${activeTab === 'xml' ? 'bg-[#3574f0] text-white font-medium' : 'text-gray-400'}`}
          >
            Raw XML
          </button>
        </div>
      </div>

      {parseError && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-3 py-1.5 flex items-center space-x-2 text-xs text-red-300 font-mono">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>XML Syntax Error: {parseError}</span>
        </div>
      )}

      {/* Main Content */}
      {activeTab === 'form' ? (
        <div className="flex-1 p-4 overflow-y-auto space-y-5 max-w-3xl">
          {/* Package & Application Info */}
          {parsedManifest && (
            <div className="bg-[#2b2d30] border border-[#393b40] rounded-xl p-3.5 space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#393b40]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Settings2 className="w-3.5 h-3.5 text-[#3574f0]" />
                  <span>Package & Application Info</span>
                </span>
                <span className="text-[10px] text-gray-400">Target SDK: 34</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div>
                  <span className="text-gray-400 block text-[10px]">Package / Namespace:</span>
                  <span className="text-[#3ddc84] font-semibold">{parsedManifest.packageName || 'Defined in build.gradle.kts'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Application Label:</span>
                  <span className="text-white">{parsedManifest.application.label || '@string/app_name'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Uses-Permission Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-white flex items-center gap-1.5 text-xs">
                <ShieldCheck className="w-4 h-4 text-[#3ddc84]" />
                <span>Declared Permissions ({parsedManifest?.permissions.length || 0})</span>
              </h3>
            </div>

            {/* Current Permissions List */}
            <div className="space-y-1.5 mb-3">
              {parsedManifest?.permissions && parsedManifest.permissions.length > 0 ? (
                parsedManifest.permissions.map((perm) => (
                  <div
                    key={perm}
                    className="p-2 bg-[#2b2d30] border border-[#393b40] rounded-lg flex items-center justify-between font-mono text-[11px]"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-[#3ddc84]" />
                      <span className="text-white truncate font-semibold">{perm}</span>
                    </div>
                    <button
                      onClick={() => handleRemovePermission(perm)}
                      className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded transition-colors"
                      title="Remove Permission"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-[#2b2d30]/50 border border-dashed border-[#393b40] rounded-lg text-center text-gray-400 text-xs">
                  No permissions currently declared in manifest.
                </div>
              )}
            </div>

            {/* Add Custom / Suggested Permission */}
            <div className="bg-[#18191c] p-3 rounded-lg border border-[#2b2d30] space-y-2">
              <div className="text-[10px] text-gray-400 font-bold uppercase">Add New Permission</div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="e.g. android.permission.CAMERA"
                  value={newPermissionInput}
                  onChange={(e) => setNewPermissionInput(e.target.value)}
                  className="flex-1 bg-[#2b2d30] border border-[#393b40] rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-[#3574f0]"
                />
                <button
                  onClick={() => handleAddPermission(newPermissionInput)}
                  className="px-3 py-1.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white font-bold text-xs flex items-center space-x-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              {/* Quick suggestions chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestedPermissions.map((sPerm) => {
                  const already = parsedManifest?.permissions.includes(sPerm);
                  return (
                    <button
                      key={sPerm}
                      onClick={() => handleAddPermission(sPerm)}
                      disabled={already}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${
                        already
                          ? 'bg-[#3ddc84]/10 border-[#3ddc84]/30 text-[#3ddc84] cursor-default'
                          : 'bg-[#2b2d30] border-[#393b40] text-gray-300 hover:border-gray-400'
                      }`}
                    >
                      +{sPerm.replace('android.permission.', '')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Activities Section */}
          <div>
            <h3 className="font-bold text-white mb-2 flex items-center gap-1.5 text-xs">
              <ActivityIcon className="w-4 h-4 text-[#3574f0]" />
              <span>Registered Activities ({parsedManifest?.activities.length || 0})</span>
            </h3>

            <div className="space-y-2 mb-3">
              {parsedManifest?.activities.map((act) => (
                <div
                  key={act.name}
                  className="p-3 bg-[#2b2d30] border border-[#393b40] rounded-xl font-mono space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-white font-bold text-xs truncate">{act.name}</span>
                      {act.isLauncher && (
                        <span className="text-[10px] bg-[#3ddc84]/20 text-[#3ddc84] px-1.5 py-0.5 rounded font-bold">
                          LAUNCHER
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleExported(act.name, act.exported)}
                        className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                          act.exported === 'true'
                            ? 'bg-[#3ddc84]/10 border-[#3ddc84]/40 text-[#3ddc84]'
                            : 'bg-gray-700/30 border-gray-600 text-gray-400'
                        }`}
                        title="Toggle android:exported attribute"
                      >
                        exported="{act.exported}"
                      </button>

                      <button
                        onClick={() => handleRemoveActivity(act.name)}
                        className="p-1 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded"
                        title="Delete Activity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {act.actions.length > 0 && (
                    <div className="text-[10px] text-gray-400">
                      <span>Actions: </span>
                      <span className="text-gray-300">{act.actions.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Activity */}
            <div className="flex items-center space-x-2 bg-[#18191c] p-2.5 rounded-lg border border-[#2b2d30]">
              <input
                type="text"
                placeholder="New Activity name (e.g. .DetailActivity)"
                value={newActivityInput}
                onChange={(e) => setNewActivityInput(e.target.value)}
                className="flex-1 bg-[#2b2d30] border border-[#393b40] rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#3574f0]"
              />
              <button
                onClick={handleAddActivity}
                className="px-3 py-1 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white font-bold text-xs flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add Activity</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Raw XML tab */
        <div className="flex-1 flex flex-col p-2">
          <textarea
            value={rawXml}
            onChange={(e) => {
              setRawXml(e.target.value);
              onSaveContent(e.target.value);
            }}
            spellCheck={false}
            className="flex-1 bg-[#18191c] text-[#bcbec4] p-3 font-mono text-xs leading-relaxed resize-none focus:outline-none rounded border border-[#2b2d30]"
          />
        </div>
      )}
    </div>
  );
};
