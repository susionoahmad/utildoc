import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, CheckCircle2, Download, ShieldCheck, 
  Settings, Loader2, RefreshCw, FileImage, Sparkles, Grid, Layers
} from 'lucide-react';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { DocumentFile } from '../types';
import { MOCK_FILES } from '../data';
import { EditorialProgressBar } from './EditorialProgressBar';

interface PDFPageImage {
  pageNumber: number;
  dataUrl: string;
}

// Function to dynamically load the PDF.js library from CDN
function loadPdfJs(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = (err) => {
      reject(new Error('Failed to load PDF.js from CDN. Please check your internet connection.'));
    };
    document.head.appendChild(script);
  });
}

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
    
    // Page Title
    page.drawText(`CATALOG ENTRY #${i}`, {
      x: 50,
      y: height - 200,
      size: 24,
      font: helveticaBold,
      color: { type: 'RGB' as any, red: 0.15, green: 0.15, blue: 0.15 } as any
    });
    
    page.drawText('This document represents a certified dynamic preview layout sheet.', {
      x: 50,
      y: height - 240,
      size: 12,
      font: helveticaFont,
      color: { type: 'RGB' as any, red: 0.3, green: 0.3, blue: 0.3 } as any
    });

    page.drawText('Fully render individual pages client-side into rasterized assets with sub-pixel text rendering.', {
      x: 50,
      y: height - 260,
      size: 11,
      font: helveticaFont,
      color: { type: 'RGB' as any, red: 0.4, green: 0.4, blue: 0.4 } as any
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

interface PDFToImageToolProps {
  darkMode: boolean;
  setView: (view: string) => void;
}

export default function PDFToImageTool({ darkMode, setView }: PDFToImageToolProps) {
  const [file, setFile] = useState<DocumentFile | null>(null);
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');
  const [quality, setQuality] = useState<'standard' | 'high' | 'ultra'>('high');
  const [rangeMode, setRangeMode] = useState<'all' | 'custom'>('all');
  const [customRange, setCustomRange] = useState('1-3');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  
  const [pagesImages, setPagesImages] = useState<PDFPageImage[]>([]);
  const [rawFileBytes, setRawFileBytes] = useState<Uint8Array | null>(null);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      setErrorMsg(null);
      setPagesImages([]);
      setZipUrl(null);
      try {
        const arrayBuffer = await f.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const pageCount = pdfDoc.getPageCount();
        
        setFile({
          id: `file-to-img-${Date.now()}`,
          name: f.name,
          size: f.size,
          type: f.type || 'application/pdf',
          pageCount,
          uploadedAt: new Date(),
          status: 'queued',
          progress: 100
        });
        setRawFileBytes(new Uint8Array(arrayBuffer));
      } catch (err) {
        console.error('Failed to parse PDF for rendering:', err);
        setErrorMsg('Could not parse the uploaded PDF file. It might be corrupt or encrypted.');
      }
    }
  };

  const loadSample = async () => {
    setIsProcessing(true);
    setProgress(15);
    setStep('Compiling editorial sample document...');
    setErrorMsg(null);
    setPagesImages([]);
    setZipUrl(null);
    
    try {
      const mockFile = MOCK_FILES[0]; // Invoice_June_2025.pdf
      const bytes = await generateSamplePdfBytes(mockFile.name, mockFile.pageCount);
      
      setFile({
        id: `file-to-img-sample-${Date.now()}`,
        name: mockFile.name,
        size: bytes.byteLength,
        type: 'application/pdf',
        pageCount: mockFile.pageCount,
        uploadedAt: new Date(),
        status: 'queued',
        progress: 100
      });
      setRawFileBytes(bytes);
      setProgress(100);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load sample file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractImages = async () => {
    if (!file || !rawFileBytes) return;
    setIsProcessing(true);
    setProgress(10);
    setStep('Loading PDF rendering libraries...');
    setErrorMsg(null);
    setPagesImages([]);
    setZipUrl(null);

    try {
      const pdfjsLib = await loadPdfJs();
      
      setProgress(25);
      setStep('Parsing internal document structure...');
      
      const loadingTask = pdfjsLib.getDocument({ data: rawFileBytes });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      let pagesToRender: number[] = [];
      if (rangeMode === 'all') {
        for (let i = 1; i <= totalPages; i++) {
          pagesToRender.push(i);
        }
      } else {
        // Parse custom range e.g. "1-3, 5"
        const indices = new Set<number>();
        const parts = customRange.split(',');
        for (const part of parts) {
          const trimmed = part.trim();
          if (trimmed.includes('-')) {
            const [startStr, endStr] = trimmed.split('-');
            const start = parseInt(startStr.trim(), 10);
            const end = parseInt(endStr.trim(), 10);
            if (!isNaN(start) && !isNaN(end)) {
              const min = Math.max(1, Math.min(start, end));
              const max = Math.min(totalPages, Math.max(start, end));
              for (let i = min; i <= max; i++) {
                indices.add(i);
              }
            }
          } else {
            const pageNum = parseInt(trimmed, 10);
            if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
              indices.add(pageNum);
            }
          }
        }
        pagesToRender = Array.from(indices).sort((a, b) => a - b);
      }

      if (pagesToRender.length === 0) {
        throw new Error('No valid pages found in specified page range range.');
      }

      const scale = quality === 'standard' ? 1.5 : quality === 'high' ? 2.5 : 3.5;
      const formatType = format === 'png' ? 'image/png' : 'image/jpeg';
      const renderedImages: PDFPageImage[] = [];

      for (let index = 0; index < pagesToRender.length; index++) {
        const pageNum = pagesToRender[index];
        const percent = Math.floor(25 + ((index / pagesToRender.length) * 60));
        setProgress(percent);
        setStep(`Rasterizing Page ${pageNum} of ${totalPages} (Scale ${scale}x)...`);

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not establish 2D canvas drawing context.');
        }

        // Fill white background for JPEGs
        if (format === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        const dataUrl = canvas.toDataURL(formatType, 0.92);
        renderedImages.push({
          pageNumber: pageNum,
          dataUrl
        });
      }

      setProgress(90);
      setStep('Bundling rasterized pages to compressed ZIP file...');

      const zip = new JSZip();
      for (const img of renderedImages) {
        const base64Data = img.dataUrl.split(',')[1];
        const filename = `${file.name.replace(/\.[^/.]+$/, "")}_Page_${img.pageNumber}.${format}`;
        zip.file(filename, base64Data, { base64: true });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      
      setPagesImages(renderedImages);
      setZipUrl(url);
      setProgress(100);
      setStep('Success! Pages converted flawlessly.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during page conversion.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSingleImage = (img: PDFPageImage) => {
    const link = document.createElement('a');
    link.href = img.dataUrl;
    link.download = `${file?.name.replace(/\.[^/.]+$/, "")}_Page_${img.pageNumber}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetAll = () => {
    setFile(null);
    setRawFileBytes(null);
    setPagesImages([]);
    setZipUrl(null);
    setErrorMsg(null);
    setProgress(0);
  };

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (zipUrl && file) {
          const link = document.createElement('a');
          link.href = zipUrl;
          link.download = `${file.name.replace(/\.[^/.]+$/, "")}_Images.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (file && rawFileBytes && !isProcessing && pagesImages.length === 0) {
          handleExtractImages();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zipUrl, file, rawFileBytes, isProcessing, pagesImages, format, quality, rangeMode, customRange]);

  return (
    <div id="pdf-to-image-tool-container" className="max-w-4xl mx-auto px-4 py-8">
      {/* Editorial Header */}
      <div className="mb-8 border-b border-stone-200 dark:border-stone-800 pb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-sans font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-none border ${
              darkMode ? 'bg-[#2a251c] text-[#bfa15f] border-[#bfa15f]/30' : 'bg-[#f6f2eb] text-[#8c1d1a] border-[#8c1d1a]/20'
            }`}>
              Studio Utility
            </span>
          </div>
          <h1 className={`text-4xl font-serif font-medium tracking-tight italic ${
            darkMode ? 'text-stone-100' : 'text-stone-950'
          }`}>
            PDF to Image
          </h1>
          <p className={`text-xs font-serif leading-relaxed mt-2 max-w-xl ${
            darkMode ? 'text-stone-400' : 'text-stone-600'
          }`}>
            Rasterize documents client-side into clean, individual high-fidelity image formats. Fully customizable scale factor layouts.
          </p>
        </div>
        
        <button
          onClick={() => setView('dashboard')}
          className={`px-4 py-2 text-xs font-sans font-bold uppercase tracking-widest border transition-all ${
            darkMode 
              ? 'border-stone-800 text-stone-300 hover:bg-stone-900 hover:text-white' 
              : 'border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900'
          }`}
        >
          Catalog
        </button>
      </div>

      {errorMsg && (
        <div className={`p-4 mb-6 rounded-none border text-xs font-serif leading-relaxed flex items-center justify-between ${
          darkMode ? 'bg-[#2a1a1a] border-[#5a1c1a] text-red-400' : 'bg-[#fff5f5] border-[#f5c6cb] text-red-700'
        }`}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="font-sans font-bold uppercase tracking-wider text-[10px] underline ml-4 hover:opacity-85">
            Dismiss
          </button>
        </div>
      )}

      {isProcessing ? (
        <EditorialProgressBar 
          progress={progress} 
          step={step} 
          darkMode={darkMode} 
          title="Typesetting Graphics Pipeline..."
        />
      ) : !file ? (
        /* File Upload Drop Zone */
        <div id="dropzone-container" className="mb-8">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const f = e.dataTransfer.files[0];
                setErrorMsg(null);
                setPagesImages([]);
                setZipUrl(null);
                try {
                  const arrayBuffer = await f.arrayBuffer();
                  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
                  const pageCount = pdfDoc.getPageCount();
                  setFile({
                    id: `file-to-img-${Date.now()}`,
                    name: f.name,
                    size: f.size,
                    type: f.type || 'application/pdf',
                    pageCount,
                    uploadedAt: new Date(),
                    status: 'queued',
                    progress: 100
                  });
                  setRawFileBytes(new Uint8Array(arrayBuffer));
                } catch (err) {
                  setErrorMsg('Failed to parse dropped PDF file.');
                }
              }
            }}
            className={`border-2 border-dashed rounded-none p-12 text-center cursor-pointer transition-all ${
              darkMode 
                ? 'border-stone-800 bg-[#161615] hover:border-[#bfa15f]/50 hover:bg-[#181816]' 
                : 'border-stone-300 bg-[#faf9f6] hover:border-[#8c1d1a]/50 hover:bg-[#f6f4ed]'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="application/pdf"
              className="hidden"
            />
            <Upload className={`w-10 h-10 mx-auto mb-4 ${darkMode ? 'text-stone-600' : 'text-stone-400'}`} />
            
            <h3 className={`text-sm font-sans font-bold uppercase tracking-widest mb-1 ${
              darkMode ? 'text-stone-200' : 'text-stone-800'
            }`}>
              Drag & Drop Target PDF
            </h3>
            <p className={`text-xs font-serif leading-relaxed max-w-sm mx-auto mb-6 ${
              darkMode ? 'text-stone-500' : 'text-stone-500'
            }`}>
              Select a secure document to compile pages into clean image grids. Maximum recommended size 30 MB.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
              <button
                type="button"
                className={`px-5 py-2.5 text-xs font-sans font-bold uppercase tracking-widest transition-all ${
                  darkMode 
                    ? 'bg-[#eae7e0] text-[#121211] hover:bg-white' 
                    : 'bg-[#1c1c1a] text-[#FAF9F5] hover:bg-stone-800'
                }`}
              >
                Browse System
              </button>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  loadSample();
                }}
                className={`px-5 py-2.5 text-xs font-sans font-bold uppercase tracking-widest border transition-all ${
                  darkMode 
                    ? 'border-stone-800 text-stone-300 hover:border-stone-600 hover:bg-stone-900' 
                    : 'border-stone-300 text-stone-600 hover:border-stone-50 hover:bg-stone-100'
                }`}
              >
                Load Tax Review Sample
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Render Controls or Output Display */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Controls Column (left) */}
          <div className="md:col-span-1 space-y-6">
            <div className={`p-5 rounded-none border ${
              darkMode ? 'bg-[#161615] border-[#252524]' : 'bg-[#faf9f6] border-[#e6e1d5]'
            }`}>
              <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3 mb-4">
                <FileText className={`w-4 h-4 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`} />
                <h3 className="text-xs font-sans font-bold uppercase tracking-wider">Document Specs</h3>
              </div>
              <div className="space-y-3 font-serif text-[11px] leading-relaxed">
                <p className="truncate"><span className="font-sans font-bold uppercase tracking-wider text-[9px] block text-stone-400 dark:text-stone-500">Filename</span>{file.name}</p>
                <p><span className="font-sans font-bold uppercase tracking-wider text-[9px] block text-stone-400 dark:text-stone-500">File Size</span>{formatSize(file.size)}</p>
                <p><span className="font-sans font-bold uppercase tracking-wider text-[9px] block text-stone-400 dark:text-stone-500">Page Count</span>{file.pageCount} Pages</p>
              </div>

              <button 
                onClick={resetAll}
                className="w-full mt-5 px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider border border-red-200 dark:border-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10 transition-all"
              >
                Clear Document
              </button>
            </div>

            {pagesImages.length === 0 && (
              <div className={`p-5 rounded-none border ${
                darkMode ? 'bg-[#161615] border-[#252524]' : 'bg-[#faf9f6] border-[#e6e1d5]'
              }`}>
                <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3 mb-4">
                  <Settings className={`w-4 h-4 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`} />
                  <h3 className="text-xs font-sans font-bold uppercase tracking-wider">Conversion Options</h3>
                </div>

                <div className="space-y-4">
                  {/* Format Choice */}
                  <div>
                    <label className="block text-[9px] font-sans font-bold uppercase tracking-wider text-stone-400 mb-2">Image Format</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => setFormat('png')}
                        className={`py-2 text-xs font-sans font-bold uppercase tracking-wider border transition-all ${
                          format === 'png'
                            ? (darkMode ? 'bg-[#bfa15f] border-[#bfa15f] text-[#121211]' : 'bg-[#8c1d1a] border-[#8c1d1a] text-white')
                            : (darkMode ? 'border-stone-800 hover:bg-stone-900 text-stone-300' : 'border-stone-300 hover:bg-stone-50 text-stone-600')
                        }`}
                      >
                        PNG
                      </button>
                      <button 
                        onClick={() => setFormat('jpeg')}
                        className={`py-2 text-xs font-sans font-bold uppercase tracking-wider border transition-all ${
                          format === 'jpeg'
                            ? (darkMode ? 'bg-[#bfa15f] border-[#bfa15f] text-[#121211]' : 'bg-[#8c1d1a] border-[#8c1d1a] text-white')
                            : (darkMode ? 'border-stone-800 hover:bg-stone-900 text-stone-300' : 'border-stone-300 hover:bg-stone-50 text-stone-600')
                        }`}
                      >
                        JPEG
                      </button>
                    </div>
                  </div>

                  {/* Quality Settings */}
                  <div>
                    <label className="block text-[9px] font-sans font-bold uppercase tracking-wider text-stone-400 mb-2">DPI Resolution</label>
                    <div className="space-y-2">
                      {[
                        { id: 'standard', name: 'Standard Quality', scale: '1.5x (150 DPI)', desc: 'Optimized for mobile web screens.' },
                        { id: 'high', name: 'High Resolution', scale: '2.5x (250 DPI)', desc: 'Crisp text structure and image clarity.' },
                        { id: 'ultra', name: 'Extreme Fidelity', scale: '3.5x (350 DPI)', desc: 'Professional typesetting catalog density.' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setQuality(item.id as any)}
                          className={`w-full text-left p-2.5 border transition-all flex flex-col ${
                            quality === item.id
                              ? (darkMode ? 'border-[#bfa15f] bg-[#221e16]' : 'border-[#8c1d1a] bg-[#faf5f5]')
                              : (darkMode ? 'border-stone-800 hover:bg-stone-900 bg-[#121211]' : 'border-stone-200 hover:bg-stone-50 bg-white')
                          }`}
                        >
                          <span className="text-[11px] font-sans font-bold tracking-tight uppercase flex justify-between items-center w-full">
                            <span>{item.name}</span>
                            <span className="font-mono text-[9px] lowercase opacity-60">{item.scale}</span>
                          </span>
                          <span className="text-[10px] font-serif text-stone-500 mt-1">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Page range configuration */}
                  <div>
                    <label className="block text-[9px] font-sans font-bold uppercase tracking-wider text-stone-400 mb-2">Extract Range</label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setRangeMode('all')}
                          className={`flex-1 py-1.5 text-xs font-sans font-bold uppercase tracking-wider border transition-all ${
                            rangeMode === 'all'
                              ? (darkMode ? 'bg-stone-800 border-stone-600 text-stone-100' : 'bg-stone-200 border-stone-300 text-stone-900')
                              : (darkMode ? 'border-stone-800 text-stone-400' : 'border-stone-200 text-stone-600')
                          }`}
                        >
                          All Pages
                        </button>
                        <button 
                          onClick={() => setRangeMode('custom')}
                          className={`flex-1 py-1.5 text-xs font-sans font-bold uppercase tracking-wider border transition-all ${
                            rangeMode === 'custom'
                              ? (darkMode ? 'bg-stone-800 border-stone-600 text-stone-100' : 'bg-stone-200 border-stone-300 text-stone-900')
                              : (darkMode ? 'border-stone-800 text-stone-400' : 'border-stone-200 text-stone-600')
                          }`}
                        >
                          Custom Range
                        </button>
                      </div>

                      {rangeMode === 'custom' && (
                        <div>
                          <input 
                            type="text"
                            value={customRange}
                            onChange={(e) => setCustomRange(e.target.value)}
                            placeholder="e.g. 1-3, 5"
                            className={`w-full px-3 py-2 text-xs font-mono rounded-none border focus:outline-none ${
                              darkMode 
                                ? 'bg-[#121211] border-stone-800 text-stone-100 focus:border-[#bfa15f]' 
                                : 'bg-white border-stone-300 text-stone-950 focus:border-[#8c1d1a]'
                            }`}
                          />
                          <p className="text-[10px] font-serif text-stone-400 mt-1">Specify comma-separated indices or hyphens.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleExtractImages}
                    className={`w-full py-3 mt-4 text-xs font-sans font-bold uppercase tracking-widest transition-all ${
                      darkMode 
                        ? 'bg-[#eae7e0] text-[#121211] hover:bg-white' 
                        : 'bg-[#1c1c1a] text-[#FAF9F5] hover:bg-stone-800'
                    }`}
                  >
                    Rasterize Pages
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Render Area Column (right) */}
          <div className="md:col-span-2">
            {pagesImages.length === 0 ? (
              <div className={`p-10 border rounded-none text-center h-full flex flex-col justify-center items-center ${
                darkMode ? 'bg-[#121211] border-stone-800' : 'bg-[#faf9f6] border-stone-200'
              }`}>
                <FileImage className={`w-12 h-12 mb-4 opacity-35 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`} />
                <h4 className={`text-sm font-sans font-bold uppercase tracking-wider mb-2 ${
                  darkMode ? 'text-stone-200' : 'text-stone-800'
                }`}>
                  Ready to Rasterize
                </h4>
                <p className={`text-xs font-serif leading-relaxed max-w-xs mx-auto ${
                  darkMode ? 'text-stone-500' : 'text-stone-500'
                }`}>
                  Select your formatting parameters and compile the document page structures into a rasterized image array.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Download Header Box */}
                <div className={`p-5 border rounded-none flex flex-col sm:flex-row items-center justify-between gap-4 ${
                  darkMode ? 'bg-[#181817] border-[#2a2a29]' : 'bg-[#fcfbf9] border-[#e6e1d5]'
                }`}>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="text-xs font-sans font-bold uppercase tracking-wider">Conversion Perfected</h4>
                      <p className={`text-[11px] font-serif ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                        Compiled {pagesImages.length} page layers into clean {format.toUpperCase()} frames.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {zipUrl && (
                      <a 
                        href={zipUrl}
                        download={`${file.name.replace(/\.[^/.]+$/, "")}_Images.zip`}
                        className={`flex-1 sm:flex-initial text-center px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                          darkMode 
                            ? 'bg-[#eae7e0] text-[#121211] hover:bg-white' 
                            : 'bg-[#1c1c1a] text-[#FAF9F5] hover:bg-stone-800'
                        }`}
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download ZIP
                      </a>
                    )}
                    
                    <button
                      onClick={() => setPagesImages([])}
                      className={`px-4 py-2.5 text-xs font-sans font-bold uppercase tracking-widest border transition-all ${
                        darkMode 
                          ? 'border-stone-800 text-stone-300 hover:bg-stone-900' 
                          : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                      }`}
                    >
                      Re-Configure
                    </button>
                  </div>
                </div>

                {/* Page Frames Grid */}
                <div>
                  <h3 className="text-xs font-sans font-bold uppercase tracking-wider mb-3 text-stone-400">Page Frames Array</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pagesImages.map((img) => (
                      <div 
                        key={img.pageNumber}
                        className={`border rounded-none p-3 flex flex-col justify-between ${
                          darkMode ? 'bg-[#161615] border-stone-800 hover:border-stone-700' : 'bg-[#faf9f6] border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="relative group overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900 mb-3 aspect-[1/1.414]">
                          <img 
                            src={img.dataUrl} 
                            alt={`Page ${img.pageNumber}`}
                            className="w-full h-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button
                              onClick={() => downloadSingleImage(img)}
                              className="bg-white hover:bg-stone-100 text-stone-900 p-2.5 rounded-none shadow"
                              title="Download single page"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="absolute top-2 left-2 bg-stone-950/80 text-white font-mono text-[9px] px-2 py-0.5 uppercase">
                            Page {img.pageNumber}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-stone-500">
                            Page_{img.pageNumber}.{format}
                          </span>
                          <button
                            onClick={() => downloadSingleImage(img)}
                            className={`px-3 py-1 text-[10px] font-sans font-bold uppercase tracking-wider flex items-center gap-1 border transition-all ${
                              darkMode 
                                ? 'border-stone-800 text-stone-300 hover:bg-stone-900' 
                                : 'border-stone-300 text-stone-600 hover:bg-stone-100'
                            }`}
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      )}

      {/* Safety Banner */}
      <div className={`mt-12 p-6 border rounded-none flex items-start gap-4 ${
        darkMode ? 'bg-[#181817] border-[#2a2a29]' : 'bg-[#fcfbf9] border-[#e6e1d5]'
      }`}>
        <ShieldCheck className={`w-5 h-5 mt-0.5 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
        <div>
          <h4 className="text-xs font-sans font-bold uppercase tracking-wider">TYPESETTING SAFEGUARD</h4>
          <p className={`text-[11px] font-serif leading-relaxed mt-1.5 ${
            darkMode ? 'text-stone-400' : 'text-stone-600'
          }`}>
            UtilDoc operates strictly in sandboxed memory space. Pages are processed and rasterized within your browser using secure Javascript canvas layers. No files or images are ever uploaded to an external server.
          </p>
        </div>
      </div>
    </div>
  );
}
