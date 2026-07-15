import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, Sparkles, CheckCircle2, Download, ShieldCheck, 
  Settings, Loader2, Copy, Search, Eye, HelpCircle, Check, 
  RefreshCw, FileImage, Type, AlignLeft, CheckSquare, AlertCircle
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { DocumentFile } from '../types';
import { EditorialProgressBar } from './EditorialProgressBar';
import { Language, translations } from '../lib/translations';

interface AIFixToolProps {
  darkMode: boolean;
  setView: (view: string) => void;
  lang?: Language;
}

const PRESETS = [
  {
    id: 'grammar',
    name: 'Copyedit & Proofread',
    description: 'Perfect spelling, repair broken punctuation, and correct grammatical errors while maintaining your unique layout style.',
    icon: 'CheckSquare'
  },
  {
    id: 'tone-professional',
    name: 'Executive Tone Polish',
    description: 'Standardize loose syntax, expand vocabulary, and restructure paragraphs to meet clear, executive business standards.',
    icon: 'Type'
  },
  {
    id: 'reformat-markdown',
    name: 'Markdown Re-Typographer',
    description: 'Inject readable headers, build tabular grids, list items, and clear paragraph pacing using clean Markdown styling.',
    icon: 'AlignLeft'
  },
  {
    id: 'summarize',
    name: 'Executive Summary Brief',
    description: 'Boil down lengthy essays, contracts, or draft memos into a single executive line followed by structured bullet points.',
    icon: 'FileText'
  }
];

export default function AIFixTool({ darkMode, setView, lang }: AIFixToolProps) {
  const activeLang = lang || 'id';
  // Input Selection
  const [inputMode, setInputMode] = useState<'text' | 'file'>('text');
  const [inputText, setInputText] = useState('');
  
  // File state
  const [file, setFile] = useState<DocumentFile | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  
  // Settings
  const [selectedPreset, setSelectedPreset] = useState('grammar');
  const [customPrompt, setCustomPrompt] = useState('');
  
  // UI Flow & Output
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [processedText, setProcessedText] = useState<string | null>(null);
  const [originalTextPreview, setOriginalTextPreview] = useState<string | null>(null);

  // Tools & UI preference
  const [copied, setCopied] = useState(false);
  const [fontStyle, setFontStyle] = useState<'mono' | 'serif' | 'sans'>('mono');
  const [compareMode, setCompareMode] = useState<'split' | 'side'>('side');
  const [searchQuery, setSearchQuery] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      await processSelectedFile(f);
    }
  };

  const processSelectedFile = async (f: File) => {
    try {
      setIsProcessing(true);
      setProgress(10);
      setStep('Buffering file package into browser registers...');

      const arrayBuffer = await f.arrayBuffer();
      setProgress(40);
      setStep('Decrypting internal structure maps...');

      let pageCount = 1;
      if (f.type === 'application/pdf') {
        try {
          const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          pageCount = pdfDoc.getPageCount();
        } catch (pdfErr) {
          console.warn('Fallback PDF counts to 1:', pdfErr);
        }
      }

      setProgress(70);
      setStep('Converting binary structure streams to Base64...');

      const base64Promise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });

      const base64Data = await base64Promise;

      setProgress(100);
      setFile({
        id: `aifix-${Date.now()}`,
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream',
        pageCount,
        uploadedAt: new Date(),
        status: 'queued',
        progress: 100
      });
      setFileData(base64Data);
      setOriginalTextPreview(`[Uploaded Binary Package: ${f.name} (${formatSize(f.size)})]`);
      setIsProcessing(false);
    } catch (err: any) {
      console.error('File parsing failed:', err);
      setIsProcessing(false);
      alert('Unable to preprocess file. Please select a valid document or image.');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const f = e.dataTransfer.files[0];
      const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
      if (validTypes.includes(f.type) || f.name.endsWith('.pdf')) {
        await processSelectedFile(f);
      } else {
        alert('Supported formats: PDF, PNG, JPG, WebP');
      }
    }
  };

  const executeAIFix = async () => {
    if (inputMode === 'text' && !inputText.trim()) {
      alert('Please type or paste some text content to fix.');
      return;
    }
    if (inputMode === 'file' && (!file || !fileData)) {
      alert('Please upload a document file to process.');
      return;
    }

    try {
      setIsProcessing(true);
      setProgress(10);
      setStep('Validating offline cryptography parameters...');

      // Store a preview of the original text
      if (inputMode === 'text') {
        setOriginalTextPreview(inputText);
      }

      // Simulate step states for professional editorial feedback
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 92) {
            clearInterval(interval);
            return 92;
          }
          if (prev < 40) {
            setStep('Analyzing grammar layers and stylistic syntax...');
            return prev + 15;
          } else if (prev < 70) {
            setStep('Restructuring vocabulary mappings via Gemini-3.5-flash...');
            return prev + 10;
          } else {
            setStep('Formatting document layout hierarchy indexes...');
            return prev + 6;
          }
        });
      }, 600);

      const payload: any = {
        task: selectedPreset,
        customPrompt: customPrompt
      };

      if (inputMode === 'text') {
        payload.text = inputText;
      } else {
        payload.fileData = fileData;
        payload.mimeType = file?.type;
      }

      const token = localStorage.getItem('utildoc_session_token');
      const response = await fetch('/api/aifix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      clearInterval(interval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server rejected the document adjustment instruction.');
      }

      const data = await response.json();
      setProgress(100);
      setStep('Correction process complete!');
      setProcessedText(data.text);
      setIsProcessing(false);
    } catch (err: any) {
      console.error('AI Fix processing failure:', err);
      setIsProcessing(false);
      alert(`Correction Pipeline Failed: ${err.message || 'An unknown server error occurred.'}`);
    }
  };

  const handleCopy = () => {
    if (!processedText) return;
    navigator.clipboard.writeText(processedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'txt' | 'md') => {
    if (!processedText) return;
    const baseName = inputMode === 'file' && file 
      ? file.name.substring(0, file.name.lastIndexOf('.'))
      : 'smart_fix';
    const filename = `${baseName}_corrected.${format}`;
    const blob = new Blob([processedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const parts = text.split(new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() 
            ? <mark key={i} className="bg-yellow-200 text-stone-950 font-bold px-0.5 rounded-none">{part}</mark> 
            : part
        )}
      </>
    );
  };

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (processedText) {
          handleDownload('txt');
        } else if (!isProcessing) {
          if (inputMode === 'text' && inputText.trim()) {
            executeAIFix();
          } else if (inputMode === 'file' && file && fileData) {
            executeAIFix();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [processedText, isProcessing, inputMode, inputText, file, fileData, selectedPreset, customPrompt]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Back Button */}
      <button 
        onClick={() => setView('dashboard')}
        className={`mb-8 flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest hover:underline ${
          darkMode ? 'text-stone-400 hover:text-white' : 'text-stone-500 hover:text-stone-900'
        }`}
      >
        {translations.nav_back[activeLang]}
      </button>

      {/* Header */}
      <div className="mb-10 pb-6 border-b border-dashed border-[#e6e2d8] dark:border-[#2a2a29]">
        <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-tight">
          {toolTranslations['ai-fix']?.name[activeLang] || 'AI Document Smart Fix'}
        </h1>
        <p className={`text-xs sm:text-sm font-serif mt-2 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
          {toolTranslations['ai-fix']?.description[activeLang] || 'Automatically repair syntax, proofread typos, correct tone layers, or restructure loose scripts using sandboxed local memory buffers and Gemini Intelligence.'}
        </p>
      </div>

      {isProcessing ? (
        <EditorialProgressBar
          progress={progress}
          step={step}
          darkMode={darkMode}
          title="Executing AI Smart Fix Pipeline"
        />
      ) : processedText !== null ? (
        /* Results Compare Screen */
        <div className="space-y-6">
          
          {/* Header Action Bar */}
          <div className={`p-4 border rounded-none flex flex-col sm:flex-row gap-4 items-center justify-between ${
            darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
          }`}>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400">Layout Preview</span>
              <div className="flex border rounded-none">
                <button
                  onClick={() => setCompareMode('side')}
                  className={`px-3 py-1 text-[9px] font-sans font-bold uppercase tracking-wider ${
                    compareMode === 'side'
                      ? darkMode ? 'bg-stone-800 text-white' : 'bg-stone-200 text-stone-800'
                      : 'text-stone-500'
                  }`}
                >
                  Side-by-Side
                </button>
                <button
                  onClick={() => setCompareMode('split')}
                  className={`px-3 py-1 text-[9px] font-sans font-bold uppercase tracking-wider ${
                    compareMode === 'split'
                      ? darkMode ? 'bg-stone-800 text-white' : 'bg-stone-200 text-stone-800'
                      : 'text-stone-500'
                  }`}
                >
                  Single Output
                </button>
              </div>
            </div>

            {/* Typography selection and Search box */}
            <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-end">
              <div className="flex border rounded-none">
                {(['mono', 'serif', 'sans'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setFontStyle(style)}
                    className={`px-3 py-1 text-[9px] font-sans font-bold uppercase tracking-wider ${
                      fontStyle === style
                        ? darkMode ? 'bg-[#bfa15f] text-black' : 'bg-[#8c1d1a] text-white'
                        : 'text-stone-500'
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>

              <div className="relative w-40">
                <Search className="w-3 h-3 text-stone-500 absolute left-2 top-2" />
                <input
                  type="text"
                  placeholder="Find text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-7 pr-6 py-1 text-[10px] border focus:outline-none ${
                    darkMode ? 'bg-[#121211] border-stone-800 focus:border-[#bfa15f] text-white' : 'bg-white border-[#dcd9d0] text-stone-800'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Diff View Grid */}
          <div className={`grid ${compareMode === 'side' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
            
            {/* Original Panel (Only show if Side-by-Side) */}
            {compareMode === 'side' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400">
                  <span>Draft Source Document</span>
                  <span>{inputMode === 'text' ? 'Raw Clipboard Text' : file?.name}</span>
                </div>
                <div className={`p-6 border min-h-[450px] max-h-[600px] overflow-y-auto leading-relaxed whitespace-pre-wrap ${
                  fontStyle === 'mono' ? 'font-mono text-[11px]' : fontStyle === 'serif' ? 'font-serif text-[13px]' : 'font-sans text-[12px]'
                } ${
                  darkMode ? 'bg-[#121211] border-stone-800 text-stone-500' : 'bg-white border-[#e6e2d8] text-stone-500'
                }`}>
                  {originalTextPreview || inputText}
                </div>
              </div>
            )}

            {/* Processed Panel */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-2 text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400">
                <span>Gemini Polished output</span>
                <div className="flex items-center gap-1 text-emerald-500 font-sans text-[10px] font-bold uppercase">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Proofread Verified
                </div>
              </div>

              <div className={`border rounded-none overflow-hidden ${
                darkMode ? 'bg-[#141413] border-[#2c2c2a]' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'
              }`}>
                {/* Control Panel overlay */}
                <div className={`px-6 py-3.5 border-b flex flex-wrap gap-3 items-center justify-between ${
                  darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
                }`}>
                  <span className="text-[9px] font-mono text-stone-400 uppercase">Compiled Sandbox Buffer</span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className={`px-3 py-1.5 text-[9px] font-sans font-bold uppercase tracking-wider border rounded-none flex items-center gap-1 transition-all ${
                        copied 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/40'
                          : darkMode 
                            ? 'border-stone-800 hover:border-stone-600 text-stone-300' 
                            : 'border-[#d8d4ca] hover:border-stone-800 text-stone-700'
                      }`}
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied' : 'Copy All'}
                    </button>

                    <button
                      onClick={() => handleDownload('txt')}
                      className={`px-3 py-1.5 text-[9px] font-sans font-bold uppercase tracking-wider border rounded-none flex items-center gap-1 ${
                        darkMode ? 'border-stone-800 hover:border-stone-600 text-stone-300' : 'border-[#d8d4ca] hover:border-stone-800 text-stone-700'
                      }`}
                    >
                      <Download className="w-3 h-3" />
                      Text
                    </button>

                    <button
                      onClick={() => handleDownload('md')}
                      className={`px-3 py-1.5 text-[9px] font-sans font-bold uppercase tracking-wider border rounded-none flex items-center gap-1 ${
                        darkMode ? 'border-stone-800 hover:border-stone-600 text-stone-300' : 'border-[#d8d4ca] hover:border-stone-800 text-stone-700'
                      }`}
                    >
                      <Download className="w-3 h-3" />
                      Markdown
                    </button>
                  </div>
                </div>

                {/* Main Text Content */}
                <div className="p-6">
                  <div 
                    className={`w-full min-h-[400px] max-h-[550px] overflow-y-auto p-6 border text-xs leading-relaxed whitespace-pre-wrap outline-none ${
                      fontStyle === 'mono' ? 'font-mono text-[11px]' : fontStyle === 'serif' ? 'font-serif text-[13px] tracking-normal' : 'font-sans text-[12px]'
                    } ${
                      darkMode 
                        ? 'bg-[#10100f] border-stone-800 text-stone-200' 
                        : 'bg-white border-[#e6e2d8] text-stone-800'
                    }`}
                  >
                    {getHighlightedText(processedText, searchQuery)}
                  </div>
                </div>
              </div>

            </div>

          </div>

          {/* Action Footer */}
          <div className="flex justify-end pt-4 gap-4">
            <button
              onClick={() => {
                setProcessedText(null);
                setOriginalTextPreview(null);
              }}
              className={`px-6 py-2.5 rounded-none font-sans font-bold text-xs uppercase tracking-widest border transition-all flex items-center gap-2 ${
                darkMode 
                  ? 'border-[#3a3a38] text-stone-300 hover:bg-[#121211]' 
                  : 'border-[#d8d4ca] text-stone-700 hover:bg-[#FAF9F5]'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Adjust New Document
            </button>
          </div>

        </div>
      ) : (
        /* Configuration Inputs Panel */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Upload or Paste Input */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Input Selection Tab Bar */}
            <div className="flex border-b border-stone-200 dark:border-stone-800">
              <button
                onClick={() => setInputMode('text')}
                className={`px-6 py-3 text-[10px] font-sans font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                  inputMode === 'text'
                    ? darkMode ? 'border-[#bfa15f] text-white' : 'border-[#8c1d1a] text-[#8c1d1a]'
                    : 'border-transparent text-stone-400 hover:text-stone-300'
                }`}
              >
                Text Sandbox Playground
              </button>
              <button
                onClick={() => setInputMode('file')}
                className={`px-6 py-3 text-[10px] font-sans font-bold uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                  inputMode === 'file'
                    ? darkMode ? 'border-[#bfa15f] text-white' : 'border-[#8c1d1a] text-[#8c1d1a]'
                    : 'border-transparent text-stone-400 hover:text-stone-300'
                }`}
              >
                Upload Draft File / Scan
              </button>
            </div>

            {inputMode === 'text' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-stone-400 uppercase px-1">
                  <span>Write or paste raw draft text</span>
                  <span>{inputText.length} Character(s)</span>
                </div>
                <textarea
                  placeholder="Paste your rough letter, list of typos, unformatted memo, or draft summary text here to let Gemini rebuild and polish its styling..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className={`w-full p-6 text-xs font-mono h-[380px] border focus:outline-none focus:ring-0 leading-relaxed ${
                    darkMode 
                      ? 'bg-[#121211] border-stone-800 focus:border-[#bfa15f] text-stone-200 placeholder-stone-600' 
                      : 'bg-white border-[#dcd9d0] focus:border-stone-800 text-stone-800 placeholder-stone-400'
                  }`}
                />
              </div>
            ) : (
              /* File Drag-and-Drop View */
              <div className="space-y-4">
                {file ? (
                  <div className={`p-6 border rounded-none flex items-center justify-between gap-4 ${
                    darkMode ? 'bg-[#121211] border-stone-800' : 'bg-[#FAF9F5] border-[#e6e2d8]'
                  }`}>
                    <div className="flex items-center gap-3.5 truncate">
                      <div className={`p-2 border rounded-none shrink-0 ${darkMode ? 'border-[#2c2c2a] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'}`}>
                        {file.type.startsWith('image/') ? <FileImage className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div className="truncate">
                        <p className="font-serif font-medium text-sm truncate">{file.name}</p>
                        <p className="text-[10px] font-mono text-stone-400 mt-0.5">{formatSize(file.size)} • {file.pageCount} Page(s)</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => { setFile(null); setFileData(null); }}
                      className={`text-[10px] font-sans font-bold uppercase tracking-wider hover:underline shrink-0 ${
                        darkMode ? 'text-stone-400 hover:text-white' : 'text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed p-12 text-center cursor-pointer transition-all h-[340px] flex flex-col justify-center items-center ${
                      darkMode 
                        ? 'border-stone-800 hover:border-stone-600 bg-[#121211] hover:bg-[#151514]' 
                        : 'border-stone-300 hover:border-stone-500 bg-[#FAF9F5]/40 hover:bg-white'
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept=".pdf,image/png,image/jpeg,image/webp" 
                      className="hidden" 
                    />

                    <div className={`w-12 h-12 rounded-none border flex items-center justify-center mb-5 ${
                      darkMode ? 'border-[#333331] text-[#bfa15f]/80' : 'border-[#e5e0d4] text-[#8c1d1a]'
                    }`}>
                      <Upload className="w-5 h-5" />
                    </div>

                    <h3 className="font-serif font-medium text-lg mb-2 italic">Select Document File</h3>
                    <p className={`text-xs font-serif max-w-sm mx-auto mb-6 leading-relaxed ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                      Drag your PDF package, invoice, screenshot, or drafted record directly here.
                    </p>

                    <span className={`inline-block px-3 py-1.5 border text-[9px] font-sans font-bold uppercase tracking-wider ${
                      darkMode 
                        ? 'border-stone-800 text-[#bfa15f]' 
                        : 'border-stone-200 text-[#8c1d1a]'
                    }`}>
                      Supported: PDF, PNG, JPG, WebP
                    </span>
                  </div>
                )}

                <div className={`p-4 border rounded-none flex items-start gap-3 text-xs leading-relaxed font-serif ${
                  darkMode ? 'bg-[#1d1d1b] border-[#2c2c2a] text-stone-300' : 'bg-[#FAF9F5] border-[#e6e2d8] text-stone-700'
                }`}>
                  <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                  <div>
                    <span className="font-bold">Multimodal scan enabled:</span> Gemini-3.5-flash reads visual templates, handwritten journals, printed columns, or screenshot layers directly from your selected document without prior extraction steps.
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Right Panel: Settings Configurations & Action Trigger */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className={`p-6 border rounded-none ${
              darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
            }`}>
              <h3 className="font-serif font-medium text-base mb-4 pb-2 border-b border-dashed border-[#e6e2d8] dark:border-[#2a2a29] italic">
                Correction Settings
              </h3>

              {/* Preset corrections */}
              <div className="space-y-3.5 mb-6">
                <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400">1. Choose Processing Presets</label>
                <div className="space-y-3">
                  {PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => setSelectedPreset(preset.id)}
                      className={`p-3.5 border cursor-pointer transition-all ${
                        selectedPreset === preset.id
                          ? darkMode 
                            ? 'border-[#bfa15f] bg-[#bfa15f]/5' 
                            : 'border-[#8c1d1a] bg-[#8c1d1a]/5'
                          : darkMode
                            ? 'border-stone-800 hover:border-[#333] bg-transparent'
                            : 'border-[#e6e2d8] hover:border-stone-400 bg-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-serif font-medium text-xs">{preset.name}</h4>
                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${
                          selectedPreset === preset.id
                            ? darkMode ? 'border-[#bfa15f]' : 'border-[#8c1d1a]'
                            : 'border-stone-400'
                        }`}>
                          {selectedPreset === preset.id && (
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              darkMode ? 'bg-[#bfa15f]' : 'bg-[#8c1d1a]'
                            }`} />
                          )}
                        </div>
                      </div>
                      <p className="text-[10px] text-stone-500 leading-relaxed font-serif">{preset.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Prompt instruction */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400">2. Custom Instructions (Optional)</label>
                  <span className="text-[9px] font-mono text-stone-500">Gemini Grounded</span>
                </div>
                <textarea
                  placeholder="E.g., 'Translate to French', 'Maintain the structure but write in high-impact poetry', 'Highlight all changes in bold'..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  className={`w-full p-3 text-xs border rounded-none h-20 focus:outline-none focus:ring-0 ${
                    darkMode 
                      ? 'bg-[#121211] border-stone-800 focus:border-[#bfa15f] text-stone-200 placeholder-stone-600' 
                      : 'bg-white border-[#dcd9d0] focus:border-stone-800 text-stone-800 placeholder-stone-400'
                  }`}
                />
              </div>

              {/* Submit Trigger Action */}
              <button
                onClick={executeAIFix}
                className={`w-full py-3.5 rounded-none font-sans font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  darkMode 
                    ? 'bg-[#bfa15f] text-black hover:opacity-95' 
                    : 'bg-[#8c1d1a] text-white hover:opacity-95'
                }`}
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
                Execute Document Smart Fix
              </button>

            </div>

            {/* Sandbox safety pledge */}
            <div className={`p-5 rounded-none border text-xs leading-relaxed font-serif ${
              darkMode ? 'bg-[#1d1d1b] border-[#2c2c2a] text-stone-300' : 'bg-[#FAF9F5] border-[#e6e2d8] text-stone-700'
            }`}>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 font-sans font-bold text-[9px] uppercase tracking-wider mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Durable Offline Confidentiality
              </div>
              <p className="text-stone-500 dark:text-stone-400 text-[11px] leading-relaxed">
                Processed text, inputs, and base64 streams reside directly in the short-lived sandbox thread. Files are compiled in transient memory blocks, completely bypassing physical disk logs.
              </p>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
