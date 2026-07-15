import React, { useState, useRef } from 'react';
import { PDFDocument, degrees, StandardFonts } from 'pdf-lib';
import { 
  FileText, Upload, RefreshCw, RotateCw, RotateCcw, ShieldCheck, 
  Download, ArrowLeft, Grid, Check, HelpCircle, FileDown, Layers
} from 'lucide-react';
import { DocumentFile } from '../types';
import { EditorialProgressBar } from './EditorialProgressBar';
import { SaaSDB } from '../lib/saasDb';

interface RotatePDFToolProps {
  darkMode: boolean;
  setView: (view: string) => void;
}

export default function RotatePDFTool({ darkMode, setView }: RotatePDFToolProps) {
  const [file, setFile] = useState<DocumentFile | null>(null);
  const [pageRotations, setPageRotations] = useState<Record<number, number>>({}); // page index (0-based) -> rotation (0, 90, 180, 270)
  const [rawFileBytes, setRawFileBytes] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; downloadUrl: string; size: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const generateSamplePdf = async (): Promise<Uint8Array> => {
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const colors = [
      { bg: [245, 243, 237], text: [140, 29, 26] }, // Warm off-white & Crimson
      { bg: [26, 26, 25], text: [191, 161, 95] },  // Black & Gold
      { bg: [240, 240, 240], text: [40, 40, 40] }   // Neutral gray
    ];

    for (let i = 1; i <= 3; i++) {
      const page = pdfDoc.addPage([595.275, 841.89]); // A4 Size in points
      
      // Draw background
      const colorSet = colors[(i - 1) % colors.length];
      page.drawRectangle({
        x: 0,
        y: 0,
        width: 595.275,
        height: 841.89,
        color: {
          type: 'RGB' as any,
          red: colorSet.bg[0] / 255,
          green: colorSet.bg[1] / 255,
          blue: colorSet.bg[2] / 255
        } as any
      });

      // Draw header
      page.drawText('UTILDOC EDITORIAL PRESS', {
        x: 50,
        y: 780,
        size: 10,
        font: helveticaFont,
        color: {
          type: 'RGB' as any,
          red: 0.5,
          green: 0.5,
          blue: 0.5
        } as any
      });

      // Page Title
      page.drawText(`SAMPLE DOCUMENT DRAFT - PAGE 0${i}`, {
        x: 50,
        y: 500,
        size: 20,
        font: helveticaBold,
        color: {
          type: 'RGB' as any,
          red: colorSet.text[0] / 255,
          green: colorSet.text[1] / 255,
          blue: colorSet.text[2] / 255
        } as any
      });

      // Core info
      page.drawText('This document has been compiled dynamically in your browser session memory.', {
        x: 50,
        y: 460,
        size: 12,
        font: helveticaFont,
        color: {
          type: 'RGB' as any,
          red: 0.3,
          green: 0.3,
          blue: 0.3
        } as any
      });

      page.drawText('To test rotation, set individual page angles in the control board.', {
        x: 50,
        y: 435,
        size: 11,
        font: helveticaFont,
        color: {
          type: 'RGB' as any,
          red: 0.4,
          green: 0.4,
          blue: 0.4
        } as any
      });

      // Footer
      page.drawText('ESTABLISHED LOCAL ENGINE SECURE BUFFER', {
        x: 50,
        y: 60,
        size: 8,
        font: helveticaFont,
        color: {
          type: 'RGB' as any,
          red: 0.6,
          green: 0.6,
          blue: 0.6
        } as any
      });
    }

    return await pdfDoc.save();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setErrorMsg(null);
      setIsProcessing(true);
      setProgress(15);
      setStep('Loading PDF stream buffer...');
      
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        setProgress(40);
        setStep('Evaluating document structures...');

        const pdfDoc = await PDFDocument.load(arrayBuffer, { 
          updateMetadata: false, 
          ignoreEncryption: true 
        });

        const pageCount = pdfDoc.getPageCount();
        setProgress(85);
        setStep('Indexing individual page streams...');

        setFile({
          id: `file-rotate-${Date.now()}`,
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          pageCount,
          uploadedAt: new Date(),
          status: 'queued',
          progress: 0
        });

        setRawFileBytes(new Uint8Array(arrayBuffer));
        
        // Load initial rotations from PDF if they exist
        const rotations: Record<number, number> = {};
        const pages = pdfDoc.getPages();
        for (let i = 0; i < pages.length; i++) {
          rotations[i] = pages[i].getRotation().angle;
        }
        setPageRotations(rotations);
        
        setProgress(100);
        setStep('Document initialized.');
        setIsProcessing(false);
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Failed to parse this PDF document. It may be encrypted, password protected, or corrupt.');
        setIsProcessing(false);
      }
    } else if (selectedFile) {
      setErrorMsg('Please select a valid PDF file.');
    }
  };

  const loadSample = async () => {
    setErrorMsg(null);
    setIsProcessing(true);
    setProgress(15);
    setStep('Compiling in-memory editorial PDF sample...');

    try {
      const bytes = await generateSamplePdf();
      setProgress(60);
      setStep('Hydrating sample page elements...');

      setFile({
        id: `file-rotate-sample-${Date.now()}`,
        name: 'UtilDoc_Editorial_Sample.pdf',
        size: bytes.byteLength,
        type: 'application/pdf',
        pageCount: 3,
        uploadedAt: new Date(),
        status: 'queued',
        progress: 0
      });

      setRawFileBytes(bytes);
      setPageRotations({ 0: 0, 1: 0, 2: 0 });
      
      setProgress(100);
      setStep('Sample hydrated.');
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      setErrorMsg('Could not assemble sample PDF.');
      setIsProcessing(false);
    }
  };

  const rotatePage = (pageIdx: number, direction: 'cw' | 'ccw') => {
    const currentAngle = pageRotations[pageIdx] || 0;
    let newAngle = currentAngle;
    if (direction === 'cw') {
      newAngle = (currentAngle + 90) % 360;
    } else {
      newAngle = (currentAngle - 90 + 360) % 360;
    }
    setPageRotations(prev => ({
      ...prev,
      [pageIdx]: newAngle
    }));
  };

  const setAllRotations = (angle: number) => {
    if (!file) return;
    const newRotations: Record<number, number> = {};
    for (let i = 0; i < file.pageCount; i++) {
      newRotations[i] = angle;
    }
    setPageRotations(newRotations);
  };

  const rotateOddPages = () => {
    if (!file) return;
    const newRotations = { ...pageRotations };
    for (let i = 0; i < file.pageCount; i++) {
      if ((i + 1) % 2 !== 0) { // Odd pages (Page 1, 3, 5...)
        newRotations[i] = ( (newRotations[i] || 0) + 90 ) % 360;
      }
    }
    setPageRotations(newRotations);
  };

  const rotateEvenPages = () => {
    if (!file) return;
    const newRotations = { ...pageRotations };
    for (let i = 0; i < file.pageCount; i++) {
      if ((i + 1) % 2 === 0) { // Even pages (Page 2, 4, 6...)
        newRotations[i] = ( (newRotations[i] || 0) + 90 ) % 360;
      }
    }
    setPageRotations(newRotations);
  };

  const resetAllRotations = () => {
    if (!file) return;
    const newRotations: Record<number, number> = {};
    for (let i = 0; i < file.pageCount; i++) {
      newRotations[i] = 0;
    }
    setPageRotations(newRotations);
  };

  const applyRotations = async () => {
    if (!file || !rawFileBytes) return;

    setIsProcessing(true);
    setProgress(10);
    setStep('Re-assembling document byte streams...');

    try {
      const pdfDoc = await PDFDocument.load(rawFileBytes);
      setProgress(40);
      setStep('Applying page rotation instructions...');

      const pages = pdfDoc.getPages();
      for (let i = 0; i < pages.length; i++) {
        const angle = pageRotations[i] || 0;
        pages[i].setRotation(degrees(angle));
      }

      setProgress(75);
      setStep('Saving rotated document structure...');

      const modifiedBytes = await pdfDoc.save();
      const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);

      setTimeout(() => {
        SaaSDB.logActivity('ROTATE_PDF');
        setResult({
          name: file.name.replace('.pdf', '_rotated.pdf'),
          downloadUrl,
          size: modifiedBytes.byteLength
        });
        setIsProcessing(false);
      }, 600);

    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to write rotation properties back to document structure.');
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
          applyRotations();
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
        <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-tight">Rotate PDF Pages</h1>
        <p className={`text-xs sm:text-sm font-serif mt-2 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
          Rotate specific PDF pages individually or in batches by 90, 180, or 270 degrees with direct local buffer output.
        </p>
      </div>

      {errorMsg && (
        <div className={`max-w-xl mx-auto mb-8 p-5 border text-xs leading-relaxed flex items-start gap-3.5 ${
          darkMode ? 'bg-red-500/5 border-red-500/25 text-red-300' : 'bg-red-50/50 border-red-200 text-red-800'
        }`}>
          <RotateCcw className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-sans font-bold uppercase tracking-wider mb-1">Rotation Failure</p>
            <p className="font-serif">{errorMsg}</p>
          </div>
        </div>
      )}

      {isProcessing ? (
        <EditorialProgressBar
          progress={progress}
          step={step}
          darkMode={darkMode}
          title="Processing Page Rotations"
        />
      ) : result ? (
        /* Success result window */
        <div className="max-w-2xl mx-auto">
          <div className={`p-10 rounded-none border text-center transition-all ${
            darkMode ? 'bg-[#181817] border-stone-800' : 'bg-[#FAF9F5] border-[#e6e2d8]'
          }`}>
            <div className={`w-12 h-12 border rounded-none flex items-center justify-center mx-auto mb-6 ${
              darkMode ? 'border-[#333331] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'
            }`}>
              <Check className="w-5 h-5" />
            </div>

            <h3 className="font-serif font-medium text-2xl mb-2 italic">Compilation Completed</h3>
            <p className={`text-xs font-serif mb-8 max-w-md mx-auto ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              Rotations successfully applied to document catalog streams. Output file is fully initialized.
            </p>

            <div className={`p-5 mb-8 rounded-none border text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              darkMode ? 'bg-[#121211] border-stone-800' : 'bg-white border-[#e6e2d8]'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 border rounded-none shrink-0 ${darkMode ? 'border-[#2c2c2a] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'}`}>
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-sm truncate max-w-[200px] sm:max-w-xs">{result.name}</h4>
                  <p className="text-[10px] text-stone-500 font-mono mt-1">{formatSize(result.size)} • PDF Document</p>
                </div>
              </div>

              <a
                href={result.downloadUrl}
                download={result.name}
                className={`px-5 py-2.5 rounded-none font-sans font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 w-full sm:w-auto justify-center ${
                  darkMode 
                    ? 'bg-[#bfa15f] text-black hover:opacity-90' 
                    : 'bg-[#8c1d1a] text-white hover:opacity-90'
                }`}
              >
                <Download className="w-4 h-4" />
                Download Document
              </a>
            </div>

            <button
              onClick={() => { setResult(null); setFile(null); setPageRotations({}); }}
              className={`px-5 py-2.5 rounded-none text-xs font-sans font-bold uppercase tracking-widest border transition-colors ${
                darkMode 
                  ? 'border-stone-800 text-stone-300 hover:bg-[#121211]' 
                  : 'border-stone-200 text-stone-700 hover:bg-[#FAF9F5]'
              }`}
            >
              Rotate Another Document
            </button>
          </div>
        </div>
      ) : file ? (
        /* Document workspace */
        <div className="space-y-8">
          
          {/* Global batch rotation controls */}
          <div className={`p-6 rounded-none border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 ${
            darkMode ? 'bg-[#181817] border-stone-800' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'
          }`}>
            <div>
              <h3 className="font-serif font-bold text-base">Batch Page Operations</h3>
              <p className={`text-[11px] font-serif mt-1 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                Apply collective rotation configurations to multiple document nodes concurrently.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setAllRotations(90)}
                className={`px-3.5 py-2 rounded-none text-[9px] font-sans font-bold uppercase tracking-widest border transition-colors flex items-center gap-1.5 ${
                  darkMode ? 'border-stone-800 hover:border-stone-600 text-stone-300' : 'border-stone-200 hover:border-stone-400 text-stone-700'
                }`}
              >
                <RotateCw className="w-3 h-3" /> All +90°
              </button>
              <button
                onClick={() => setAllRotations(180)}
                className={`px-3.5 py-2 rounded-none text-[9px] font-sans font-bold uppercase tracking-widest border transition-colors flex items-center gap-1.5 ${
                  darkMode ? 'border-stone-800 hover:border-stone-600 text-stone-300' : 'border-stone-200 hover:border-stone-400 text-stone-700'
                }`}
              >
                <RefreshCw className="w-3 h-3" /> All 180°
              </button>
              <button
                onClick={rotateOddPages}
                className={`px-3.5 py-2 rounded-none text-[9px] font-sans font-bold uppercase tracking-widest border transition-colors flex items-center gap-1.5 ${
                  darkMode ? 'border-stone-800 hover:border-stone-600 text-stone-300' : 'border-stone-200 hover:border-stone-400 text-stone-700'
                }`}
              >
                <RotateCw className="w-3 h-3" /> Rotate Odd Pages
              </button>
              <button
                onClick={rotateEvenPages}
                className={`px-3.5 py-2 rounded-none text-[9px] font-sans font-bold uppercase tracking-widest border transition-colors flex items-center gap-1.5 ${
                  darkMode ? 'border-stone-800 hover:border-stone-600 text-stone-300' : 'border-stone-200 hover:border-stone-400 text-stone-700'
                }`}
              >
                <RotateCw className="w-3 h-3" /> Rotate Even Pages
              </button>
              <button
                onClick={resetAllRotations}
                className="px-3.5 py-2 rounded-none text-[9px] font-sans font-bold uppercase tracking-widest bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
              >
                Reset All
              </button>
            </div>
          </div>

          {/* Grid layout of all pages */}
          <div>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-dashed border-stone-800 dark:border-stone-800/60">
              <span className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400">
                <Grid className="w-3.5 h-3.5" />
                Document Pages Grid Index ({file.pageCount} Pages)
              </span>
              <button
                onClick={() => { setFile(null); setPageRotations({}); }}
                className="text-[10px] font-sans font-bold uppercase tracking-widest text-red-500 hover:underline"
              >
                Close File
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {Array.from({ length: file.pageCount }).map((_, index) => {
                const rotation = pageRotations[index] || 0;
                return (
                  <div 
                    key={index} 
                    className={`p-4 border transition-colors flex flex-col items-center relative ${
                      darkMode ? 'bg-[#141413] border-stone-800 hover:border-stone-600' : 'bg-white border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    {/* Visual representation of page with CSS Rotation */}
                    <div className="h-40 w-full flex items-center justify-center bg-stone-100 dark:bg-stone-900/60 p-4 border border-dashed border-stone-300 dark:border-stone-800 overflow-hidden relative mb-4">
                      
                      {/* Grid overlay */}
                      <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-[0.03] pointer-events-none">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div key={i} className="border border-stone-500" />
                        ))}
                      </div>

                      {/* Dynamic rotated page simulation */}
                      <div 
                        className={`w-24 h-32 border flex flex-col justify-between p-2.5 bg-white dark:bg-[#121211] shadow-md transition-transform duration-300 origin-center`}
                        style={{ transform: `rotate(${rotation}deg)` }}
                      >
                        <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-1">
                          <span className="text-[6px] font-mono text-stone-400">UTILDOC</span>
                          <span className="text-[6px] font-serif italic text-stone-400">P. {index + 1}</span>
                        </div>
                        
                        <div className="space-y-1 my-auto">
                          <div className="h-1 w-full bg-stone-100 dark:bg-stone-800" />
                          <div className="h-1 w-5/6 bg-stone-100 dark:bg-stone-800" />
                          <div className="h-1 w-4/5 bg-stone-100 dark:bg-stone-800" />
                        </div>

                        <div className="text-center font-mono text-[8px] text-stone-400 border-t border-stone-100 dark:border-stone-800 pt-1">
                          {rotation}°
                        </div>
                      </div>

                    </div>

                    {/* Meta Page Index Info */}
                    <div className="text-center mb-4">
                      <p className="text-xs font-serif font-bold text-stone-700 dark:text-stone-300">Page {index + 1}</p>
                      <p className="text-[9px] font-mono uppercase text-stone-400 mt-0.5 tracking-wider">Rotation: {rotation}°</p>
                    </div>

                    {/* Rotation control actions */}
                    <div className="flex gap-1.5 mt-auto w-full">
                      <button
                        onClick={() => rotatePage(index, 'ccw')}
                        title="Rotate -90°"
                        className={`flex-1 py-1.5 border rounded-none flex items-center justify-center transition-colors ${
                          darkMode ? 'border-stone-800 hover:border-stone-600 text-stone-400 hover:text-white' : 'border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => rotatePage(index, 'cw')}
                        title="Rotate +90°"
                        className={`flex-1 py-1.5 border rounded-none flex items-center justify-center transition-colors ${
                          darkMode ? 'border-stone-800 hover:border-stone-600 text-stone-400 hover:text-white' : 'border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Action area */}
          <div className="flex justify-end gap-4 pt-6 border-t border-dashed border-stone-800/60">
            <button
              onClick={() => { setFile(null); setPageRotations({}); }}
              className={`px-5 py-2.5 rounded-none text-xs font-sans font-bold uppercase tracking-widest border transition-colors ${
                darkMode 
                  ? 'border-stone-800 text-stone-300 hover:bg-[#121211]' 
                  : 'border-stone-200 text-stone-700 hover:bg-[#FAF9F5]'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={applyRotations}
              className={`px-6 py-2.5 rounded-none font-sans font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                darkMode 
                  ? 'bg-[#bfa15f] text-black hover:opacity-90' 
                  : 'bg-[#8c1d1a] text-white hover:opacity-90'
              }`}
            >
              <FileDown className="w-4 h-4" />
              Apply & Download PDF
            </button>
          </div>

        </div>
      ) : (
        /* File selection screen */
        <div className="max-w-3xl mx-auto">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border border-dashed rounded-none p-10 sm:p-14 text-center cursor-pointer transition-all ${
              darkMode 
                ? 'border-stone-800 hover:border-stone-600 bg-[#181817]/40 hover:bg-[#181817]/60' 
                : 'border-[#dcd9d0] hover:border-stone-400 bg-[#FAF9F5]/40 hover:bg-[#FAF9F5]/60'
            }`}
          >
            <input 
              ref={fileInputRef} 
              type="file" 
              accept=".pdf" 
              onChange={handleFileChange} 
              className="hidden" 
            />
            <div className={`w-10 h-10 border rounded-none flex items-center justify-center mx-auto mb-4 ${
              darkMode ? 'border-[#333331] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'
            }`}>
              <Upload className="w-4 h-4" />
            </div>
            <h3 className="font-serif font-medium text-lg mb-1.5 italic">Choose PDF to Rotate Pages</h3>
            <p className={`text-xs font-serif max-w-sm mx-auto mb-6 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              Select your document to configure custom page angles. Rotation streams execute in your browser sandboxed workspace.
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
        </div>
      )}

      {/* Trust Safeguard Footer Banner */}
      <div className={`mt-16 p-6 rounded-none border max-w-4xl mx-auto flex items-start gap-4 ${
        darkMode ? 'bg-[#181817] border-stone-800 text-stone-300' : 'bg-[#FAF9F5] border-[#e6e2d8] text-stone-600'
      }`}>
        <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
        <div>
          <p className="text-xs font-serif font-bold">Encrypted Page Rotation Protocol</p>
          <p className="text-[10px] font-serif text-stone-500 leading-normal mt-0.5">
            Your document bytes are parsed and rewritten directly inside standard ECMAScript heap allocations. Page rotation matrices are modified securely client-side without transmitting document bytes over server networks.
          </p>
        </div>
      </div>

    </div>
  );
}
