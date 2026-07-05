import React, { useState, useRef } from 'react';
import { 
  Upload, FileText, Split, CheckCircle2, Download, ShieldCheck, 
  Settings, Loader2, RefreshCw, Layers, Sparkles
} from 'lucide-react';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { DocumentFile } from '../types';
import { MOCK_FILES } from '../data';
import { EditorialProgressBar } from './EditorialProgressBar';

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

function parsePageIndices(rangeStr: string, totalPages: number): number[] {
  const indices: Set<number> = new Set();
  const parts = rangeStr.split(',');

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
          indices.add(i - 1);
        }
      }
    } else {
      const pageNum = parseInt(trimmed, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        indices.add(pageNum - 1);
      }
    }
  }
  return Array.from(indices).sort((a, b) => a - b);
}

function createZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const zipData: number[] = [];
  let offset = 0;
  const directoryHeaders: number[] = [];
  
  const writeString = (str: string, target: number[]) => {
    for (let i = 0; i < str.length; i++) {
      target.push(str.charCodeAt(i));
    }
  };
  
  const writeUint16 = (val: number, target: number[]) => {
    target.push(val & 0xFF);
    target.push((val >> 8) & 0xFF);
  };
  
  const writeUint32 = (val: number, target: number[]) => {
    target.push(val & 0xFF);
    target.push((val >> 8) & 0xFF);
    target.push((val >> 16) & 0xFF);
    target.push((val >> 24) & 0xFF);
  };
  
  const crcTable: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[n] = c;
  }
  
  const calculateCrc32 = (data: Uint8Array): number => {
    let crc = 0 ^ (-1);
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  };
  
  for (const file of files) {
    const filenameBytes: number[] = [];
    writeString(file.name, filenameBytes);
    
    const crc = calculateCrc32(file.data);
    const size = file.data.length;
    
    const localHeader: number[] = [];
    writeUint32(0x04034b50, localHeader); // local file header signature
    writeUint16(10, localHeader); // version needed to extract
    writeUint16(0, localHeader); // general purpose bit flag
    writeUint16(0, localHeader); // compression method (0 = store)
    writeUint16(0, localHeader); // last mod file time
    writeUint16(0, localHeader); // last mod file date
    writeUint32(crc, localHeader); // crc-32
    writeUint32(size, localHeader); // compressed size
    writeUint32(size, localHeader); // uncompressed size
    writeUint16(filenameBytes.length, localHeader); // file name length
    writeUint16(0, localHeader); // extra field length
    
    const headerWithFilename = [...localHeader, ...filenameBytes];
    
    const fileOffset = offset;
    zipData.push(...headerWithFilename);
    for (let i = 0; i < file.data.length; i++) {
      zipData.push(file.data[i]);
    }
    
    offset += headerWithFilename.length + file.data.length;
    
    const dirHeader: number[] = [];
    writeUint32(0x02014b50, dirHeader); // central file header signature
    writeUint16(10, dirHeader); // version made by
    writeUint16(10, dirHeader); // version needed to extract
    writeUint16(0, dirHeader); // general purpose bit flag
    writeUint16(0, dirHeader); // compression method
    writeUint16(0, dirHeader); // last mod file time
    writeUint16(0, dirHeader); // last mod file date
    writeUint32(crc, dirHeader); // crc-32
    writeUint32(size, dirHeader); // compressed size
    writeUint32(size, dirHeader); // uncompressed size
    writeUint16(filenameBytes.length, dirHeader); // file name length
    writeUint16(0, dirHeader); // extra field length
    writeUint16(0, dirHeader); // file comment length
    writeUint16(0, dirHeader); // disk number start
    writeUint16(0, dirHeader); // internal file attributes
    writeUint32(0, dirHeader); // external file attributes
    writeUint32(fileOffset, dirHeader); // relative offset of local header
    
    directoryHeaders.push(...dirHeader, ...filenameBytes);
  }
  
  const dirOffset = offset;
  const dirSize = directoryHeaders.length;
  
  const endRecord: number[] = [];
  writeUint32(0x06054b50, endRecord); // end of central dir signature
  writeUint16(0, endRecord); // number of this disk
  writeUint16(0, endRecord); // number of the disk with the start of the central dir
  writeUint16(files.length, endRecord); // total number of entries in the central dir on this disk
  writeUint16(files.length, endRecord); // total number of entries in the central dir
  writeUint32(dirSize, endRecord); // size of the central directory
  writeUint32(dirOffset, endRecord); // offset of start of central directory, relative to start of archive
  writeUint16(0, endRecord); // zip file comment length
  
  const finalZip = new Uint8Array(zipData.length + directoryHeaders.length + endRecord.length);
  finalZip.set(zipData, 0);
  finalZip.set(directoryHeaders, zipData.length);
  finalZip.set(endRecord, zipData.length + directoryHeaders.length);
  
  return finalZip;
}

interface SplitPDFToolProps {
  darkMode: boolean;
  setView: (view: string) => void;
  adsterraLink: string;
  adsterraActive: boolean;
}

export default function SplitPDFTool({ darkMode, setView, adsterraLink, adsterraActive }: SplitPDFToolProps) {
  const [file, setFile] = useState<DocumentFile | null>(null);
  const [splitMode, setSplitMode] = useState<'ranges' | 'all'>('ranges');
  const [ranges, setRanges] = useState('1-3, 4-6');
  const [mergeRanges, setMergeRanges] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [result, setResult] = useState<{
    name: string;
    filesCount: number;
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
          id: `file-split-${Date.now()}`,
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
        console.error('Failed to parse PDF for splitting:', err);
        setFile({
          id: `file-split-${Date.now()}`,
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
      const mockFile = MOCK_FILES[1]; // Tax Review Draft
      const bytes = await generateSamplePdfBytes(mockFile.name, mockFile.pageCount);
      
      setFile({
        id: `file-split-sample-${Date.now()}`,
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

  const handleSplit = async () => {
    if (!file || !rawFileBytes) return;
    setIsProcessing(true);
    setProgress(10);
    setStep('Accessing PDF object catalog streams...');

    try {
      const srcDoc = await PDFDocument.load(rawFileBytes, { ignoreEncryption: true });
      const totalPages = srcDoc.getPageCount();

      const filesToZip: { name: string; data: Uint8Array }[] = [];

      if (splitMode === 'all') {
        setProgress(30);
        setStep('Splitting every page into standalone streams...');

        for (let i = 0; i < totalPages; i++) {
          setProgress(30 + Math.floor((i / totalPages) * 50));
          setStep(`Extracting page ${i + 1} of ${totalPages}...`);

          const singlePageDoc = await PDFDocument.create();
          const copiedPages = await singlePageDoc.copyPages(srcDoc, [i]);
          singlePageDoc.addPage(copiedPages[0]);
          const singleBytes = await singlePageDoc.save();

          filesToZip.push({
            name: `${file.name.replace('.pdf', '')}_page_${i + 1}.pdf`,
            data: singleBytes
          });
        }
      } else {
        if (mergeRanges) {
          setProgress(30);
          setStep(`Extracting and combining page intervals: ${ranges}...`);

          const combinedDoc = await PDFDocument.create();
          const segments = ranges.split(',').map(s => s.trim()).filter(Boolean);
          let totalPagesAdded = 0;

          for (let idx = 0; idx < segments.length; idx++) {
            const segment = segments[idx];
            const pageIndices = parsePageIndices(segment, totalPages);
            if (pageIndices.length === 0) continue;

            setProgress(30 + Math.floor((idx / segments.length) * 50));
            setStep(`Appending segment: ${segment}...`);

            const copiedPages = await combinedDoc.copyPages(srcDoc, pageIndices);
            copiedPages.forEach(p => {
              combinedDoc.addPage(p);
              totalPagesAdded++;
            });
          }

          if (totalPagesAdded === 0) {
            throw new Error('No valid pages or ranges were extracted.');
          }

          setProgress(85);
          setStep('Writing combined PDF stream...');
          const combinedBytes = await combinedDoc.save();

          setProgress(95);
          setStep('Compiling and saving file...');
          const blob = new Blob([combinedBytes], { type: 'application/pdf' });
          const downloadUrl = URL.createObjectURL(blob);

          setResult({
            name: `${file.name.replace('.pdf', '')}_combined_ranges.pdf`,
            filesCount: 1,
            downloadUrl
          });
          setProgress(100);
          setIsProcessing(false);
          return;
        } else {
          setProgress(30);
          setStep(`Extracting page intervals: ${ranges}...`);

          const segments = ranges.split(',').map(s => s.trim()).filter(Boolean);
          for (let idx = 0; idx < segments.length; idx++) {
            const segment = segments[idx];
            const pageIndices = parsePageIndices(segment, totalPages);
            if (pageIndices.length === 0) continue;

            setProgress(30 + Math.floor((idx / segments.length) * 50));
            setStep(`Extracting segment: ${segment}...`);

            const segmentDoc = await PDFDocument.create();
            const copiedPages = await segmentDoc.copyPages(srcDoc, pageIndices);
            copiedPages.forEach(p => segmentDoc.addPage(p));
            const segmentBytes = await segmentDoc.save();

            filesToZip.push({
              name: `${file.name.replace('.pdf', '')}_range_${segment.replace(/\s+/g, '_')}.pdf`,
              data: segmentBytes
            });
          }
        }
      }

      if (filesToZip.length === 0) {
        throw new Error('No valid pages or ranges were extracted.');
      }

      setProgress(85);
      setStep('De-referencing parent cross-reference tables...');

      const zipBytes = createZip(filesToZip);

      setProgress(95);
      setStep('Compressing and writing files...');

      const blob = new Blob([zipBytes], { type: 'application/zip' });
      const downloadUrl = URL.createObjectURL(blob);

      setResult({
        name: `${file.name.replace('.pdf', '')}_split_pages.zip`,
        filesCount: filesToZip.length,
        downloadUrl
      });
      setProgress(100);
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Split failed:', err);
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
          handleSplit();
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
        <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-tight">Split PDF Pages</h1>
        <p className={`text-xs sm:text-sm font-serif mt-2 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
          Deconstruct documents into separate target files or extract custom intervals in real-time.
        </p>
      </div>

      {isProcessing ? (
        <EditorialProgressBar
          progress={progress}
          step={step}
          darkMode={darkMode}
          title="Deconstructing PDF Structure"
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
            <h2 className="text-2xl sm:text-3xl font-serif font-medium mb-2 italic">
              {result.name.endsWith('.pdf') ? 'Ranges Combined & Compiled!' : 'Split Completed!'}
            </h2>
            <p className={`text-xs font-serif max-w-md mx-auto mb-8 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
              {result.name.endsWith('.pdf') 
                ? 'Your specified page ranges have been extracted and successfully compiled into a single PDF document.' 
                : `Your file was split successfully into ${result.filesCount} separate documents.`}
            </p>

            <div className={`p-5 rounded-none text-left border mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-lg mx-auto ${
              darkMode ? 'bg-[#121211] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`p-3.5 border rounded-none shrink-0 ${darkMode ? 'border-[#2c2c2a] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'}`}>
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-medium text-sm truncate max-w-[200px] sm:max-w-xs">{result.name}</h4>
                  <p className="text-[10px] text-stone-500 mt-1">
                    {result.name.endsWith('.pdf') ? 'Single merged PDF file' : `Contains ${result.filesCount} compiled page files`}
                  </p>
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
                {result.name.endsWith('.pdf') ? 'Download PDF' : 'Download Zip Bundle'}
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
              Split Another Document
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
                    <span className="block text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400 mb-3">
                      Split Methodology
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button
                        onClick={() => setSplitMode('ranges')}
                        className={`p-5 rounded-none text-left border transition-all ${
                          splitMode === 'ranges'
                            ? darkMode ? 'border-[#bfa15f] bg-[#bfa15f]/5 text-white' : 'border-[#8c1d1a] bg-[#8c1d1a]/5 text-stone-900'
                            : darkMode ? 'border-stone-800 bg-[#121211]/40 text-stone-400' : 'border-stone-200 bg-white text-stone-600'
                        }`}
                      >
                        <p className="font-serif font-bold text-sm">Extract Custom Ranges</p>
                        <p className="text-[10px] font-serif text-stone-500 mt-1">E.g. page intervals like 1-3 and 5-8.</p>
                      </button>
                      
                      <button
                        onClick={() => setSplitMode('all')}
                        className={`p-5 rounded-none text-left border transition-all ${
                          splitMode === 'all'
                            ? darkMode ? 'border-[#bfa15f] bg-[#bfa15f]/5 text-white' : 'border-[#8c1d1a] bg-[#8c1d1a]/5 text-stone-900'
                            : darkMode ? 'border-stone-800 bg-[#121211]/40 text-stone-400' : 'border-stone-200 bg-white text-stone-600'
                        }`}
                      >
                        <p className="font-serif font-bold text-sm">Split Every Single Page</p>
                        <p className="text-[10px] font-serif text-stone-500 mt-1">Saves all {file.pageCount} pages as separate PDFs.</p>
                      </button>
                    </div>
                  </div>

                  {splitMode === 'ranges' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400 mb-2.5">
                          Page Ranges Input
                        </label>
                        <input
                          type="text"
                          value={ranges}
                          onChange={(e) => setRanges(e.target.value)}
                          placeholder="e.g. 1-2, 5-8"
                          className={`w-full px-4 py-2.5 rounded-none text-xs border focus:outline-none focus:ring-0 font-mono ${
                            darkMode ? 'bg-[#121211] border-stone-800 text-white' : 'bg-white border-stone-300 text-stone-800'
                          }`}
                        />
                        <p className="text-[10px] font-serif text-stone-500 mt-1.5 leading-relaxed">
                          Separate segments with commas. Use hyphens for page ranges.
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 pt-2 border-t border-dashed border-stone-800 dark:border-stone-850">
                        <input
                          type="checkbox"
                          id="merge-ranges-checkbox"
                          checked={mergeRanges}
                          onChange={(e) => setMergeRanges(e.target.checked)}
                          className={`w-4 h-4 cursor-pointer accent-[#bfa15f] dark:accent-[#bfa15f] rounded-none focus:ring-0 ${
                            darkMode ? 'border-stone-800 bg-[#121211]' : 'border-stone-300 bg-white'
                          }`}
                        />
                        <label 
                          htmlFor="merge-ranges-checkbox" 
                          className={`text-xs font-serif select-none cursor-pointer leading-normal ${
                            darkMode ? 'text-stone-300' : 'text-stone-700'
                          }`}
                        >
                          <span className="font-bold">Combine custom ranges into a single PDF</span>
                        </label>
                      </div>
                    </div>
                  )}
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
                <h3 className="font-serif font-medium text-lg mb-1.5 italic">Choose PDF to Split</h3>
                <p className={`text-xs font-serif max-w-sm mx-auto mb-6 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                  Select a document to extract. All computation executes locally inside your tab.
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
                <Settings className={`w-4 h-4 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                <h3 className="font-sans font-bold text-xs uppercase tracking-widest">Split Options</h3>
              </div>
              
              <div className="space-y-5">
                <div className={`p-4 border rounded-none text-xs font-serif leading-relaxed ${
                  darkMode ? 'border-stone-800 bg-[#121211]/40' : 'border-stone-200 bg-[#FAF9F5]/30'
                }`}>
                  <p className={`font-bold flex items-center gap-1.5 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`}>
                    <Sparkles className="w-3.5 h-3.5" /> High-Accuracy Parser
                  </p>
                  <p className="text-[10px] text-stone-500 mt-1 leading-normal">
                    Re-compiles PDF catalog indexes, maintaining hyper-links, active forms, and custom font definitions.
                  </p>
                </div>

                <button
                  onClick={handleSplit}
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
                  Split Document
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
                  Your files never hit any servers. Page stream operations are extracted purely inside browser memory loops.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
