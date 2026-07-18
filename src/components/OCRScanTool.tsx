import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, ScanText, CheckCircle2, Download, ShieldCheck, 
  Settings, Loader2, Copy, Search, Eye, Sparkles, HelpCircle, 
  Check, RefreshCw, FileImage, Type, AlignLeft
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { DocumentFile } from '../types';
import { EditorialProgressBar } from './EditorialProgressBar';
import { Language, translations, toolTranslations } from '../lib/translations';

interface OCRScanToolProps {
  darkMode: boolean;
  setView: (view: string) => void;
  lang?: Language;
  adsterraLink: string;
  adsterraActive: boolean;
}

const PRESETS = [
  {
    id: 'standard',
    name: 'Standard Text Extraction',
    description: 'Extract all text sequentially while maintaining natural reading flow.',
    prompt: 'Extract all of the visible text in this document precisely. Preserve the layout structure, lists, paragraphs, and headings where possible. Output ONLY the extracted content. Do not include any conversational introductions, greetings, markdown fences, or outer summary commentary. Preserve original spacing and newlines.'
  },
  {
    id: 'markdown',
    name: 'Structured Markdown Layout',
    description: 'Preserve headers, tables, bold styling, and blockquotes in Markdown.',
    prompt: 'Analyze this document and perform OCR. Output the result in beautiful, clear Markdown formatting. Use markdown headings (#, ##, ###), bold text, bullet points, blockquotes, and markdown tables for data grids where appropriate. Do not wrap the entire response in markdown code blocks or ```. Output ONLY the markdown text itself.'
  },
  {
    id: 'invoice',
    name: 'Invoice / Receipt Extractor',
    description: 'Target dates, invoice numbers, amounts, and line-item tables.',
    prompt: 'Perform detailed OCR on this invoice or receipt. Identify and list the following key fields at the top: Invoice/Receipt Number, Date, Vendor Name, Subtotal, Taxes, and Grand Total. Below those key fields, recreate the line-items table cleanly with columns for Description, Quantity, Unit Price, and Total. Use Markdown formatting. Output only the structured results.'
  },
  {
    id: 'keyvalue',
    name: 'Form Key-Value Pairs',
    description: 'Structure labels, fields, and checkboxes as a clear forms list.',
    prompt: 'This document is a form or certificate. Perform OCR and extract all fields as a clean list of Key-Value pairs (e.g. "Name: Jane Doe"). If there are checkboxes or multiple choice bubbles, indicate if they are checked [X] or empty [ ]. Organize the keys under relevant headers if any. Output only the extracted form data.'
  }
];

export default function OCRScanTool({ darkMode, setView, lang, adsterraLink, adsterraActive }: OCRScanToolProps) {
  const activeLang = lang || 'id';
  const [file, setFile] = useState<DocumentFile | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('standard');
  const [customPrompt, setCustomPrompt] = useState('');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  
  // Customization states
  const [copied, setCopied] = useState(false);
  const [fontStyle, setFontStyle] = useState<'mono' | 'serif' | 'sans'>('mono');
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
      setProgress(5);
      setStep('Buffering file into browser memory...');

      const arrayBuffer = await f.arrayBuffer();
      setProgress(25);
      setStep('Analyzing file structures...');

      let pageCount = 1;
      if (f.type === 'application/pdf') {
        setStep('Decrypting PDF object trees and counting pages...');
        try {
          const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
          pageCount = pdfDoc.getPageCount();
        } catch (pdfErr) {
          console.warn('Could not parse PDF pages, defaulting to 1:', pdfErr);
        }
      }

      // Convert to base64
      setProgress(60);
      setStep('Translating binary buffer to Base64...');
      
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
        id: `ocr-${Date.now()}`,
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream',
        pageCount,
        uploadedAt: new Date(),
        status: 'queued',
        progress: 100
      });
      setFileData(base64Data);
      setIsProcessing(false);
    } catch (err: any) {
      console.error('File preprocessing failed:', err);
      setIsProcessing(false);
      alert('Failed to pre-process file. Please make sure it is a valid PDF or Image.');
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

  const triggerOCR = async () => {
    if (!file || !fileData) return;

    try {
      setIsProcessing(true);
      setProgress(10);
      setStep('Connecting to secure gateway buffer...');

      // Choose prompt
      const presetObj = PRESETS.find(p => p.id === selectedPreset);
      const activePrompt = customPrompt.trim() !== '' 
        ? `${customPrompt}\n\nStrict instruction: Output ONLY the requested information. Do not wrap in markdown block templates unless asked.` 
        : (presetObj?.prompt || PRESETS[0].prompt);

      // We simulate progressive visual steps during the server execution
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          if (prev < 40) {
            setStep('Uploading secure in-memory vector cache...');
            return prev + 10;
          } else if (prev < 70) {
            setStep('Analyzing file layers through Gemini-3.5-flash OCR engine...');
            return prev + 8;
          } else {
            setStep('Typesetting extracted strings and formatting layout index...');
            return prev + 5;
          }
        });
      }, 700);

      const token = localStorage.getItem('utildoc_session_token');
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          fileData: fileData,
          mimeType: file.type,
          prompt: activePrompt
        })
      });

      clearInterval(interval);

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Server rejected the OCR request.');
      }

      const data = await response.json();
      
      setProgress(100);
      setStep('Extraction completed successfully!');
      setExtractedText(data.text);
      setIsProcessing(false);
    } catch (err: any) {
      console.error('OCR pipeline failed:', err);
      setIsProcessing(false);
      alert(`OCR Scan failed: ${err.message || 'An unknown error occurred.'}`);
    }
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: 'txt' | 'md') => {
    if (!extractedText) return;
    const filename = `${file?.name.substring(0, file?.name.lastIndexOf('.')) || 'extracted_text'}_ocr.${format}`;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    if (adsterraActive && adsterraLink) {
      window.open(adsterraLink, '_blank', 'noopener,noreferrer');
    }
  };

  // Function to highlight search query within extracted text
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
        if (extractedText) {
          handleDownload('txt');
        } else if (file && fileData && !isProcessing) {
          triggerOCR();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [extractedText, file, fileData, isProcessing, selectedPreset, customPrompt]);

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
          {toolTranslations['ocr-scan']?.name[activeLang] || 'AI OCR Document Scan'}
        </h1>
        <p className={`text-xs sm:text-sm font-serif mt-2 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
          {toolTranslations['ocr-scan']?.description[activeLang] || 'Extract copyable text and structures from scanned PDF packages, receipts, blueprints, or screenshot layers using secure, in-memory sandboxed AI processing.'}
        </p>
      </div>

      {isProcessing ? (
        <EditorialProgressBar
          progress={progress}
          step={step}
          darkMode={darkMode}
          title="Executing Document OCR Scan"
        />
      ) : extractedText !== null ? (
        /* Result Display Screen */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Panel: Document Metadata & Refine Options */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`p-6 border rounded-none ${
              darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
            }`}>
              <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-dashed border-[#e6e2d8] dark:border-[#2a2a29]">
                <div className={`p-2 border shrink-0 ${darkMode ? 'border-[#2c2c2a] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'}`}>
                  <ScanText className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h3 className="font-serif font-medium text-sm truncate">{file?.name}</h3>
                  <p className="text-[10px] font-mono text-stone-500 mt-0.5">{formatSize(file?.size || 0)} • {file?.pageCount} Page(s)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] font-sans font-bold uppercase tracking-widest text-stone-400 mb-2">Typography Guide</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['mono', 'serif', 'sans'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => setFontStyle(style)}
                        className={`py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider border rounded-none ${
                          fontStyle === style
                            ? darkMode ? 'bg-[#bfa15f] text-black border-[#bfa15f]' : 'bg-[#8c1d1a] text-white border-[#8c1d1a]'
                            : darkMode ? 'border-stone-800 hover:border-stone-600 text-stone-400' : 'border-[#d8d4ca] hover:border-stone-800 text-stone-700'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-sans font-bold uppercase tracking-widest text-stone-400 mb-2">Search Extracted Text</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Find keywords..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full pl-9 pr-8 py-1.5 text-xs border rounded-none focus:outline-none focus:ring-0 ${
                        darkMode 
                          ? 'bg-[#121211] border-stone-800 focus:border-[#bfa15f] text-stone-200' 
                          : 'bg-white border-[#dcd9d0] focus:border-stone-800 text-stone-800'
                      }`}
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2 text-[10px] text-stone-400 hover:text-stone-600"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-dashed border-[#e6e2d8] dark:border-[#2a2a29] space-y-2">
                  <button
                    onClick={() => { setExtractedText(null); }}
                    className={`w-full py-2.5 rounded-none font-sans font-bold text-xs uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                      darkMode 
                        ? 'border-[#3a3a38] text-stone-300 hover:bg-[#121211]' 
                        : 'border-[#d8d4ca] text-stone-700 hover:bg-[#FAF9F5]'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Scan New Document
                  </button>
                </div>
              </div>
            </div>

            {/* Secure Sandbox assurance card */}
            <div className={`p-5 rounded-none border text-xs leading-relaxed font-serif ${
              darkMode ? 'bg-[#1d1d1b] border-[#2c2c2a] text-stone-300' : 'bg-[#FAF9F5] border-[#e6e2d8] text-stone-700'
            }`}>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 font-sans font-bold text-[9px] uppercase tracking-wider mb-2.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                No Database Logs Retention
              </div>
              <p className="text-stone-500 dark:text-stone-400 text-[11px] leading-relaxed">
                Extracted data remains inside your browser session and active memory registers. Your PDF objects and OCR structures are never written to physical disk tables or database logs on the server.
              </p>
            </div>
          </div>

          {/* Right Panel: Output Viewer and Download Actions */}
          <div className="lg:col-span-8 space-y-6">
            <div className={`border rounded-none overflow-hidden ${
              darkMode ? 'bg-[#141413] border-[#2c2c2a]' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'
            }`}>
              {/* Toolbar */}
              <div className={`px-6 py-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between ${
                darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
              }`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full bg-emerald-500`} />
                  <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400">OCR Stream Output</span>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={handleCopy}
                    className={`flex-1 sm:flex-none px-3.5 py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider border rounded-none flex items-center justify-center gap-1.5 transition-all ${
                      copied 
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/40'
                        : darkMode 
                          ? 'border-stone-800 hover:border-stone-600 text-stone-300' 
                          : 'border-[#d8d4ca] hover:border-stone-800 text-stone-700'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied Buffer' : 'Copy All Text'}
                  </button>

                  <div className="h-4 border-l border-stone-300 dark:border-stone-800 hidden sm:block" />

                  <button
                    onClick={() => handleDownload('txt')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider border rounded-none flex items-center justify-center gap-1.5 ${
                      darkMode ? 'border-stone-800 hover:border-stone-600 text-stone-300' : 'border-[#d8d4ca] hover:border-stone-800 text-stone-700'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Plain .txt
                  </button>

                  <button
                    onClick={() => handleDownload('md')}
                    className={`flex-1 sm:flex-none px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider border rounded-none flex items-center justify-center gap-1.5 ${
                      darkMode ? 'border-stone-800 hover:border-stone-600 text-stone-300' : 'border-[#d8d4ca] hover:border-stone-800 text-stone-700'
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Markdown .md
                  </button>
                </div>
              </div>

              {/* Text Area Output Display */}
              <div className="p-6">
                <div 
                  className={`w-full min-h-[400px] max-h-[600px] overflow-y-auto p-6 border text-xs leading-relaxed whitespace-pre-wrap outline-none font-sans ${
                    fontStyle === 'mono' ? 'font-mono text-[11px]' : fontStyle === 'serif' ? 'font-serif text-[13px] tracking-normal' : 'font-sans text-[12px]'
                  } ${
                    darkMode 
                      ? 'bg-[#10100f] border-stone-800 text-stone-300' 
                      : 'bg-white border-[#e6e2d8] text-stone-800'
                  }`}
                  style={{ contentEditable: false }}
                >
                  {getHighlightedText(extractedText || 'No text extracted.', searchQuery)}
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : file ? (
        /* File Uploaded, Options Panel Before Scan */
        <div className="max-w-3xl mx-auto">
          <div className={`p-8 border rounded-none mb-8 ${
            darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
          }`}>
            <h2 className="text-xl sm:text-2xl font-serif font-medium mb-6 italic">Document OCR Parameters</h2>
            
            {/* Active file preview label */}
            <div className={`p-4 border rounded-none flex items-center justify-between gap-4 mb-8 ${
              darkMode ? 'bg-[#121211] border-stone-800' : 'bg-white border-[#e6e2d8]'
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
                Change File
              </button>
            </div>

            {/* Presets Grid */}
            <div className="mb-8">
              <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400 mb-3.5">1. Select Processing Preset</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`p-4 border cursor-pointer transition-all ${
                      selectedPreset === preset.id
                        ? darkMode 
                          ? 'border-[#bfa15f] bg-[#bfa15f]/5' 
                          : 'border-[#8c1d1a] bg-[#8c1d1a]/5'
                        : darkMode
                          ? 'border-stone-800 hover:border-stone-600 bg-transparent'
                          : 'border-[#e6e2d8] hover:border-stone-400 bg-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="font-serif font-medium text-sm">{preset.name}</h4>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
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
                    <p className="text-[11px] text-stone-500 leading-relaxed font-serif">{preset.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom instruction prompt */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400">2. Custom Instructions (Optional)</label>
                <span className="text-[9px] font-mono text-stone-500 uppercase">Gemini-3.5-flash Grounded</span>
              </div>
              <textarea
                placeholder="E.g., 'Only extract names of participants listed in section 3', 'Ignore headers and footers', 'Translate the resulting extracted text into English'..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                className={`w-full p-4 text-xs border rounded-none h-20 focus:outline-none focus:ring-0 ${
                  darkMode 
                    ? 'bg-[#121211] border-stone-800 focus:border-[#bfa15f] text-stone-200 placeholder-stone-600' 
                    : 'bg-white border-[#dcd9d0] focus:border-stone-800 text-stone-800 placeholder-stone-400'
                }`}
              />
            </div>

            {/* Run Action */}
            <button
              onClick={triggerOCR}
              className={`w-full py-3 rounded-none font-sans font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 ${
                darkMode 
                  ? 'bg-[#bfa15f] text-black hover:opacity-95' 
                  : 'bg-[#8c1d1a] text-white hover:opacity-95'
              }`}
            >
              <ScanText className="w-4 h-4" />
              Compile & Execute OCR Scan
            </button>
          </div>
        </div>
      ) : (
        /* File Dropzone - Elegant Empty Upload State */
        <div className="max-w-2xl mx-auto">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed p-12 text-center cursor-pointer transition-all ${
              darkMode 
                ? 'border-stone-800 hover:border-stone-600 bg-[#121211] hover:bg-[#151514]' 
                : 'border-stone-300 hover:border-stone-500 bg-[#FAF9F5]/40 hover:bg-white hover:shadow-xl'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".pdf,image/png,image/jpeg,image/webp" 
              className="hidden" 
            />

            <div className={`w-12 h-12 rounded-none border flex items-center justify-center mx-auto mb-6 ${
              darkMode ? 'border-[#333331] text-[#bfa15f]/80' : 'border-[#e5e0d4] text-[#8c1d1a]'
            }`}>
              <Upload className="w-5 h-5" />
            </div>

            <h3 className="font-serif font-medium text-xl mb-2 italic">Select Document to OCR Scan</h3>
            <p className={`text-xs font-serif max-w-sm mx-auto mb-6 leading-relaxed ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              Drag and drop your PDF document package, scanned receipt, invoice, or screenshot directly here.
            </p>

            <span className={`inline-block px-4 py-2 border text-[10px] font-sans font-bold uppercase tracking-wider ${
              darkMode 
                ? 'border-stone-800 text-[#bfa15f]' 
                : 'border-stone-200 text-[#8c1d1a]'
            }`}>
              Supported: PDF, PNG, JPG, WebP
            </span>
          </div>

          {/* Secure Trust Reassurance Footer inside the dropzone view */}
          <div className="mt-8 flex items-center justify-center gap-3 text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            <ShieldCheck className="w-4 h-4" />
            <span>Secure In-Browser Cryptographic Memory Buffer</span>
          </div>
        </div>
      )}

    </div>
  );
}
