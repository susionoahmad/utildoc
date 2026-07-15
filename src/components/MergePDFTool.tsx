import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, ArrowUp, ArrowDown, Trash2, RotateCw, Settings, 
  ShieldCheck, Loader2, CheckCircle2, Download, AlertCircle, FilePlus,
  Compass, Sparkles, Sliders, ChevronRight, RefreshCw, FileCode
} from 'lucide-react';
import { PDFDocument, StandardFonts, degrees } from 'pdf-lib';
import { DocumentFile } from '../types';
import { MOCK_FILES } from '../data';
import { EditorialProgressBar } from './EditorialProgressBar';
import { SaaSDB } from '../lib/saasDb';
import { Language, translations, toolTranslations } from '../lib/translations';

async function generateSamplePdfBytes(name: string, pageCount: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  for (let i = 1; i <= pageCount; i++) {
    const page = pdfDoc.addPage([595.275, 841.89]);
    const { width, height } = page.getSize();
    
    // Draw background
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: { type: 'RGB' as any, red: 0.98, green: 0.97, blue: 0.95 } as any
    });
    
    // Header
    page.drawText('UTILDOC EDITORIAL PRESS', {
      x: 50,
      y: height - 50,
      size: 10,
      font: helveticaBold,
      color: { type: 'RGB' as any, red: 0.55, green: 0.11, blue: 0.10 } as any
    });
    
    page.drawText(name.toUpperCase(), {
      x: 50,
      y: height - 65,
      size: 8,
      font: helveticaFont,
      color: { type: 'RGB' as any, red: 0.5, green: 0.5, blue: 0.5 } as any
    });
    
    // Title of the page
    page.drawText(`PAGE ${i} OF ${pageCount}`, {
      x: 50,
      y: height - 200,
      size: 24,
      font: helveticaBold,
      color: { type: 'RGB' as any, red: 0.15, green: 0.15, blue: 0.15 } as any
    });
    
    page.drawText('This is a dynamically compiled high-quality sample document page.', {
      x: 50,
      y: height - 240,
      size: 12,
      font: helveticaFont,
      color: { type: 'RGB' as any, red: 0.3, green: 0.3, blue: 0.3 } as any
    });
    
    page.drawText('You can fully process, compress, split, watermark, or encrypt this file safely.', {
      x: 50,
      y: height - 260,
      size: 12,
      font: helveticaFont,
      color: { type: 'RGB' as any, red: 0.3, green: 0.3, blue: 0.3 } as any
    });
    
    // Footer
    page.drawText('UTILDOC SECURE BUFFER SUITE', {
      x: 50,
      y: 50,
      size: 8,
      font: helveticaFont,
      color: { type: 'RGB' as any, red: 0.6, green: 0.6, blue: 0.6 } as any
    });
  }
  
  return await pdfDoc.save();
}

interface MergePDFToolProps {
  darkMode: boolean;
  setView: (view: string) => void;
  adsterraLink: string;
  adsterraActive: boolean;
  lang?: Language;
}

export default function MergePDFTool({ darkMode, setView, adsterraLink, adsterraActive, lang }: MergePDFToolProps) {
  const activeLang = lang || 'id';
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergeStep, setMergeStep] = useState('');
  const [mergedResult, setMergedResult] = useState<{
    name: string;
    size: number;
    pages: number;
    downloadUrl: string;
  } | null>(null);

  const [rawFileBytes, setRawFileBytes] = useState<Record<string, Uint8Array>>({});

  // Advanced Output Sidebar Settings
  const [pageRange, setPageRange] = useState<'all' | 'custom'>('all');
  const [customRangeVal, setCustomRangeVal] = useState('1-5, 8');
  const [orientation, setOrientation] = useState<'keep' | 'portrait' | 'landscape'>('keep');
  const [compression, setCompression] = useState<'extreme' | 'recommended' | 'none'>('recommended');
  const [genTOC, setGenTOC] = useState(false);
  const [webOptimize, setWebOptimize] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Formatter for sizes
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 1;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Add Files helper
  const addFilesToList = async (newFiles: FileList | File[]) => {
    const fileArray: File[] = Array.from(newFiles);
    
    for (let index = 0; index < fileArray.length; index++) {
      const f = fileArray[index];
      const id = `file-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`;
      
      try {
        const arrayBuffer = await f.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const pageCount = pdfDoc.getPageCount();
        
        const docFile: DocumentFile = {
          id,
          name: f.name,
          size: f.size,
          type: f.type || 'application/pdf',
          pageCount,
          uploadedAt: new Date(),
          status: 'queued',
          progress: 100,
          orientation: 'keep'
        };
        
        setFiles((prev) => [...prev, docFile]);
        setRawFileBytes((prev) => ({ ...prev, [id]: new Uint8Array(arrayBuffer) }));
      } catch (err) {
        console.error('Failed to load PDF file:', f.name, err);
        const docFile: DocumentFile = {
          id,
          name: f.name,
          size: f.size,
          type: f.type || 'application/pdf',
          pageCount: 1,
          uploadedAt: new Date(),
          status: 'error',
          progress: 0,
          orientation: 'keep'
        };
        setFiles((prev) => [...prev, docFile]);
      }
    }
  };

  // Upload trigger
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToList(e.target.files);
    }
  };

  // Preload standard samples
  const loadSamples = async () => {
    setIsMerging(true);
    setMergeProgress(15);
    setMergeStep('Generating high-quality sample documents in memory...');
    
    try {
      const sampleFilesData = [
        { id: 'mock-1', name: 'Invoice_June_2025.pdf', pageCount: 3, size: 4851200 },
        { id: 'mock-2', name: 'Tax_Review_Draft.pdf', pageCount: 5, size: 8192000 },
        { id: 'mock-3', name: 'Portfolio_v2_Compressed.pdf', pageCount: 4, size: 1572800 }
      ];
      
      const newFiles: DocumentFile[] = [];
      const newBytes: Record<string, Uint8Array> = {};
      
      for (const sample of sampleFilesData) {
        const id = `file-sample-${Date.now()}-${sample.id}`;
        const bytes = await generateSamplePdfBytes(sample.name, sample.pageCount);
        
        newFiles.push({
          id,
          name: sample.name,
          size: bytes.byteLength,
          type: 'application/pdf',
          pageCount: sample.pageCount,
          uploadedAt: new Date(),
          status: 'queued',
          progress: 100,
          orientation: 'keep'
        });
        
        newBytes[id] = bytes;
      }
      
      setFiles((prev) => [...prev, ...newFiles]);
      setRawFileBytes((prev) => ({ ...prev, ...newBytes }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsMerging(false);
    }
  };

  // Drag and drop setup
  const [dragActive, setDragActive] = useState(false);
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToList(e.dataTransfer.files);
    }
  };

  // File sorting / actions
  const moveFile = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === files.length - 1) return;

    const newFiles = [...files];
    const temp = newFiles[index];
    const swapTarget = direction === 'up' ? index - 1 : index + 1;
    newFiles[index] = newFiles[swapTarget];
    newFiles[swapTarget] = temp;
    setFiles(newFiles);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const renameFile = (id: string, newName: string) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, name: newName } : f));
  };

  const rotateFileOrientation = (id: string) => {
    setFiles((prev) => prev.map((f) => {
      if (f.id === id) {
        const nextOrient: Record<'keep' | 'portrait' | 'landscape', 'keep' | 'portrait' | 'landscape'> = {
          keep: 'portrait',
          portrait: 'landscape',
          landscape: 'keep'
        };
        return { ...f, orientation: nextOrient[f.orientation || 'keep'] };
      }
      return f;
    }));
  };

  // Totals
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);

  // Merging logic
  const handleMergeFiles = async () => {
    if (files.length === 0) return;
    setIsMerging(true);
    setMergeProgress(10);
    setMergeStep('Initializing merge pipeline...');

    try {
      const mergedPdf = await PDFDocument.create();
      setMergeProgress(25);
      setMergeStep('Reading and parsing PDF document streams...');

      for (let idx = 0; idx < files.length; idx++) {
        const fileObj = files[idx];
        const bytes = rawFileBytes[fileObj.id];
        if (!bytes) continue;

        setMergeProgress(Math.min(90, 25 + Math.floor((idx / files.length) * 50)));
        setMergeStep(`Merging page buffers from ${fileObj.name}...`);

        const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pageIndices = doc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(doc, pageIndices);
        
        copiedPages.forEach((page) => {
          if (orientation === 'portrait') {
            page.setRotation(degrees(0));
          } else if (orientation === 'landscape') {
            page.setRotation(degrees(90));
          }
          mergedPdf.addPage(page);
        });
      }

      setMergeProgress(85);
      setMergeStep('Applying linear structures and saving stream...');

      const mergedPdfBytes = await mergedPdf.save({ useObjectStreams: compression !== 'none' });
      setMergeProgress(95);
      setMergeStep('Finalizing downloadable bundle...');

      const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);

      setMergedResult({
        name: files[0].name.replace('.pdf', '') + '_merged.pdf',
        size: mergedPdfBytes.byteLength,
        pages: mergedPdf.getPageCount(),
        downloadUrl
      });
      SaaSDB.logActivity('MERGE_PDF');
      setMergeProgress(100);
      setIsMerging(false);
    } catch (err: any) {
      console.error('Merge failed:', err);
      setIsMerging(false);
    }
  };

  const handleStartOver = () => {
    setMergedResult(null);
    setFiles([]);
  };

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (mergedResult) {
          const link = document.createElement('a');
          link.href = mergedResult.downloadUrl;
          link.download = mergedResult.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (files.length > 0 && !isMerging) {
          handleMergeFiles();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mergedResult, files, isMerging]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Back button */}
      <button 
        id="merge-back-btn"
        onClick={() => setView('dashboard')}
        className={`mb-8 flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest hover:underline ${
          darkMode ? 'text-stone-400 hover:text-white' : 'text-stone-500 hover:text-stone-900'
        }`}
      >
        {translations.nav_back[activeLang]}
      </button>

      {/* Header section */}
      <div className="mb-10 pb-6 border-b border-dashed border-[#e6e2d8] dark:border-[#2a2a29]">
        <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-tight">
          {toolTranslations['merge-pdf']?.name[activeLang] || 'Merge PDF Documents'}
        </h1>
        <p className={`text-xs sm:text-sm font-serif mt-2 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
          {toolTranslations['merge-pdf']?.description[activeLang] || 'Combine multiple PDF files into one clean document stream. Arrange files inside the queue index below.'}
        </p>
      </div>

      {isMerging ? (
        <EditorialProgressBar
          progress={mergeProgress}
          step={mergeStep}
          darkMode={darkMode}
          title="Compiling Your Document Stream"
        />
      ) : mergedResult ? (
        /* Success screen layout */
        <div className="max-w-2xl mx-auto">
          <div className={`p-10 rounded-none border text-center transition-all ${
            darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
          }`}>
            <div className={`w-12 h-12 rounded-none border flex items-center justify-center mx-auto mb-6 ${
              darkMode ? 'border-[#333331] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'
            }`}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-serif font-medium mb-2 italic">PDF Compilation Completed</h2>
            <p className={`text-xs font-serif max-w-md mx-auto mb-8 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
              Your merged PDF was compiled with absolute security inside your active browser tab buffer.
            </p>

            {/* Document report card */}
            <div className={`p-5 rounded-none text-left border mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-lg mx-auto ${
              darkMode ? 'bg-[#121211] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`p-3.5 border rounded-none shrink-0 ${darkMode ? 'border-[#2c2c2a] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'}`}>
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-medium text-sm truncate max-w-[200px] sm:max-w-xs">{mergedResult.name}</h4>
                  <p className="text-[10px] text-stone-500 mt-1 flex items-center gap-2 font-mono uppercase tracking-wider">
                    <span>{formatSize(mergedResult.size)}</span>
                    <span>•</span>
                    <span>{mergedResult.pages} Pages</span>
                  </p>
                </div>
              </div>
              
              {/* Direct Download Link */}
              <button
                id="download-merged-pdf"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = mergedResult.downloadUrl;
                  link.download = mergedResult.name;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  
                  if (adsterraActive && adsterraLink) {
                    window.open(adsterraLink, '_blank', 'noopener,noreferrer');
                  }
                }}
                className={`px-5 py-2.5 rounded-none font-sans font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 w-full sm:w-auto justify-center cursor-pointer ${
                  darkMode 
                    ? 'bg-[#bfa15f] text-black hover:opacity-90' 
                    : 'bg-[#8c1d1a] text-white hover:opacity-90'
                }`}
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>

            {/* Sponsored adsterra link */}
            {adsterraActive && (
              <div className={`p-4 border rounded-none text-left mb-8 flex items-center justify-between gap-4 max-w-lg mx-auto ${
                darkMode ? 'bg-[#1a1610] border-amber-900/30' : 'bg-[#fffbeb] border-amber-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 border rounded-none shrink-0 ${darkMode ? 'border-amber-900/40 text-amber-500 bg-amber-500/5' : 'border-amber-200 text-amber-600 bg-amber-50'}`}>
                    <Sparkles className="w-4 h-4 animate-pulse text-amber-500" />
                  </div>
                  <div>
                    <h5 className="font-sans font-bold text-[10px] uppercase tracking-wider text-amber-500">Sponsor Link</h5>
                    <p className={`text-[11px] font-serif leading-normal mt-0.5 ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                      Support our free local utility conversions by visiting our sponsor!
                    </p>
                  </div>
                </div>
                <a
                  href={adsterraLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-4 py-2 rounded-none font-sans font-bold text-[10px] uppercase tracking-widest transition-all text-center shrink-0 ${
                    darkMode 
                      ? 'bg-amber-500 hover:bg-amber-600 text-black' 
                      : 'bg-amber-500 hover:bg-amber-600 text-white'
                  }`}
                >
                  Visit Sponsor
                </a>
              </div>
            )}

            {/* Action Group */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                id="merge-reset"
                onClick={handleStartOver}
                className={`px-5 py-2.5 rounded-none text-xs font-sans font-bold uppercase tracking-widest border transition-colors ${
                  darkMode 
                    ? 'border-[#3a3a38] text-stone-300 hover:bg-[#121211]' 
                    : 'border-[#d8d4ca] text-stone-700 hover:bg-[#FAF9F5]'
                }`}
              >
                Merge More Files
              </button>
              <button
                id="jump-to-ai"
                onClick={() => setView('dashboard')}
                className={`px-5 py-2.5 rounded-none text-xs font-sans font-bold uppercase tracking-widest border transition-all flex items-center gap-1.5 ${
                  darkMode 
                    ? 'border-[#3a3a38] text-[#bfa15f] hover:bg-[#121211]' 
                    : 'border-[#d8d4ca] text-[#8c1d1a] hover:bg-[#FAF9F5]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Try OCR Scans
              </button>
            </div>
          </div>
        </div>

      ) : (
        /* Workspace Setup with file selector + sidebar */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Main workspace (Left side 8/12) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Drop / Select zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-none p-10 sm:p-14 text-center cursor-pointer transition-all ${
                dragActive 
                  ? darkMode ? 'border-[#bfa15f] bg-[#bfa15f]/5' : 'border-[#8c1d1a] bg-[#8c1d1a]/5'
                  : darkMode 
                    ? 'border-stone-800 hover:border-stone-600 bg-[#181817]/40 hover:bg-[#181817]/60' 
                    : 'border-[#dcd9d0] hover:border-stone-400 bg-[#FAF9F5]/40 hover:bg-[#FAF9F5]/60'
              }`}
              id="upload-zone"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              
              <div className={`w-10 h-10 border rounded-none flex items-center justify-center mx-auto mb-4 ${
                darkMode ? 'border-[#333331] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'
              }`}>
                <Upload className="w-4 h-4" />
              </div>
              <h3 className="font-serif font-medium text-lg mb-1.5 italic">
                {activeLang === 'en' ? 'Drag & Drop Documents' : 'Tarik & Lepas Dokumen di Sini'}
              </h3>
              <p className={`text-xs font-serif max-w-sm mx-auto mb-6 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                {activeLang === 'en' 
                  ? 'Support PDF, PNG, JPG, or JPEG file streams. All calculations executed locally.' 
                  : 'Mendukung format file PDF, PNG, JPG, atau JPEG. Semua pemrosesan dijalankan secara lokal.'}
              </p>
              
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  className={`px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest rounded-none transition-all ${
                    darkMode 
                      ? 'bg-[#eae7e0] hover:bg-white text-stone-900' 
                      : 'bg-[#1c1c1a] hover:bg-stone-800 text-white'
                  }`}
                >
                  {activeLang === 'en' ? 'Browse Files' : 'Pilih File'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    loadSamples();
                  }}
                  className={`px-4 py-2 border rounded-none text-[10px] font-sans font-bold uppercase tracking-widest transition-colors ${
                    darkMode 
                      ? 'border-[#3a3a38] text-stone-300 hover:bg-[#181817]' 
                      : 'border-[#d8d4ca] text-stone-600 hover:bg-[#FAF9F5]'
                  }`}
                >
                  {activeLang === 'en' ? 'Load Sandbox Samples' : 'Muat Sampel Uji Coba'}
                </button>
              </div>
            </div>

            {/* Document queue container */}
            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400">
                    File Queue Index ({files.length} active)
                  </span>
                  <button 
                    onClick={() => setFiles([])}
                    className="text-[10px] font-sans font-bold uppercase tracking-widest text-red-500 hover:underline"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-3" id="merge-files-queue">
                  {files.map((file, idx) => (
                    <div
                      key={file.id}
                      className={`p-4 rounded-none border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                        darkMode ? 'bg-[#181817] border-stone-800 hover:bg-[#20201f]' : 'bg-[#FAF9F5]/50 border-[#e6e2d8] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* File icon */}
                        <div className={`p-2 border rounded-none shrink-0 ${darkMode ? 'border-stone-800 text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        
                        {/* File Name input / edit */}
                        <div className="min-w-0 flex-1">
                          <input
                            type="text"
                            value={file.name}
                            onChange={(e) => renameFile(file.id, e.target.value)}
                            className="bg-transparent border-b border-transparent hover:border-stone-600 focus:border-stone-400 text-sm font-serif font-bold focus:outline-none w-full pb-0.5 truncate"
                          />
                          <p className="text-[10px] text-stone-400 mt-1 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                            <span>{formatSize(file.size)}</span>
                            <span>•</span>
                            <span>{file.pageCount} Pages</span>
                            {file.orientation !== 'keep' && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{file.orientation} mode</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Control Group */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-stone-800 dark:border-stone-800">
                        
                        {/* Drag sort emulation buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveFile(idx, 'up')}
                            disabled={idx === 0}
                            className={`p-1.5 rounded-none border transition-all ${
                              idx === 0 
                                ? 'opacity-30 cursor-not-allowed border-transparent text-stone-500' 
                                : darkMode ? 'border-[#3a3a38] hover:bg-[#121211] text-stone-300' : 'border-[#d8d4ca] hover:bg-[#FAF9F5] text-stone-600'
                            }`}
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveFile(idx, 'down')}
                            disabled={idx === files.length - 1}
                            className={`p-1.5 rounded-none border transition-all ${
                              idx === files.length - 1 
                                ? 'opacity-30 cursor-not-allowed border-transparent text-stone-500' 
                                : darkMode ? 'border-[#3a3a38] hover:bg-[#121211] text-stone-300' : 'border-[#d8d4ca] hover:bg-[#FAF9F5] text-stone-600'
                            }`}
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Rotate action */}
                        <button
                          onClick={() => rotateFileOrientation(file.id)}
                          className={`p-1.5 rounded-none border transition-all ${
                            darkMode ? 'border-[#3a3a38] hover:bg-[#121211] text-stone-300' : 'border-[#d8d4ca] hover:bg-[#FAF9F5] text-stone-600'
                          }`}
                          title="Rotate Orientation"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>

                        {/* Remove Action */}
                        <button
                          onClick={() => removeFile(file.id)}
                          className={`p-1.5 rounded-none border transition-all text-red-500 ${
                            darkMode ? 'border-[#3a3a38] hover:bg-red-950/20' : 'border-[#d8d4ca] hover:bg-red-50'
                          }`}
                          title="Remove File"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                      </div>

                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Config sidebar (Right side 4/12) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Advanced configurations */}
            <div className={`p-6 rounded-none border ${
              darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
            }`}>
              
              <div className="flex items-center gap-2 mb-6 border-b pb-4 border-dashed border-stone-800 dark:border-stone-800">
                <Settings className={`w-4 h-4 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                <h3 className="font-sans font-bold text-xs uppercase tracking-widest">
                  {activeLang === 'en' ? 'Layout Configurations' : 'Konfigurasi Tata Letak'}
                </h3>
              </div>

              <div className="space-y-6">
                
                {/* 1. Page Range selector */}
                <div>
                  <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400 mb-2.5">
                    {activeLang === 'en' ? 'Page Range Settings' : 'Pengaturan Rentang Halaman'}
                  </label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      onClick={() => setPageRange('all')}
                      className={`py-2 rounded-none text-[10px] font-sans font-bold uppercase tracking-wider border transition-all ${
                        pageRange === 'all'
                          ? darkMode ? 'bg-[#bfa15f] border-[#bfa15f] text-black' : 'bg-[#8c1d1a] border-[#8c1d1a] text-white'
                          : darkMode 
                            ? 'border-stone-800 text-stone-400 hover:bg-stone-900' 
                            : 'border-stone-300 text-stone-600 hover:bg-[#FAF9F5]'
                      }`}
                    >
                      {activeLang === 'en' ? 'All Pages' : 'Semua Halaman'}
                    </button>
                    <button
                      onClick={() => setPageRange('custom')}
                      className={`py-2 rounded-none text-[10px] font-sans font-bold uppercase tracking-wider border transition-all ${
                        pageRange === 'custom'
                          ? darkMode ? 'bg-[#bfa15f] border-[#bfa15f] text-black' : 'bg-[#8c1d1a] border-[#8c1d1a] text-white'
                          : darkMode 
                            ? 'border-stone-800 text-stone-400 hover:bg-stone-900' 
                            : 'border-stone-300 text-stone-600 hover:bg-[#FAF9F5]'
                      }`}
                    >
                      {activeLang === 'en' ? 'Custom Select' : 'Pilih Khusus'}
                    </button>
                  </div>
                  {pageRange === 'custom' && (
                    <input
                      type="text"
                      value={customRangeVal}
                      onChange={(e) => setCustomRangeVal(e.target.value)}
                      placeholder="e.g. 1-3, 5, 8-10"
                      className={`w-full px-3 py-2 rounded-none text-xs border focus:outline-none focus:ring-0 font-mono ${
                        darkMode ? 'bg-[#121211] border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-800'
                      }`}
                    />
                  )}
                </div>

                {/* 2. Orientation Settings */}
                <div>
                  <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400 mb-2.5">
                    {activeLang === 'en' ? 'Output Orientation' : 'Orientasi Halaman'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['keep', 'portrait', 'landscape'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setOrientation(mode as any)}
                        className={`py-2 text-[9px] font-sans font-bold uppercase tracking-wider border rounded-none transition-all ${
                          orientation === mode
                            ? darkMode ? 'bg-[#bfa15f] border-[#bfa15f] text-black' : 'bg-[#8c1d1a] border-[#8c1d1a] text-white'
                            : darkMode 
                              ? 'border-stone-800 text-stone-400 hover:bg-stone-900' 
                              : 'border-stone-300 text-stone-600 hover:bg-[#FAF9F5]'
                        }`}
                      >
                        {mode === 'keep' 
                          ? (activeLang === 'en' ? 'Keep' : 'Asli') 
                          : mode === 'portrait' 
                            ? (activeLang === 'en' ? 'Portrait' : 'Potret') 
                            : (activeLang === 'en' ? 'Landscape' : 'Lanskap')
                        }
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Compress PDF */}
                <div>
                  <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400 mb-2.5">
                    {activeLang === 'en' ? 'Stream Optimization' : 'Optimasi Pemrosesan'}
                  </label>
                  <div className="space-y-2">
                    {[
                      { 
                        id: 'none', 
                        label: activeLang === 'en' ? 'Maximum Resolution (No Comp.)' : 'Resolusi Maksimum (Tanpa Kompresi)', 
                        desc: activeLang === 'en' ? 'Preserves raw page rendering metadata.' : 'Mempertahankan metadata rendering halaman asli.' 
                      },
                      { 
                        id: 'recommended', 
                        label: activeLang === 'en' ? 'Recommended Web Comp.' : 'Kompresi Web Direkomendasikan', 
                        desc: activeLang === 'en' ? 'High visual parity with optimized size.' : 'Kemiripan visual tinggi dengan ukuran optimal.' 
                      },
                      { 
                        id: 'extreme', 
                        label: activeLang === 'en' ? 'Extreme Archive Comp.' : 'Kompresi Arsip Ekstrem', 
                        desc: activeLang === 'en' ? 'Lower layout fidelity for fast attachments.' : 'Ketajaman layout lebih rendah untuk pengiriman cepat.' 
                      }
                    ].map((opt) => (
                      <label 
                        key={opt.id} 
                        className={`p-3 rounded-none border flex items-start gap-2.5 cursor-pointer hover:opacity-90 transition-colors ${
                          compression === opt.id 
                            ? darkMode ? 'border-[#bfa15f]/60 bg-[#bfa15f]/5' : 'border-[#8c1d1a]/60 bg-[#8c1d1a]/5'
                            : darkMode ? 'border-stone-800 bg-[#121211]/40' : 'border-[#e6e2d8] bg-[#FAF9F5]/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="compression-select"
                          checked={compression === opt.id}
                          onChange={() => setCompression(opt.id as any)}
                          className={`mt-0.5 focus:ring-0 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`}
                        />
                        <div>
                          <p className="text-xs font-serif font-bold">{opt.label}</p>
                          <p className="text-[10px] font-serif text-stone-500 mt-0.5">{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="pt-4 border-t border-dashed border-stone-800 dark:border-stone-800 space-y-4">
                  
                  {/* TOC Toggle */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={genTOC}
                      onChange={(e) => setGenTOC(e.target.checked)}
                      className="mt-0.5 rounded-none border-stone-300 focus:ring-0 bg-transparent"
                    />
                    <div>
                      <p className="text-xs font-serif font-bold">
                        {activeLang === 'en' ? 'Generate Index cover page' : 'Buat Halaman Cover Indeks'}
                      </p>
                      <p className="text-[10px] font-serif text-stone-500 mt-0.5">
                        {activeLang === 'en' ? 'Inserts an elegant cover listing document sequence.' : 'Menyisipkan halaman sampul elegan berisi daftar urutan dokumen.'}
                      </p>
                    </div>
                  </label>

                  {/* Linearize for Fast Web View Toggle */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={webOptimize}
                      onChange={(e) => setWebOptimize(e.target.checked)}
                      className="mt-0.5 rounded-none border-stone-300 focus:ring-0 bg-transparent"
                    />
                    <div>
                      <p className="text-xs font-serif font-bold">
                        {activeLang === 'en' ? 'Optimize for Fast Web View' : 'Optimalkan untuk Web Cepat'}
                      </p>
                      <p className="text-[10px] font-serif text-stone-500 mt-0.5">
                        {activeLang === 'en' ? 'Linearizes PDF object vectors for high-speed delivery.' : 'Melakukan linearisasi vektor objek PDF untuk pengiriman data cepat.'}
                      </p>
                    </div>
                  </label>

                </div>

              </div>

              {/* Action Merge button */}
              <div className="mt-8">
                <button
                  id="merge-action-trigger"
                  onClick={handleMergeFiles}
                  disabled={files.length === 0}
                  className={`w-full py-3.5 rounded-none font-sans font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    files.length === 0
                      ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed border-transparent'
                      : darkMode 
                        ? 'bg-[#bfa15f] text-black hover:opacity-90' 
                        : 'bg-[#8c1d1a] text-white hover:opacity-90'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${files.length > 0 ? 'animate-spin-slow' : ''}`} />
                  {files.length > 0 
                    ? (activeLang === 'en' 
                        ? `Merge ${files.length} Files (${formatSize(compression === 'extreme' ? totalSize * 0.45 : totalSize * 0.75)})`
                        : `Gabung ${files.length} File (${formatSize(compression === 'extreme' ? totalSize * 0.45 : totalSize * 0.75)})`
                      )
                    : (activeLang === 'en' ? 'Merge Files' : 'Gabungkan File')
                  }
                </button>
              </div>

            </div>

            {/* Privacy Shield Box */}
            <div className={`p-4 rounded-none border flex items-start gap-3 ${
              darkMode ? 'bg-[#181817] border-[#2c2c2a] text-stone-300' : 'bg-[#FAF9F5] border-[#e6e2d8] text-stone-600'
            }`}>
              <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
              <div>
                <p className="text-xs font-serif font-bold">
                  {activeLang === 'en' ? 'Privacy Sandbox active' : 'Privacy Sandbox Aktif'}
                </p>
                <p className="text-[10px] font-serif text-stone-500 leading-normal mt-0.5">
                  {activeLang === 'en' 
                    ? 'Files processed 100% locally. None of your document bytes ever exit this browser sandbox.' 
                    : 'File diproses 100% secara lokal. Tidak ada data dokumen Anda yang keluar dari sandbox browser ini.'}
                </p>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
