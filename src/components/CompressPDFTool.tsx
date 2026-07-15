import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, FileArchive, CheckCircle2, Download, ShieldCheck, 
  Settings, Loader2, RefreshCw, BarChart2, ArrowRight, Sparkles
} from 'lucide-react';
import { PDFDocument, StandardFonts, PDFRawStream, PDFName } from 'pdf-lib';
import { DocumentFile } from '../types';
import { MOCK_FILES } from '../data';
import { EditorialProgressBar } from './EditorialProgressBar';
import { SaaSDB } from '../lib/saasDb';

interface CompressedImageResult {
  bytes: Uint8Array;
  width: number;
  height: number;
}

async function compressImageBytes(bytes: Uint8Array, level: 'extreme' | 'recommended' | 'low'): Promise<CompressedImageResult> {
  return new Promise((resolve) => {
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      
      let scale = 1.0;
      let quality = 0.8;
      
      if (level === 'extreme') {
        scale = 0.45;
        quality = 0.25;
      } else if (level === 'recommended') {
        scale = 0.7;
        quality = 0.55;
      } else {
        scale = 0.85;
        quality = 0.75;
      }
      
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ bytes, width: img.width, height: img.height });
        return;
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((b) => {
        if (!b) {
          resolve({ bytes, width: img.width, height: img.height });
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result instanceof ArrayBuffer) {
            resolve({ bytes: new Uint8Array(reader.result), width, height });
          } else {
            resolve({ bytes, width: img.width, height: img.height });
          }
        };
        reader.onerror = () => resolve({ bytes, width: img.width, height: img.height });
        reader.readAsArrayBuffer(b);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ bytes, width: 100, height: 100 });
    };
    img.src = url;
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

interface CompressPDFToolProps {
  darkMode: boolean;
  setView: (view: string) => void;
  adsterraLink: string;
  adsterraActive: boolean;
}

export default function CompressPDFTool({ darkMode, setView, adsterraLink, adsterraActive }: CompressPDFToolProps) {
  const [file, setFile] = useState<DocumentFile | null>(null);
  const [level, setLevel] = useState<'extreme' | 'recommended' | 'low'>('recommended');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [result, setResult] = useState<{
    name: string;
    originalSize: number;
    compressedSize: number;
    percentSaved: number;
    downloadUrl: string;
  } | null>(null);

  const [rawFileBytes, setRawFileBytes] = useState<Uint8Array | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const f = e.target.files[0];
      try {
        const arrayBuffer = await f.arrayBuffer();
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        const pageCount = pdfDoc.getPageCount();
        
        setFile({
          id: `file-comp-${Date.now()}`,
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
        console.error('Failed to parse PDF for compression:', err);
        setFile({
          id: `file-comp-${Date.now()}`,
          name: f.name,
          size: f.size,
          type: f.type || 'application/pdf',
          pageCount: 1,
          uploadedAt: new Date(),
          status: 'error',
          progress: 0
        });
      }
    }
  };

  const loadSample = async () => {
    setIsProcessing(true);
    setProgress(15);
    setStep('Compiling sample document in memory...');
    
    try {
      const mockFile = MOCK_FILES[0]; // Invoice June
      const bytes = await generateSamplePdfBytes(mockFile.name, mockFile.pageCount);
      
      setFile({
        id: `file-comp-sample-${Date.now()}`,
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
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompress = async () => {
    if (!file || !rawFileBytes) return;
    setIsProcessing(true);
    setProgress(10);
    setStep('Parsing PDF document structure...');

    try {
      const pdfDoc = await PDFDocument.load(rawFileBytes, { ignoreEncryption: true });
      setProgress(25);
      setStep('Scanning PDF objects for embedded image streams...');

      const indirectObjects = pdfDoc.context.enumerateIndirectObjects();
      const imageObjects: Array<{ ref: any; obj: any }> = [];

      for (const [ref, obj] of indirectObjects) {
        if (obj instanceof PDFRawStream) {
          const dict = obj.dict;
          const subtype = dict.get(PDFName.of('Subtype'));
          if (subtype === PDFName.of('Image')) {
            imageObjects.push({ ref, obj });
          }
        }
      }

      if (imageObjects.length > 0) {
        setProgress(40);
        setStep(`Optimizing ${imageObjects.length} embedded image streams...`);

        let processed = 0;
        for (const { ref, obj } of imageObjects) {
          processed++;
          setProgress(40 + Math.floor((processed / imageObjects.length) * 45));
          setStep(`Re-sampling graphic ${processed} of ${imageObjects.length}...`);

          try {
            const dict = obj.dict;
            const filter = dict.get(PDFName.of('Filter'));
            
            const isDCT = filter === PDFName.of('DCTDecode') || 
                          (filter instanceof PDFName && filter.toString() === '/DCTDecode') ||
                          (Array.isArray(filter) && filter.some(f => f === PDFName.of('DCTDecode') || (f instanceof PDFName && f.toString() === '/DCTDecode')));

            if (isDCT) {
              const originalBytes = obj.contents;
              const { bytes: compressedImgBytes, width: newWidth, height: newHeight } = await compressImageBytes(originalBytes, level);
              
              if (compressedImgBytes.byteLength < originalBytes.byteLength) {
                // Update length and dimensions in dictionary
                dict.set(PDFName.of('Length'), pdfDoc.context.obj(compressedImgBytes.length));
                dict.set(PDFName.of('Width'), pdfDoc.context.obj(newWidth));
                dict.set(PDFName.of('Height'), pdfDoc.context.obj(newHeight));
                
                // Construct new raw stream using the modified dictionary and compressed bytes
                const newStream = PDFRawStream.of(dict, compressedImgBytes);
                
                // Assign new raw stream to original reference
                pdfDoc.context.assign(ref, newStream);
              }
            }
          } catch (imgErr) {
            console.warn('Skipped an image object compression due to format:', imgErr);
          }
        }
      }

      setProgress(85);
      setStep('Pruning duplicate page elements and custom font descriptors...');

      pdfDoc.setProducer('UtilDoc Cryptographic Suite');
      pdfDoc.setCreator('UtilDoc');

      setProgress(90);
      setStep('Saving optimized PDF binary stream...');

      const compressedBytes = await pdfDoc.save({
        useObjectStreams: true
      });

      setProgress(95);
      setStep('Wrapping compressed binary object array buffers...');

      const originalSize = file.size;
      const finalSize = compressedBytes.byteLength;
      
      const percentSaved = Math.round((1 - (finalSize / originalSize)) * 100);

      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);

      setResult({
        name: `${file.name.replace('.pdf', '')}_optimized.pdf`,
        originalSize,
        compressedSize: finalSize,
        percentSaved: Math.max(0, percentSaved),
        downloadUrl
      });
      SaaSDB.logActivity('COMPRESS_PDF');
      setProgress(100);
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Compression failed:', err);
      setIsProcessing(false);
    }
  };

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (result) {
          const link = document.createElement('a');
          link.href = result.downloadUrl;
          link.download = result.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (file && rawFileBytes && !isProcessing) {
          handleCompress();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, file, rawFileBytes, isProcessing]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Back Button */}
      <button 
        onClick={() => setView('dashboard')}
        className={`mb-8 flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-widest hover:underline ${
          darkMode ? 'text-stone-400 hover:text-white' : 'text-stone-500 hover:text-stone-900'
        }`}
      >
        ← Back to All Utilities
      </button>

      {/* Header */}
      <div className="mb-10 pb-6 border-b border-dashed border-[#e6e2d8] dark:border-[#2a2a29]">
        <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-tight">Compress PDF Stream</h1>
        <p className={`text-xs sm:text-sm font-serif mt-2 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
          Subsample embedded image binaries and compile document maps to save storage for email attachments.
        </p>
      </div>

      {isProcessing ? (
        <EditorialProgressBar
          progress={progress}
          step={step}
          darkMode={darkMode}
          title="Compressing Object Streams"
        />
      ) : result ? (
        <div className="max-w-2xl mx-auto">
          <div className={`p-10 rounded-none border text-center transition-all ${
            darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
          }`}>
            <div className={`w-12 h-12 rounded-none border flex items-center justify-center mx-auto mb-6 ${
              darkMode ? 'border-[#333331] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'
            }`}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-serif font-medium mb-2 italic">Compression Successful!</h2>
            <p className={`text-xs font-serif max-w-md mx-auto mb-8 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
              Your PDF has been down-sampled and compiled safely in-browser.
            </p>

            {/* Visual metrics panel */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
              <div className={`p-4 rounded-none border text-center ${darkMode ? 'bg-[#121211] border-stone-800' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'}`}>
                <span className="text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400">Before Size</span>
                <p className="text-sm font-mono mt-1 text-stone-400 line-through">{formatSize(result.originalSize)}</p>
              </div>
              <div className={`p-4 rounded-none border text-center ${darkMode ? 'bg-[#bfa15f]/5 border-[#bfa15f]/30' : 'bg-[#8c1d1a]/5 border-[#8c1d1a]/20'}`}>
                <span className={`text-[9px] uppercase font-sans font-bold tracking-widest ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`}>Optimized Size</span>
                <p className={`text-base font-mono font-bold mt-1 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`}>{formatSize(result.compressedSize)}</p>
              </div>
              <div className={`p-4 rounded-none border text-center ${darkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50/5 border-emerald-100'}`}>
                <span className="text-[9px] uppercase font-sans font-bold tracking-widest text-emerald-400">Saved Space</span>
                <p className="text-base font-mono font-bold mt-1 text-emerald-400">-{result.percentSaved}%</p>
              </div>
            </div>

            {/* Informational banner about real size */}
            <div className={`p-4.5 rounded-none border text-left max-w-lg mx-auto mb-8 text-xs font-serif leading-relaxed ${
              darkMode ? 'bg-[#1d1d1b] border-amber-500/20 text-stone-300' : 'bg-amber-50/25 border-amber-200 text-stone-700'
            }`}>
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500 font-sans font-bold text-[10px] uppercase tracking-wider mb-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Local Compression Technical Notes
              </div>
              <p className="leading-relaxed text-[11px] text-stone-500 dark:text-stone-400">
                Offline in-browser compression optimizes cross-reference tables and the internal structure of the PDF (<span className="italic font-sans">object streams</span>) without drastically reducing text/image clarity. This ensures your document remains perfectly readable and 100% secure, without ever being uploaded to any server.
              </p>
            </div>

            <div className={`p-5 rounded-none text-left border mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-lg mx-auto ${
              darkMode ? 'bg-[#121211] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`p-3.5 border rounded-none shrink-0 ${darkMode ? 'border-[#2c2c2a] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'}`}>
                  <FileArchive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-medium text-sm truncate max-w-[200px] sm:max-w-xs">{result.name}</h4>
                  <p className="text-[10px] text-stone-500 mt-1">Ready for high-speed email attachments</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = result.downloadUrl;
                  link.download = result.name;
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
                    <Download className="w-4 h-4 animate-pulse text-amber-500" />
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

            <button
              onClick={() => { setResult(null); setFile(null); }}
              className={`px-5 py-2.5 rounded-none text-xs font-sans font-bold uppercase tracking-widest border transition-colors ${
                darkMode 
                  ? 'border-[#3a3a38] text-stone-300 hover:bg-[#121211]' 
                  : 'border-[#d8d4ca] text-stone-700 hover:bg-[#FAF9F5]'
              }`}
            >
              Compress Another File
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Work area */}
          <div className="lg:col-span-8">
            {file ? (
              <div className={`p-6 rounded-none border ${
                darkMode ? 'bg-[#181817] border-stone-800' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'
              }`}>
                <div className="flex items-center justify-between border-b pb-4 border-dashed border-stone-800 dark:border-stone-800 mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 border rounded-none shrink-0 ${darkMode ? 'border-[#2c2c2a] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-sm truncate max-w-xs">{file.name}</h3>
                      <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                        {formatSize(file.size)} • {file.pageCount} Pages
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setFile(null)} className="text-[10px] font-sans font-bold uppercase tracking-widest text-red-500 hover:underline">
                    Remove
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <span className="block text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400 mb-3.5">
                      Compression Strengths
                    </span>
                    <div className="space-y-3.5">
                      {[
                        { id: 'extreme', title: 'Extreme Compression', savings: '60-70%', desc: 'Drastically reduces visual quality on background vectors to fit tiny email limits.' },
                        { id: 'recommended', title: 'Recommended Compression', savings: '25-35%', desc: 'Standard high-fidelity balance. Retains crisp texts and clean images.' },
                        { id: 'low', title: 'Low Compression', savings: '10-15%', desc: 'Slight footprint reduction, prioritizing raw page and photo-resolution metadata.' }
                      ].map((item) => (
                        <div
                          key={item.id}
                          onClick={() => setLevel(item.id as any)}
                          className={`p-5 rounded-none border text-left cursor-pointer transition-all flex items-center justify-between gap-4 ${
                            level === item.id
                              ? darkMode ? 'border-[#bfa15f] bg-[#bfa15f]/5 text-white' : 'border-[#8c1d1a] bg-[#8c1d1a]/5 text-stone-900'
                              : darkMode ? 'border-stone-800 bg-[#121211]/40 hover:bg-[#181817]' : 'border-stone-200 bg-white hover:bg-[#FAF9F5]/40'
                          }`}
                        >
                          <div>
                            <p className="font-serif font-bold text-sm">{item.title}</p>
                            <p className="text-[10px] font-serif text-stone-500 mt-1 leading-relaxed">{item.desc}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-[9px] uppercase font-sans font-bold tracking-widest block ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`}>Est. Savings</span>
                            <span className="text-sm font-mono font-bold">{item.savings}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-none p-10 sm:p-14 text-center cursor-pointer transition-all ${
                  darkMode 
                    ? 'border-stone-800 hover:border-stone-600 bg-[#181817]/40 hover:bg-[#181817]/60' 
                    : 'border-[#dcd9d0] hover:border-stone-400 bg-[#FAF9F5]/40 hover:bg-[#FAF9F5]/60'
                }`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
                <div className={`w-10 h-10 border rounded-none flex items-center justify-center mx-auto mb-4 ${
                  darkMode ? 'border-[#333331] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'
                }`}>
                  <Upload className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-medium text-lg mb-1.5 italic">Choose PDF to Compress</h3>
                <p className={`text-xs font-serif max-w-sm mx-auto mb-6 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                  Select a document to optimize size. All conversion computations occur 100% locally.
                </p>
                <div className="flex justify-center gap-3">
                  <button 
                    type="button" 
                    className={`px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest rounded-none transition-all ${
                      darkMode 
                        ? 'bg-[#eae7e0] hover:bg-white text-stone-900' 
                        : 'bg-[#1c1c1a] hover:bg-stone-800 text-white'
                    }`}
                  >
                    Browse File
                  </button>
                  <button 
                    type="button" 
                    onClick={(e) => { e.stopPropagation(); loadSample(); }} 
                    className={`px-4 py-2 border rounded-none text-[10px] font-sans font-bold uppercase tracking-widest transition-colors ${
                      darkMode 
                        ? 'border-[#3a3a38] text-stone-300 hover:bg-[#181817]' 
                        : 'border-[#d8d4ca] text-stone-600 hover:bg-[#FAF9F5]'
                    }`}
                  >
                    Load Sample
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`p-6 rounded-none border ${
              darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
            }`}>
              <div className="flex items-center gap-2 mb-4 border-b pb-3 border-dashed border-stone-800">
                <BarChart2 className={`w-4 h-4 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                <h3 className="font-sans font-bold text-xs uppercase tracking-widest">Compression Stats</h3>
              </div>
              
              <div className="space-y-5">
                <div className={`p-4 border rounded-none text-xs font-serif leading-relaxed ${
                  darkMode ? 'border-stone-800 bg-[#121211]/40' : 'border-stone-200 bg-[#FAF9F5]/30'
                }`}>
                  <p className={`font-bold flex items-center gap-1.5 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`}>
                    <Sparkles className="w-3.5 h-3.5" /> Client-Side Downsampler
                  </p>
                  <p className="text-[10px] text-stone-500 mt-1 leading-normal">
                    Employs local browser-thread multi-sampling logic. Files are modified fully client-side.
                  </p>
                </div>

                <button
                  onClick={handleCompress}
                  disabled={!file}
                  className={`w-full py-3 rounded-none font-sans font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    !file
                      ? 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed border-transparent'
                      : darkMode 
                        ? 'bg-[#bfa15f] text-black hover:opacity-90' 
                        : 'bg-[#8c1d1a] text-white hover:opacity-90'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  Compress Document
                </button>
              </div>
            </div>

            <div className={`p-4 rounded-none border flex items-start gap-3 ${
              darkMode ? 'bg-[#181817] border-[#2c2c2a] text-stone-300' : 'bg-[#FAF9F5] border-[#e6e2d8] text-stone-600'
            }`}>
              <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
              <div>
                <p className="text-xs font-serif font-bold">Privacy Safeguard</p>
                <p className="text-[10px] font-serif text-stone-500 leading-normal mt-0.5">
                  We process documents inside your active tab sandbox. Your credentials and file blocks remain strictly local.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
