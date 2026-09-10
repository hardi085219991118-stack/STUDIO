import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  Layers, Plus, Trash2, ZoomIn, ZoomOut, RotateCcw, 
  Smartphone, Code, Eye, Split, Sliders, CheckSquare, 
  ToggleLeft, Radio, AlignJustify, Box, Edit3, AlertCircle,
  Type, Image as ImageIcon, Check, Info, Save, Undo, Redo,
  FileCode, ArrowUp, ArrowDown, ChevronRight, ChevronDown, 
  Monitor, Smartphone as PhoneIcon, RefreshCw, X, FolderPlus
} from 'lucide-react';
import { ProjectFile } from '../types';

export interface ParsedXmlNode {
  internalId: string;
  tag: string;
  shortTag: string;
  attributes: Record<string, string>;
  children: ParsedXmlNode[];
}

interface LayoutEditorProps {
  xmlContent: string;
  currentFile?: ProjectFile;
  allLayoutFiles?: ProjectFile[];
  onSelectLayout?: (file: ProjectFile) => void;
  onCreateLayout?: (name: string) => void;
  onUpdateXml: (newXml: string) => void;
  onSaveLayout?: () => void;
  onClose: () => void;
}

export const LayoutEditor: React.FC<LayoutEditorProps> = ({
  xmlContent,
  currentFile,
  allLayoutFiles = [],
  onSelectLayout,
  onCreateLayout,
  onUpdateXml,
  onSaveLayout,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'design' | 'split' | 'code'>('split');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [deviceOrientation, setDeviceOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [selectedInternalId, setSelectedInternalId] = useState<string | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  const [parseError, setParseError] = useState<{ message: string; line?: number; column?: number } | null>(null);
  const [customAttrKey, setCustomAttrKey] = useState('');
  const [customAttrVal, setCustomAttrVal] = useState('');
  const [showNewLayoutDialog, setShowNewLayoutDialog] = useState(false);
  const [newLayoutFileName, setNewLayoutFileName] = useState('');

  // Undo / Redo history
  const [history, setHistory] = useState<string[]>([xmlContent]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const pushHistory = (newXml: string) => {
    const updated = history.slice(0, historyIndex + 1);
    updated.push(newXml);
    if (updated.length > 30) updated.shift();
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
    onUpdateXml(newXml);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevXml = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateXml(prevXml);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextXml = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateXml(nextXml);
    }
  };

  // Parse XML dynamically using DOMParser with strict error extraction
  const parsedRoot = useMemo<ParsedXmlNode | null>(() => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'application/xml');
      const errorNode = doc.querySelector('parsererror');
      if (errorNode) {
        const errorText = errorNode.textContent || 'XML syntax error';
        const lineMatch = errorText.match(/line\s*(\d+)/i);
        const colMatch = errorText.match(/column\s*(\d+)/i);
        setParseError({
          message: errorText.replace(/Below is a rendering of the page up to the first error\..*/s, '').trim(),
          line: lineMatch ? parseInt(lineMatch[1], 10) : undefined,
          column: colMatch ? parseInt(colMatch[1], 10) : undefined,
        });
        return null;
      }
      setParseError(null);

      let counter = 0;
      const convertNode = (element: Element): ParsedXmlNode => {
        counter++;
        const tag = element.tagName;
        const shortTag = tag.includes('.') ? tag.split('.').pop()! : tag;
        const attributes: Record<string, string> = {};
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          attributes[attr.name] = attr.value;
        }

        const internalId = attributes['android:id'] 
          ? attributes['android:id'].replace('@+id/', '').replace('@id/', '')
          : `${shortTag.toLowerCase()}_${counter}`;

        const children: ParsedXmlNode[] = [];
        for (let i = 0; i < element.children.length; i++) {
          children.push(convertNode(element.children[i]));
        }

        return {
          internalId,
          tag,
          shortTag,
          attributes,
          children,
        };
      };

      if (doc.documentElement) {
        return convertNode(doc.documentElement);
      }
      return null;
    } catch (err: any) {
      setParseError({ message: err.message || 'Failed to parse XML' });
      return null;
    }
  }, [xmlContent]);

  // Set default selection to root if none selected
  React.useEffect(() => {
    if (parsedRoot && !selectedInternalId) {
      setSelectedInternalId(parsedRoot.internalId);
    }
  }, [parsedRoot, selectedInternalId]);

  // Find selected node in tree
  const findNode = useCallback((node: ParsedXmlNode | null, id: string | null): ParsedXmlNode | null => {
    if (!node || !id) return null;
    if (node.internalId === id) return node;
    for (const child of node.children) {
      const res = findNode(child, id);
      if (res) return res;
    }
    return null;
  }, []);

  const selectedNode = useMemo(() => {
    return findNode(parsedRoot, selectedInternalId);
  }, [parsedRoot, selectedInternalId, findNode]);

  // Serialize DOM tree back to XML string
  const serializeTree = (root: ParsedXmlNode, indent = 0): string => {
    const spaces = '    '.repeat(indent);
    const attrLines: string[] = [];
    
    // Namespaces on root
    if (indent === 0) {
      if (!root.attributes['xmlns:android']) {
        root.attributes['xmlns:android'] = 'http://schemas.android.com/apk/res/android';
      }
      if (!root.attributes['xmlns:app'] && (root.tag.includes('Constraint') || Object.keys(root.attributes).some(k => k.startsWith('app:')))) {
        root.attributes['xmlns:app'] = 'http://schemas.android.com/apk/res-auto';
      }
      if (!root.attributes['xmlns:tools']) {
        root.attributes['xmlns:tools'] = 'http://schemas.android.com/tools';
      }
    }

    // Android id first
    if (root.attributes['android:id']) {
      attrLines.push(`${spaces}    android:id="${root.attributes['android:id']}"`);
    }

    // layout_width and layout_height
    if (root.attributes['android:layout_width']) {
      attrLines.push(`${spaces}    android:layout_width="${root.attributes['android:layout_width']}"`);
    }
    if (root.attributes['android:layout_height']) {
      attrLines.push(`${spaces}    android:layout_height="${root.attributes['android:layout_height']}"`);
    }

    // Other attributes
    for (const [k, v] of Object.entries(root.attributes)) {
      if (k === 'android:id' || k === 'android:layout_width' || k === 'android:layout_height') continue;
      attrLines.push(`${spaces}    ${k}="${v}"`);
    }

    const attrsStr = attrLines.length > 0 ? '\n' + attrLines.join('\n') : '';

    if (root.children.length === 0) {
      return `${spaces}<${root.tag}${attrsStr} />`;
    }

    const childrenStr = root.children.map(c => serializeTree(c, indent + 1)).join('\n\n');
    return `${spaces}<${root.tag}${attrsStr}>\n\n${childrenStr}\n\n${spaces}</${root.tag}>`;
  };

  // Deep clone tree
  const cloneTree = (node: ParsedXmlNode): ParsedXmlNode => ({
    ...node,
    attributes: { ...node.attributes },
    children: node.children.map(cloneTree),
  });

  // Update attributes of a node
  const handleUpdateAttribute = (key: string, value: string) => {
    if (!parsedRoot || !selectedInternalId) return;
    const newRoot = cloneTree(parsedRoot);

    const updateRecursive = (cur: ParsedXmlNode): boolean => {
      if (cur.internalId === selectedInternalId) {
        if (value === '') {
          delete cur.attributes[key];
        } else {
          cur.attributes[key] = value;
          // If updating id, update internalId as well
          if (key === 'android:id') {
            const cleanId = value.replace('@+id/', '').replace('@id/', '');
            cur.internalId = cleanId;
            setSelectedInternalId(cleanId);
          }
        }
        return true;
      }
      for (const child of cur.children) {
        if (updateRecursive(child)) return true;
      }
      return false;
    };

    updateRecursive(newRoot);
    const newXml = '<?xml version="1.0" encoding="utf-8"?>\n' + serializeTree(newRoot);
    pushHistory(newXml);
  };

  // Delete selected node
  const handleDeleteNode = (idToDelete: string) => {
    if (!parsedRoot) return;
    if (parsedRoot.internalId === idToDelete) {
      return; // Cannot delete root
    }
    const newRoot = cloneTree(parsedRoot);

    const deleteRecursive = (cur: ParsedXmlNode): boolean => {
      const idx = cur.children.findIndex(c => c.internalId === idToDelete);
      if (idx !== -1) {
        cur.children.splice(idx, 1);
        return true;
      }
      for (const child of cur.children) {
        if (deleteRecursive(child)) return true;
      }
      return false;
    };

    deleteRecursive(newRoot);
    setSelectedInternalId(newRoot.internalId);
    const newXml = '<?xml version="1.0" encoding="utf-8"?>\n' + serializeTree(newRoot);
    pushHistory(newXml);
  };

  // Reorder node (move up / down)
  const handleMoveNode = (idToMove: string, direction: 'up' | 'down') => {
    if (!parsedRoot || parsedRoot.internalId === idToMove) return;
    const newRoot = cloneTree(parsedRoot);

    const moveRecursive = (cur: ParsedXmlNode): boolean => {
      const idx = cur.children.findIndex(c => c.internalId === idToMove);
      if (idx !== -1) {
        if (direction === 'up' && idx > 0) {
          const temp = cur.children[idx];
          cur.children[idx] = cur.children[idx - 1];
          cur.children[idx - 1] = temp;
          return true;
        } else if (direction === 'down' && idx < cur.children.length - 1) {
          const temp = cur.children[idx];
          cur.children[idx] = cur.children[idx + 1];
          cur.children[idx + 1] = temp;
          return true;
        }
        return false;
      }
      for (const child of cur.children) {
        if (moveRecursive(child)) return true;
      }
      return false;
    };

    if (moveRecursive(newRoot)) {
      const newXml = '<?xml version="1.0" encoding="utf-8"?>\n' + serializeTree(newRoot);
      pushHistory(newXml);
    }
  };

  // Add component from palette
  const handleAddPaletteItem = (tag: string, defaultAttrs: Record<string, string>) => {
    if (!parsedRoot) return;
    const newRoot = cloneTree(parsedRoot);

    const isContainer = (node: ParsedXmlNode) =>
      ['LinearLayout', 'RelativeLayout', 'FrameLayout', 'ConstraintLayout', 'CoordinatorLayout', 'ScrollView', 'CardView'].some(c => node.shortTag.includes(c));

    const targetContainer = selectedNode && isContainer(selectedNode)
      ? selectedNode.internalId
      : newRoot.internalId;

    const newId = `${tag.toLowerCase()}_${Date.now().toString().slice(-4)}`;
    const newNode: ParsedXmlNode = {
      internalId: newId,
      tag,
      shortTag: tag,
      attributes: {
        'android:id': `@+id/${newId}`,
        'android:layout_width': 'match_parent',
        'android:layout_height': 'wrap_content',
        ...defaultAttrs,
      },
      children: [],
    };

    const insertRecursive = (cur: ParsedXmlNode): boolean => {
      if (cur.internalId === targetContainer) {
        cur.children.push(newNode);
        return true;
      }
      for (const child of cur.children) {
        if (insertRecursive(child)) return true;
      }
      return false;
    };

    insertRecursive(newRoot);
    setSelectedInternalId(newId);
    const newXml = '<?xml version="1.0" encoding="utf-8"?>\n' + serializeTree(newRoot);
    pushHistory(newXml);
  };

  // Format XML code cleanly
  const handleFormatXml = () => {
    if (parsedRoot) {
      const formatted = '<?xml version="1.0" encoding="utf-8"?>\n' + serializeTree(parsedRoot);
      pushHistory(formatted);
    }
  };

  // Palette components list as requested
  const paletteItems = [
    { tag: 'TextView', label: 'TextView', icon: 'T', defaultAttrs: { 'android:text': 'Hello World', 'android:textSize': '16sp', 'android:textColor': '#FFFFFF' } },
    { tag: 'Button', label: 'Button', icon: 'B', defaultAttrs: { 'android:text': 'Button', 'android:backgroundTint': '#3DDC84', 'android:textColor': '#121316' } },
    { tag: 'EditText', label: 'EditText', icon: 'I', defaultAttrs: { 'android:hint': 'Enter text...', 'android:textColor': '#FFFFFF' } },
    { tag: 'ImageView', label: 'ImageView', icon: '🖼', defaultAttrs: { 'android:src': '@mipmap/ic_launcher', 'android:layout_height': '64dp' } },
    { tag: 'CheckBox', label: 'CheckBox', icon: '☑', defaultAttrs: { 'android:text': 'CheckBox', 'android:textColor': '#FFFFFF' } },
    { tag: 'RadioButton', label: 'RadioButton', icon: '◉', defaultAttrs: { 'android:text': 'RadioButton', 'android:textColor': '#FFFFFF' } },
    { tag: 'Switch', label: 'Switch', icon: '⚡', defaultAttrs: { 'android:text': 'Switch', 'android:textColor': '#FFFFFF' } },
    { tag: 'ProgressBar', label: 'ProgressBar', icon: '⏳', defaultAttrs: { 'android:layout_width': 'wrap_content' } },
    { tag: 'RecyclerView', label: 'RecyclerView', icon: '☰', defaultAttrs: { 'android:layout_height': '200dp' } },
    { tag: 'WebView', label: 'WebView', icon: '🌐', defaultAttrs: { 'android:layout_height': '200dp' } },
    { tag: 'View', label: 'View (Divider)', icon: '—', defaultAttrs: { 'android:layout_height': '1dp', 'android:background': '#2B2D30' } },
    { tag: 'Space', label: 'Space', icon: '␣', defaultAttrs: { 'android:layout_height': '16dp' } },
    { tag: 'LinearLayout', label: 'LinearLayout', icon: '⊞', defaultAttrs: { 'android:orientation': 'vertical', 'android:layout_height': 'wrap_content', 'android:padding': '16dp' } },
    { tag: 'FrameLayout', label: 'FrameLayout', icon: '❐', defaultAttrs: { 'android:layout_height': 'wrap_content', 'android:padding': '8dp' } },
    { tag: 'ConstraintLayout', label: 'ConstraintLayout', icon: '⛶', defaultAttrs: { 'android:layout_height': 'match_parent' } },
    { tag: 'ScrollView', label: 'ScrollView', icon: '↕', defaultAttrs: { 'android:layout_height': 'match_parent' } },
  ];

  // Component Tree recursive renderer with expand/collapse
  const renderTreeItem = (node: ParsedXmlNode, depth = 0) => {
    const isSelected = selectedInternalId === node.internalId;
    const isContainer = ['LinearLayout', 'RelativeLayout', 'FrameLayout', 'ConstraintLayout', 'CoordinatorLayout', 'ScrollView', 'CardView'].some(c => node.shortTag.includes(c));
    const isCollapsed = collapsedNodes[node.internalId] || false;

    return (
      <div key={node.internalId} className="select-none">
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
          className={`group py-1 pr-2 rounded cursor-pointer flex items-center justify-between text-[11px] font-mono transition-colors ${
            isSelected ? 'bg-[#3574f0] text-white font-semibold' : 'hover:bg-[#2b2d30] text-[#bcbec4]'
          }`}
        >
          <div className="flex items-center space-x-1.5 truncate">
            {isContainer && node.children.length > 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCollapsedNodes(prev => ({ ...prev, [node.internalId]: !prev[node.internalId] }));
                }}
                className="p-0.5 hover:bg-black/20 rounded"
              >
                {isCollapsed ? <ChevronRight className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              </button>
            ) : (
              <span className="w-2.5" />
            )}

            {isContainer ? (
              <Box className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-[#3574f0]'}`} />
            ) : node.shortTag === 'TextView' ? (
              <Type className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-[#3ddc84]'}`} />
            ) : node.shortTag === 'Button' ? (
              <span className={`w-3 h-3 text-[9px] font-bold flex items-center justify-center ${isSelected ? 'text-white' : 'text-[#3574f0]'}`}>B</span>
            ) : (
              <span className="text-[10px]">⚙</span>
            )}

            <span className="truncate">{node.internalId}</span>
            <span className={`text-[9px] ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>({node.shortTag})</span>
          </div>

          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
            {node !== parsedRoot && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveNode(node.internalId, 'up');
                  }}
                  className="p-0.5 hover:text-white"
                  title="Move Up"
                >
                  <ArrowUp className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveNode(node.internalId, 'down');
                  }}
                  className="p-0.5 hover:text-white"
                  title="Move Down"
                >
                  <ArrowDown className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNode(node.internalId);
                  }}
                  className="hover:text-red-400 p-0.5"
                  title="Delete View"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {!isCollapsed && node.children.map(child => renderTreeItem(child, depth + 1))}
      </div>
    );
  };

  // Supported vs Unsupported view tag renderer
  const renderPreviewNode = (node: ParsedXmlNode): React.ReactNode => {
    const isSelected = selectedInternalId === node.internalId;
    const tag = node.shortTag;
    const attrs = node.attributes;

    const width = attrs['android:layout_width'];
    const height = attrs['android:layout_height'];
    const text = attrs['android:text'] || '';
    const hint = attrs['android:hint'] || '';
    const orientation = attrs['android:orientation'] || 'vertical';
    const bgTint = attrs['android:backgroundTint'] || '#3DDC84';
    const bg = attrs['android:background'] || '';
    const textColor = attrs['android:textColor'] || '#FFFFFF';
    const visibility = attrs['android:visibility'] || 'visible';

    if (visibility === 'gone') return null;

    const baseWrapperClass = `cursor-pointer transition-all relative ${
      isSelected ? 'ring-2 ring-[#3574f0] ring-offset-1 ring-offset-[#18191c]' : 'hover:outline hover:outline-1 hover:outline-[#3574f0]/50'
    } ${visibility === 'invisible' ? 'opacity-0' : 'opacity-100'}`;

    // 1. Containers
    if (['LinearLayout', 'RelativeLayout', 'ConstraintLayout', 'FrameLayout', 'ScrollView', 'CoordinatorLayout', 'CardView'].some(c => tag.includes(c))) {
      const isHorizontal = orientation === 'horizontal';
      return (
        <div
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          style={{
            backgroundColor: bg.startsWith('#') ? bg : undefined,
          }}
          className={`${baseWrapperClass} flex ${isHorizontal ? 'flex-row items-center space-x-2' : 'flex-col space-y-2.5'} p-2 rounded-lg bg-black/10 border border-white/5 w-full min-h-[40px]`}
        >
          {node.children.length === 0 ? (
            <div className="py-3 text-center text-gray-500 text-[10px] italic w-full border border-dashed border-gray-700/60 rounded">
              Empty {tag} (Add views from Palette)
            </div>
          ) : (
            node.children.map(child => renderPreviewNode(child))
          )}
        </div>
      );
    }

    // 2. TextView
    if (tag === 'TextView') {
      return (
        <div
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          style={{ color: textColor }}
          className={`${baseWrapperClass} py-1 px-1 font-sans text-xs break-words max-w-full`}
        >
          {text || '(Empty TextView)'}
        </div>
      );
    }

    // 3. Button
    if (tag === 'Button') {
      return (
        <button
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          style={{ backgroundColor: bgTint, color: textColor }}
          className={`${baseWrapperClass} w-full py-2 px-3 rounded-lg font-bold text-xs shadow hover:opacity-90 active:scale-95 transition-transform truncate`}
        >
          {text || 'Button'}
        </button>
      );
    }

    // 4. EditText
    if (tag === 'EditText') {
      return (
        <div
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          className={`${baseWrapperClass} w-full bg-[#2b2d30] border border-[#393b40] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 font-sans`}
        >
          {text || <span className="text-gray-500 italic">{hint || 'EditText Input'}</span>}
        </div>
      );
    }

    // 5. ImageView
    if (tag === 'ImageView') {
      return (
        <div
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          className={`${baseWrapperClass} w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3ddc84] to-[#07c160] flex items-center justify-center mx-auto shadow-md`}
        >
          <Smartphone className="w-8 h-8 text-[#121316]" />
        </div>
      );
    }

    // 6. CheckBox
    if (tag === 'CheckBox') {
      return (
        <div
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          className={`${baseWrapperClass} w-full flex items-center space-x-2 p-1 text-xs`}
        >
          <div className="w-4 h-4 rounded border border-[#3ddc84] bg-[#3ddc84]/20 flex items-center justify-center">
            <Check className="w-3 h-3 text-[#3ddc84]" />
          </div>
          <span className="text-white">{text || 'CheckBox Option'}</span>
        </div>
      );
    }

    // 7. RadioButton
    if (tag === 'RadioButton') {
      return (
        <div
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          className={`${baseWrapperClass} w-full flex items-center space-x-2 p-1 text-xs`}
        >
          <div className="w-4 h-4 rounded-full border border-[#3ddc84] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#3ddc84]" />
          </div>
          <span className="text-white">{text || 'RadioButton Option'}</span>
        </div>
      );
    }

    // 8. Switch
    if (tag === 'Switch') {
      return (
        <div
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          className={`${baseWrapperClass} w-full flex items-center justify-between p-1.5 bg-[#2b2d30]/50 rounded-lg text-xs`}
        >
          <span className="text-white">{text || 'Switch Option'}</span>
          <div className="w-8 h-4 rounded-full bg-[#3ddc84] relative flex items-center px-0.5">
            <div className="w-3 h-3 rounded-full bg-[#121316] ml-auto shadow" />
          </div>
        </div>
      );
    }

    // 9. ProgressBar
    if (tag === 'ProgressBar') {
      return (
        <div
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          className={`${baseWrapperClass} w-full py-2 flex flex-col items-center`}
        >
          <div className="w-6 h-6 border-2 border-[#3574f0] border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    // 10. RecyclerView
    if (tag === 'RecyclerView') {
      return (
        <div
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          className={`${baseWrapperClass} w-full p-2 bg-[#2b2d30]/60 border border-[#393b40] rounded-lg space-y-1`}
        >
          <div className="text-[10px] font-mono text-[#3ddc84] flex items-center justify-between border-b border-[#393b40] pb-1">
            <span>RecyclerView</span>
            <span>ViewHolder list</span>
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="h-6 bg-[#1e1f22] rounded px-2 flex items-center text-[10px] text-gray-400">
              Item #{i} - list_item.xml
            </div>
          ))}
        </div>
      );
    }

    // 11. WebView
    if (tag === 'WebView') {
      return (
        <div
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          className={`${baseWrapperClass} w-full h-28 bg-[#1e1f22] border border-[#393b40] rounded-lg flex flex-col items-center justify-center text-gray-500`}
        >
          <span className="text-sm">🌐</span>
          <span className="text-[10px] font-mono mt-1">android.webkit.WebView</span>
        </div>
      );
    }

    // 12. View / Space / Divider
    if (tag === 'View' || tag === 'Space') {
      return (
        <div
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          style={{
            backgroundColor: bg.startsWith('#') ? bg : '#2b2d30',
            height: height && height.includes('dp') ? height : '1px',
          }}
          className={`${baseWrapperClass} w-full my-1 rounded`}
        />
      );
    }

    // 13. UNSUPPORTED VIEW - Explicit rule: do not fake, clearly indicate unsupported
    return (
      <div
        key={node.internalId}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedInternalId(node.internalId);
        }}
        className={`${baseWrapperClass} p-2 bg-amber-500/10 border border-dashed border-amber-500/40 rounded text-center text-xs`}
      >
        <div className="text-[10px] font-bold text-amber-400">UNSUPPORTED VIEW</div>
        <div className="font-mono text-[9px] text-gray-400 mt-0.5">&lt;{tag}&gt; ({node.internalId})</div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1f22] text-[#bcbec4] select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="bg-[#18191c] border-b border-[#2b2d30] px-3 py-1.5 flex items-center justify-between text-xs shrink-0 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#3574f0]" />
            <span>Layout Editor</span>
          </span>

          {/* Active Layout File Selector */}
          {allLayoutFiles.length > 0 && onSelectLayout && (
            <div className="flex items-center space-x-1">
              <select
                value={currentFile?.path || ''}
                onChange={(e) => {
                  const target = allLayoutFiles.find(f => f.path === e.target.value);
                  if (target) onSelectLayout(target);
                }}
                className="bg-[#2b2d30] text-[#3ddc84] font-mono text-[11px] rounded px-2 py-0.5 border border-[#393b40] focus:outline-none"
              >
                {allLayoutFiles.map(f => (
                  <option key={f.id} value={f.path}>{f.name}</option>
                ))}
              </select>

              {onCreateLayout && (
                <button
                  onClick={() => setShowNewLayoutDialog(true)}
                  className="p-1 hover:bg-[#2b2d30] rounded text-gray-400 hover:text-white"
                  title="Create New XML Layout"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <span className="text-[10px] bg-[#3574f0]/15 text-[#3574f0] font-mono px-1.5 py-0.5 rounded border border-[#3574f0]/30 font-semibold">
            XML SOURCE OF TRUTH
          </span>

          {/* View Mode Toggle */}
          <div className="bg-[#2b2d30] rounded p-0.5 flex items-center space-x-1 border border-[#393b40]">
            <button
              onClick={() => setViewMode('design')}
              className={`px-2 py-0.5 rounded text-[11px] ${viewMode === 'design' ? 'bg-[#3574f0] text-white font-medium' : 'text-gray-400 hover:text-white'}`}
            >
              Design
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-0.5 rounded text-[11px] ${viewMode === 'split' ? 'bg-[#3574f0] text-white font-medium' : 'text-gray-400 hover:text-white'}`}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-2 py-0.5 rounded text-[11px] ${viewMode === 'code' ? 'bg-[#3574f0] text-white font-medium' : 'text-gray-400 hover:text-white'}`}
            >
              Code
            </button>
          </div>
        </div>

        {/* Action Controls: Undo, Redo, Format, Save, Orientation, Zoom, Close */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-1 hover:bg-[#2b2d30] rounded text-gray-300 disabled:opacity-30"
            title="Undo (Layout)"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-1 hover:bg-[#2b2d30] rounded text-gray-300 disabled:opacity-30"
            title="Redo (Layout)"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleFormatXml}
            className="px-2 py-0.5 rounded bg-[#2b2d30] hover:bg-[#393b40] text-gray-300 text-[11px] font-mono border border-[#393b40]"
            title="Reformat XML indentation"
          >
            Format XML
          </button>

          {onSaveLayout && (
            <button
              onClick={onSaveLayout}
              className="px-2.5 py-0.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white text-[11px] font-bold flex items-center space-x-1"
              title="Save layout to project disk"
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
          )}

          <div className="h-3 w-[1px] bg-[#393b40]" />

          {/* Orientation Toggle */}
          <button
            onClick={() => setDeviceOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait')}
            className={`p-1 rounded ${deviceOrientation === 'landscape' ? 'bg-[#3574f0] text-white' : 'hover:bg-[#2b2d30] text-gray-400'}`}
            title={`Orientation: ${deviceOrientation}`}
          >
            <PhoneIcon className={`w-3.5 h-3.5 ${deviceOrientation === 'landscape' ? 'rotate-90' : ''}`} />
          </button>

          {/* Zoom */}
          <span className="text-[11px] text-gray-400 font-mono">{zoomLevel}%</span>
          <button onClick={() => setZoomLevel(prev => Math.max(prev - 20, 50))} className="p-1 hover:bg-[#2b2d30] rounded text-gray-300">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setZoomLevel(100)} className="p-1 hover:bg-[#2b2d30] rounded text-gray-300">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setZoomLevel(prev => Math.min(prev + 20, 200))} className="p-1 hover:bg-[#2b2d30] rounded text-gray-300">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="h-3 w-[1px] bg-[#393b40]" />

          <button onClick={onClose} className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded text-gray-400" title="Close Layout Editor">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Parse Error Banner if invalid XML */}
      {parseError && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-3 py-1.5 flex items-center justify-between text-xs text-red-300 font-mono shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="truncate font-semibold">XML Validation Problem: {parseError.message}</span>
            {parseError.line !== undefined && (
              <span className="bg-red-900/40 px-1.5 py-0.5 rounded text-[10px]">
                Line {parseError.line}{parseError.column ? `:${parseError.column}` : ''}
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400">Switch to Code mode to correct syntax</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Palette & Component Tree */}
        {(viewMode === 'design' || viewMode === 'split') && (
          <div className="w-52 bg-[#18191c] border-r border-[#2b2d30] flex flex-col shrink-0 text-xs">
            {/* Palette */}
            <div className="p-2 border-b border-[#2b2d30] max-h-48 overflow-y-auto">
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 flex items-center justify-between sticky top-0 bg-[#18191c] py-0.5">
                <span>Palette</span>
                <span className="text-[9px] text-gray-500 font-mono">Click to Add</span>
              </div>
              <div className="grid grid-cols-2 gap-1 font-mono text-[10px]">
                {paletteItems.map((item) => (
                  <div
                    key={item.tag}
                    className="p-1.5 bg-[#2b2d30] rounded border border-[#393b40] hover:border-[#3574f0] cursor-pointer flex items-center space-x-1.5 active:scale-95 transition-transform"
                    title={`Add ${item.label} to layout`}
                    onClick={() => handleAddPaletteItem(item.tag, item.defaultAttrs)}
                  >
                    <span className="w-3.5 h-3.5 bg-[#1e1f22] text-[#3ddc84] rounded flex items-center justify-center font-bold text-[10px]">
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Component Tree */}
            <div className="flex-1 p-2 overflow-y-auto">
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 flex items-center justify-between">
                <span>Component Tree</span>
                {selectedNode && (
                  <span className="text-[9px] text-[#3574f0] font-mono truncate max-w-[80px]">
                    {selectedNode.internalId}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                {parsedRoot ? (
                  renderTreeItem(parsedRoot)
                ) : (
                  <div className="text-gray-500 text-[11px] italic p-2">No valid XML tree parsed</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Center: Live XML-driven Preview */}
        {(viewMode === 'design' || viewMode === 'split') && (
          <div className="flex-1 bg-[#121316] flex flex-col items-center justify-center p-4 overflow-auto">
            {/* Explicit Label: DESIGN PREVIEW */}
            <div className="mb-2 text-[10px] font-mono text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3ddc84]" />
              <span className="font-semibold text-gray-300">DESIGN PREVIEW</span>
              <span className="text-gray-500 text-[9px]">(HTML/CSS Visual Approximation — Canvas)</span>
            </div>

            <div
              style={{
                transform: `scale(${zoomLevel / 100})`,
                transformOrigin: 'center center',
                width: deviceOrientation === 'portrait' ? '290px' : '530px',
                height: deviceOrientation === 'portrait' ? '530px' : '290px',
              }}
              className="bg-[#18191c] border-4 border-[#2b2d30] rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative transition-all"
            >
              {/* Phone Status Bar */}
              <div className="h-6 bg-black/60 px-4 flex items-center justify-between text-[10px] font-mono text-gray-300 select-none shrink-0">
                <span>12:00</span>
                <div className="w-2.5 h-2.5 rounded-full bg-black mx-auto" />
                <div className="flex items-center space-x-1.5 text-[9px]">
                  <span>5G</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Dynamic Rendered Content */}
              <div className="flex-1 p-3 bg-[#121316] overflow-y-auto flex flex-col">
                {parsedRoot ? (
                  renderPreviewNode(parsedRoot)
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 text-xs p-4">
                    <AlertCircle className="w-8 h-8 mb-2 text-amber-400" />
                    <span>Layout preview cannot be rendered due to XML syntax error.</span>
                  </div>
                )}
              </div>

              {/* Navigation Bar */}
              <div className="h-6 bg-black/80 flex items-center justify-around text-gray-400 text-xs shrink-0 select-none">
                <span>◀</span>
                <span>●</span>
                <span>■</span>
              </div>
            </div>
          </div>
        )}

        {/* Right: Code Source Editor (Split or Code mode) */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className="flex-1 flex flex-col bg-[#1e1f22] border-l border-[#2b2d30] min-w-[280px]">
            <div className="bg-[#18191c] px-3 py-1.5 text-xs text-gray-400 border-b border-[#2b2d30] font-mono flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1.5 text-white font-medium">
                <Code className="w-3.5 h-3.5 text-[#3574f0]" />
                <span>{currentFile?.name || 'layout.xml'}</span>
              </span>
              <span className="text-[10px] text-[#3ddc84] font-mono">Bi-directional Sync</span>
            </div>
            <textarea
              value={xmlContent}
              onChange={(e) => {
                pushHistory(e.target.value);
              }}
              spellCheck={false}
              className="flex-1 bg-[#1e1f22] text-[#bcbec4] p-3 font-mono text-xs leading-relaxed resize-none focus:outline-none"
            />
          </div>
        )}

        {/* Far Right: Attributes Inspector (Visible in Design mode) */}
        {viewMode === 'design' && selectedNode && (
          <div className="w-64 bg-[#18191c] border-l border-[#2b2d30] p-3 text-xs flex flex-col shrink-0 overflow-y-auto">
            <div className="text-[11px] uppercase font-bold text-white mb-3 flex items-center justify-between pb-2 border-b border-[#2b2d30]">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#3574f0]" />
                <span>Attributes</span>
              </span>
              <span className="text-[10px] text-[#3ddc84] font-mono truncate max-w-[80px]">
                {selectedNode.shortTag}
              </span>
            </div>

            <div className="space-y-3 font-mono text-[11px]">
              {/* ID */}
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">android:id</label>
                <input
                  type="text"
                  value={selectedNode.attributes['android:id'] || ''}
                  onChange={(e) => handleUpdateAttribute('android:id', e.target.value)}
                  placeholder="@+id/my_view"
                  className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#3574f0]"
                />
              </div>

              {/* Layout Dimensions */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">width</label>
                  <select
                    value={selectedNode.attributes['android:layout_width'] || 'wrap_content'}
                    onChange={(e) => handleUpdateAttribute('android:layout_width', e.target.value)}
                    className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-1.5 py-1 text-white text-[11px] focus:outline-none"
                  >
                    <option value="wrap_content">wrap_content</option>
                    <option value="match_parent">match_parent</option>
                    <option value="100dp">100dp</option>
                    <option value="200dp">200dp</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">height</label>
                  <select
                    value={selectedNode.attributes['android:layout_height'] || 'wrap_content'}
                    onChange={(e) => handleUpdateAttribute('android:layout_height', e.target.value)}
                    className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-1.5 py-1 text-white text-[11px] focus:outline-none"
                  >
                    <option value="wrap_content">wrap_content</option>
                    <option value="match_parent">match_parent</option>
                    <option value="48dp">48dp</option>
                    <option value="120dp">120dp</option>
                  </select>
                </div>
              </div>

              {/* Text */}
              {selectedNode.attributes['android:text'] !== undefined && (
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">android:text</label>
                  <input
                    type="text"
                    value={selectedNode.attributes['android:text'] || ''}
                    onChange={(e) => handleUpdateAttribute('android:text', e.target.value)}
                    placeholder="Text value"
                    className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#3574f0]"
                  />
                </div>
              )}

              {/* Text Size */}
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">android:textSize</label>
                <input
                  type="text"
                  value={selectedNode.attributes['android:textSize'] || ''}
                  onChange={(e) => handleUpdateAttribute('android:textSize', e.target.value)}
                  placeholder="e.g. 16sp"
                  className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-xs focus:outline-none"
                />
              </div>

              {/* Text Color */}
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">android:textColor</label>
                <input
                  type="text"
                  value={selectedNode.attributes['android:textColor'] || ''}
                  onChange={(e) => handleUpdateAttribute('android:textColor', e.target.value)}
                  placeholder="#FFFFFF or @color/primary"
                  className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-xs focus:outline-none"
                />
              </div>

              {/* Background / BackgroundTint */}
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">android:backgroundTint</label>
                <input
                  type="text"
                  value={selectedNode.attributes['android:backgroundTint'] || ''}
                  onChange={(e) => handleUpdateAttribute('android:backgroundTint', e.target.value)}
                  placeholder="#3DDC84 or @color/accent"
                  className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-xs focus:outline-none"
                />
              </div>

              {/* Orientation if container */}
              {selectedNode.attributes['android:orientation'] !== undefined && (
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">android:orientation</label>
                  <select
                    value={selectedNode.attributes['android:orientation'] || 'vertical'}
                    onChange={(e) => handleUpdateAttribute('android:orientation', e.target.value)}
                    className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-xs focus:outline-none"
                  >
                    <option value="vertical">vertical</option>
                    <option value="horizontal">horizontal</option>
                  </select>
                </div>
              )}

              {/* Visibility */}
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">android:visibility</label>
                <select
                  value={selectedNode.attributes['android:visibility'] || 'visible'}
                  onChange={(e) => handleUpdateAttribute('android:visibility', e.target.value)}
                  className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-xs focus:outline-none"
                >
                  <option value="visible">visible</option>
                  <option value="invisible">invisible</option>
                  <option value="gone">gone</option>
                </select>
              </div>

              {/* Custom Attribute Adder */}
              <div className="pt-2 border-t border-[#2b2d30]">
                <span className="text-[10px] text-gray-400 block mb-1 font-bold">Add Custom Attribute</span>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={customAttrKey}
                    onChange={(e) => setCustomAttrKey(e.target.value)}
                    placeholder="e.g. android:padding"
                    className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-[11px] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={customAttrVal}
                    onChange={(e) => setCustomAttrVal(e.target.value)}
                    placeholder="e.g. 16dp"
                    className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-[11px] focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (customAttrKey.trim() && customAttrVal.trim()) {
                        handleUpdateAttribute(customAttrKey.trim(), customAttrVal.trim());
                        setCustomAttrKey('');
                        setCustomAttrVal('');
                      }
                    }}
                    className="w-full py-1 bg-[#3574f0] hover:bg-[#2b64d6] text-white rounded font-bold text-[10px]"
                  >
                    Add Attribute
                  </button>
                </div>
              </div>

              {selectedNode !== parsedRoot && (
                <div className="pt-3 border-t border-[#2b2d30]">
                  <button
                    onClick={() => handleDeleteNode(selectedNode.internalId)}
                    className="w-full py-1.5 px-2 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete View</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Layout File Modal */}
      {showNewLayoutDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#2b2d30] border border-[#393b40] rounded-xl p-4 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-white text-sm mb-2 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#3574f0]" />
              <span>Create Layout Resource File</span>
            </h3>
            <p className="text-gray-400 text-xs mb-3">
              Will be placed in <code className="text-[#3ddc84]">app/src/main/res/layout/</code>
            </p>
            <input
              type="text"
              placeholder="e.g. activity_detail.xml"
              value={newLayoutFileName}
              onChange={(e) => setNewLayoutFileName(e.target.value)}
              className="w-full bg-[#1e1f22] border border-[#393b40] rounded px-3 py-1.5 text-white font-mono text-xs focus:outline-none mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowNewLayoutDialog(false)}
                className="px-3 py-1.5 rounded text-gray-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  let cleanName = newLayoutFileName.trim();
                  if (!cleanName.endsWith('.xml')) cleanName += '.xml';
                  if (onCreateLayout && cleanName) {
                    onCreateLayout(cleanName);
                    setShowNewLayoutDialog(false);
                    setNewLayoutFileName('');
                  }
                }}
                className="px-3 py-1.5 rounded bg-[#3574f0] hover:bg-[#2b64d6] text-white font-bold text-xs"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
