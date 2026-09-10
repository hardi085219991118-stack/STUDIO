import React, { useState, useMemo, useCallback } from 'react';
import { 
  Layers, Plus, Trash2, ZoomIn, ZoomOut, RotateCcw, 
  Smartphone, Code, Eye, Split, Sliders, CheckSquare, 
  ToggleLeft, Radio, AlignJustify, Box, Edit3, AlertCircle,
  Type, Image as ImageIcon, Check, Info
} from 'lucide-react';

interface LayoutEditorProps {
  xmlContent: string;
  onUpdateXml: (newXml: string) => void;
  onClose: () => void;
}

export interface ParsedXmlNode {
  internalId: string;
  tag: string;
  shortTag: string;
  attributes: Record<string, string>;
  children: ParsedXmlNode[];
}

export const LayoutEditor: React.FC<LayoutEditorProps> = ({
  xmlContent,
  onUpdateXml,
  onClose,
}) => {
  const [viewMode, setViewMode] = useState<'design' | 'split' | 'code'>('split');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [selectedInternalId, setSelectedInternalId] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parse XML dynamically using browser's DOMParser
  const parsedRoot = useMemo<ParsedXmlNode | null>(() => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlContent, 'application/xml');
      const errorNode = doc.querySelector('parsererror');
      if (errorNode) {
        setParseError(errorNode.textContent || 'XML Parsing Error');
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
          : `${shortTag}_${counter}`;

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
        const root = convertNode(doc.documentElement);
        return root;
      }
      return null;
    } catch (err: any) {
      setParseError(err.message || 'Failed to parse XML');
      return null;
    }
  }, [xmlContent]);

  // Set default selection to root if not selected
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
    
    // Put namespaces first on root
    if (indent === 0) {
      if (!root.attributes['xmlns:android']) {
        root.attributes['xmlns:android'] = 'http://schemas.android.com/apk/res/android';
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
    onUpdateXml(newXml);
  };

  // Delete selected node
  const handleDeleteNode = (idToDelete: string) => {
    if (!parsedRoot) return;
    if (parsedRoot.internalId === idToDelete) {
      // Cannot delete root layout
      return;
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
    onUpdateXml(newXml);
  };

  // Add component from palette into selected container
  const handleAddPaletteItem = (tag: string, defaultAttrs: Record<string, string>) => {
    if (!parsedRoot) return;
    const newRoot = cloneTree(parsedRoot);

    const targetContainer = selectedNode && selectedNode.children !== undefined && !['TextView', 'Button', 'EditText', 'ImageView', 'Switch', 'CheckBox', 'ProgressBar'].includes(selectedNode.shortTag)
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
    onUpdateXml(newXml);
  };

  // Palette components list
  const paletteItems = [
    { tag: 'TextView', label: 'TextView', icon: 'T', defaultAttrs: { 'android:text': 'Hello World', 'android:textSize': '16sp', 'android:textColor': '#FFFFFF' } },
    { tag: 'Button', label: 'Button', icon: 'B', defaultAttrs: { 'android:text': 'Click Me', 'android:backgroundTint': '#3DDC84', 'android:textColor': '#121316' } },
    { tag: 'EditText', label: 'EditText', icon: 'I', defaultAttrs: { 'android:hint': 'Enter input text...', 'android:textColor': '#FFFFFF' } },
    { tag: 'ImageView', label: 'ImageView', icon: '🖼', defaultAttrs: { 'android:src': '@mipmap/ic_launcher', 'android:layout_height': '64dp' } },
    { tag: 'Switch', label: 'Switch', icon: '⚡', defaultAttrs: { 'android:text': 'Enable Option', 'android:textColor': '#FFFFFF' } },
    { tag: 'CheckBox', label: 'CheckBox', icon: '☑', defaultAttrs: { 'android:text': 'Accept conditions', 'android:textColor': '#FFFFFF' } },
    { tag: 'ProgressBar', label: 'ProgressBar', icon: '⏳', defaultAttrs: { 'android:layout_width': 'wrap_content' } },
    { tag: 'LinearLayout', label: 'LinearLayout', icon: '⊞', defaultAttrs: { 'android:orientation': 'vertical', 'android:layout_height': 'wrap_content', 'android:padding': '16dp' } },
  ];

  // Component Tree recursive renderer
  const renderTreeItem = (node: ParsedXmlNode, depth = 0) => {
    const isSelected = selectedInternalId === node.internalId;
    const isContainer = ['LinearLayout', 'RelativeLayout', 'FrameLayout', 'ConstraintLayout', 'CoordinatorLayout', 'ScrollView'].some(c => node.shortTag.includes(c));

    return (
      <div key={node.internalId} className="select-none">
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          style={{ paddingLeft: `${depth * 12 + 6}px` }}
          className={`py-1 pr-2 rounded cursor-pointer flex items-center justify-between text-[11px] font-mono transition-colors ${
            isSelected ? 'bg-[#3574f0] text-white font-semibold' : 'hover:bg-[#2b2d30] text-[#bcbec4]'
          }`}
        >
          <div className="flex items-center space-x-1.5 truncate">
            {isContainer ? (
              <Box className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-[#3574f0]'}`} />
            ) : node.shortTag === 'TextView' ? (
              <Type className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-[#3ddc84]'}`} />
            ) : node.shortTag === 'Button' ? (
              <span className={`w-3 h-3 text-[10px] font-bold flex items-center justify-center ${isSelected ? 'text-white' : 'text-[#3574f0]'}`}>B</span>
            ) : (
              <span className="text-[10px]">⚙</span>
            )}
            <span className="truncate">{node.internalId}</span>
            <span className={`text-[9px] ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>({node.shortTag})</span>
          </div>

          {node !== parsedRoot && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteNode(node.internalId);
              }}
              className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded"
              title="Delete View"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          )}
        </div>

        {node.children.map(child => renderTreeItem(child, depth + 1))}
      </div>
    );
  };

  // Dynamic Layout Preview Renderer
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
    const textColor = attrs['android:textColor'] || '#FFFFFF';

    const baseWrapperClass = `cursor-pointer transition-all relative ${
      isSelected ? 'ring-2 ring-[#3574f0] ring-offset-1 ring-offset-[#18191c]' : 'hover:outline hover:outline-1 hover:outline-[#3574f0]/50'
    }`;

    // Containers (LinearLayout, FrameLayout, etc.)
    if (['LinearLayout', 'RelativeLayout', 'ConstraintLayout', 'FrameLayout', 'ScrollView', 'CardView'].some(c => tag.includes(c))) {
      const isHorizontal = orientation === 'horizontal';
      return (
        <div
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          className={`${baseWrapperClass} flex ${isHorizontal ? 'flex-row items-center space-x-2' : 'flex-col space-y-2.5'} p-2 rounded-lg bg-black/10 border border-white/5 w-full`}
        >
          {node.children.length === 0 ? (
            <div className="py-4 text-center text-gray-500 text-[10px] italic w-full">
              Empty {tag} (drop components from Palette)
            </div>
          ) : (
            node.children.map(child => renderPreviewNode(child))
          )}
        </div>
      );
    }

    // TextView
    if (tag === 'TextView') {
      return (
        <div
          key={node.internalId}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedInternalId(node.internalId);
          }}
          style={{ color: textColor }}
          className={`${baseWrapperClass} py-1 px-1 text-center font-sans text-xs break-words max-w-full`}
        >
          {text || '(Empty TextView)'}
        </div>
      );
    }

    // Button
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

    // EditText
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

    // ImageView
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

    // Switch
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

    // CheckBox
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

    // ProgressBar
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

    // Fallback View
    return (
      <div
        key={node.internalId}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedInternalId(node.internalId);
        }}
        className={`${baseWrapperClass} p-2 bg-[#2b2d30] border border-[#393b40] rounded text-center text-xs`}
      >
        <span className="font-mono text-gray-300">{tag}: {node.internalId}</span>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#1e1f22] text-[#bcbec4] select-none overflow-hidden">
      {/* Top Toolbar */}
      <div className="bg-[#18191c] border-b border-[#2b2d30] px-3 py-1.5 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-white flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#3574f0]" />
            <span>Layout Editor</span>
          </span>

          <span className="text-[10px] bg-[#3574f0]/15 text-[#3574f0] font-mono px-1.5 py-0.5 rounded border border-[#3574f0]/30 font-semibold">
            XML-DRIVEN
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

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
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
        </div>
      </div>

      {/* Parse Error Banner if invalid XML */}
      {parseError && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-3 py-1.5 flex items-center justify-between text-xs text-red-300 font-mono">
          <div className="flex items-center space-x-2 truncate">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="truncate">XML Syntax Error: {parseError}</span>
          </div>
          <span className="text-[10px] text-gray-400">Fix XML syntax in Code mode</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Palette & Component Tree */}
        {(viewMode === 'design' || viewMode === 'split') && (
          <div className="w-52 bg-[#18191c] border-r border-[#2b2d30] flex flex-col shrink-0 text-xs">
            {/* Palette */}
            <div className="p-2 border-b border-[#2b2d30]">
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1.5 flex items-center justify-between">
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
            {/* Frame Badge */}
            <div className="mb-2 text-[10px] font-mono text-gray-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3ddc84]" />
              <span>LAYOUT PREVIEW (RENDERED FROM PARSED XML)</span>
            </div>

            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
              className="w-[290px] h-[530px] bg-[#18191c] border-4 border-[#2b2d30] rounded-[32px] shadow-2xl overflow-hidden flex flex-col relative transition-transform"
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
              <div className="flex-1 p-4 bg-[#121316] overflow-y-auto flex flex-col">
                {parsedRoot ? (
                  renderPreviewNode(parsedRoot)
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 text-xs">
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
                <span>activity_main.xml</span>
              </span>
              <span className="text-[10px] text-[#3ddc84] font-mono">Bi-directional Sync</span>
            </div>
            <textarea
              value={xmlContent}
              onChange={(e) => onUpdateXml(e.target.value)}
              spellCheck={false}
              className="flex-1 bg-[#1e1f22] text-[#bcbec4] p-3 font-mono text-xs leading-relaxed resize-none focus:outline-none"
            />
          </div>
        )}

        {/* Far Right: Attributes Inspector (Visible in Design mode) */}
        {viewMode === 'design' && selectedNode && (
          <div className="w-60 bg-[#18191c] border-l border-[#2b2d30] p-3 text-xs flex flex-col shrink-0 overflow-y-auto">
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

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">android:layout_width</label>
                <select
                  value={selectedNode.attributes['android:layout_width'] || 'wrap_content'}
                  onChange={(e) => handleUpdateAttribute('android:layout_width', e.target.value)}
                  className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-xs focus:outline-none"
                >
                  <option value="wrap_content">wrap_content</option>
                  <option value="match_parent">match_parent</option>
                  <option value="200dp">200dp</option>
                  <option value="100dp">100dp</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">android:layout_height</label>
                <select
                  value={selectedNode.attributes['android:layout_height'] || 'wrap_content'}
                  onChange={(e) => handleUpdateAttribute('android:layout_height', e.target.value)}
                  className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-xs focus:outline-none"
                >
                  <option value="wrap_content">wrap_content</option>
                  <option value="match_parent">match_parent</option>
                  <option value="48dp">48dp</option>
                  <option value="120dp">120dp</option>
                </select>
              </div>

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

              {selectedNode.attributes['android:hint'] !== undefined && (
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">android:hint</label>
                  <input
                    type="text"
                    value={selectedNode.attributes['android:hint'] || ''}
                    onChange={(e) => handleUpdateAttribute('android:hint', e.target.value)}
                    placeholder="Hint text"
                    className="w-full bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-[#3574f0]"
                  />
                </div>
              )}

              {selectedNode.attributes['android:textColor'] !== undefined && (
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">android:textColor</label>
                  <div className="flex items-center space-x-2">
                    <span
                      style={{ backgroundColor: selectedNode.attributes['android:textColor'] || '#FFFFFF' }}
                      className="w-4 h-4 rounded border border-white/20 shrink-0"
                    />
                    <input
                      type="text"
                      value={selectedNode.attributes['android:textColor'] || '#FFFFFF'}
                      onChange={(e) => handleUpdateAttribute('android:textColor', e.target.value)}
                      className="flex-1 bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {selectedNode.attributes['android:backgroundTint'] !== undefined && (
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">android:backgroundTint</label>
                  <div className="flex items-center space-x-2">
                    <span
                      style={{ backgroundColor: selectedNode.attributes['android:backgroundTint'] || '#3DDC84' }}
                      className="w-4 h-4 rounded border border-white/20 shrink-0"
                    />
                    <input
                      type="text"
                      value={selectedNode.attributes['android:backgroundTint'] || '#3DDC84'}
                      onChange={(e) => handleUpdateAttribute('android:backgroundTint', e.target.value)}
                      className="flex-1 bg-[#2b2d30] border border-[#393b40] rounded px-2 py-1 text-white text-xs focus:outline-none"
                    />
                  </div>
                </div>
              )}

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

              {selectedNode !== parsedRoot && (
                <div className="pt-4 border-t border-[#2b2d30]">
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
    </div>
  );
};
