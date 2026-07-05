import React, { useState, useRef, useEffect } from 'react';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import { 
  FileText, Upload, ShieldCheck, Download, Check, AlertCircle, 
  Sparkles, Image, Type, Sliders, Layout, Eye, Trash2, Layers, FileDown
} from 'lucide-react';
import { DocumentFile } from '../types';
import { EditorialProgressBar } from './EditorialProgressBar';

interface WatermarkPDFToolProps {
  darkMode: boolean;
  setView: (view: string) => void;
}

type WatermarkType = 'text' | 'image';
type PositionPreset = 'center' | 'diagonal' | 'tiled' | 'header' | 'footer' | 'top-right' | 'bottom-left';

export default function WatermarkPDFTool({ darkMode, setView }: WatermarkPDFToolProps) {
  const [file, setFile] = useState<DocumentFile | null>(null);
  const [rawFileBytes, setRawFileBytes] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; downloadUrl: string; size: number } | null>(null);

  // Watermark state
  const [watermarkType, setWatermarkType] = useState<WatermarkType>('text');
  
  // Text Watermark Config
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL');
  const [fontFamily, setFontFamily] = useState<string>('Helvetica-Bold');
  const [textFontSize, setTextFontSize] = useState<number>(48);
  const [textOpacity, setTextOpacity] = useState<number>(0.15);
  const [textRotation, setTextRotation] = useState<number>(-45);
  const [textColor, setTextColor] = useState('#8c1d1a'); // Crimson preset
  const [textPreset, setTextPreset] = useState<PositionPreset>('diagonal');

  // Image Watermark Config
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageBytes, setImageBytes] = useState<Uint8Array | null>(null);
  const [imageScale, setImageScale] = useState<number>(50); // percentage 10 - 200
  const [imageOpacity, setImageOpacity] = useState<number>(0.2);
  const [imagePreset, setImagePreset] = useState<PositionPreset>('center');

  // Pages setting
  const [pageSelection, setPageSelection] = useState<'all' | 'first' | 'last' | 'odd' | 'even' | 'custom'>('all');
  const [customPageRange, setCustomPageRange] = useState('');
  const [previewPage, setPreviewPage] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Clean up Object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      if (result?.downloadUrl) {
        URL.revokeObjectURL(result.downloadUrl);
      }
    };
  }, [imagePreviewUrl, result]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setErrorMsg(null);
      setIsProcessing(true);
      setProgress(15);
      setStep('Buffering document binary streams...');

      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        setProgress(50);
        setStep('Unpacking document structures...');

        const pdfDoc = await PDFDocument.load(arrayBuffer, { 
          updateMetadata: false, 
          ignoreEncryption: true 
        });

        const pageCount = pdfDoc.getPageCount();
        setProgress(90);
        setStep('Verifying security filters...');

        setFile({
          id: `file-watermark-${Date.now()}`,
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          pageCount,
          uploadedAt: new Date(),
          status: 'queued',
          progress: 0
        });

        setRawFileBytes(new Uint8Array(arrayBuffer));
        setPreviewPage(0);
        setProgress(100);
        setStep('PDF initialized.');
        setIsProcessing(false);
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Failed to process this PDF. It may be corrupt or encrypted with password protection.');
        setIsProcessing(false);
      }
    } else if (selectedFile) {
      setErrorMsg('Please upload a valid PDF document.');
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedImage = e.target.files?.[0];
    if (selectedImage && (selectedImage.type === 'image/png' || selectedImage.type === 'image/jpeg' || selectedImage.type === 'image/jpg')) {
      setErrorMsg(null);
      setImageFile(selectedImage);
      
      // Revoke old URL if exists
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(URL.createObjectURL(selectedImage));

      // Read bytes
      const arrayBuffer = await selectedImage.arrayBuffer();
      setImageBytes(new Uint8Array(arrayBuffer));
    } else if (selectedImage) {
      setErrorMsg('Image watermarks must be in PNG or JPEG/JPG format.');
    }
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    setImageBytes(null);
  };

  const generateSamplePdf = async (): Promise<Uint8Array> => {
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const pageStyles = [
      { title: 'UtilDoc Project Prospectus', subtitle: 'Confidential Internal Brief' },
      { title: 'Strategic Roadmap 2026', subtitle: 'Do Not Distribute Globally' },
      { title: 'Quarterly Operating Review', subtitle: 'Prepared for Partners' }
    ];

    for (let i = 0; i < pageStyles.length; i++) {
      const page = pdfDoc.addPage([595.275, 841.89]); // A4
      
      // Draw minimal editorial background grid
      page.drawRectangle({
        x: 0,
        y: 0,
        width: 595.275,
        height: 841.89,
        color: rgb(0.98, 0.97, 0.95) // Soft beige warm background
      });

      // Editorial Header
      page.drawText('ESTABLISHED LOCAL ENGINE SECURE BUFFER', {
        x: 50,
        y: 780,
        size: 8,
        font: helveticaFont,
        color: rgb(0.6, 0.6, 0.6)
      });

      // Main title text
      page.drawText(pageStyles[i].title, {
        x: 50,
        y: 680,
        size: 22,
        font: helveticaBold,
        color: rgb(0.1, 0.1, 0.1)
      });

      page.drawText(pageStyles[i].subtitle, {
        x: 50,
        y: 650,
        size: 13,
        font: helveticaFont,
        color: rgb(0.4, 0.4, 0.4)
      });

      // Sample mock paragraph lines
      const paragraphYOffsets = [550, 530, 510, 490, 470, 410, 390, 370, 350, 290, 270, 250];
      paragraphYOffsets.forEach((y, idx) => {
        const lineLen = idx % 2 === 0 ? 480 : 390;
        page.drawRectangle({
          x: 50,
          y,
          width: lineLen,
          height: 8,
          color: rgb(0.85, 0.85, 0.82)
        });
      });

      // Draw footer
      page.drawText(`Page 0${i + 1} of 03`, {
        x: 50,
        y: 60,
        size: 8,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5)
      });
    }

    return await pdfDoc.save();
  };

  const loadSample = async () => {
    setErrorMsg(null);
    setIsProcessing(true);
    setProgress(20);
    setStep('Compiling custom-crafted editorial sample document...');

    try {
      const bytes = await generateSamplePdf();
      setProgress(70);
      setStep('Configuring document stream targets...');

      setFile({
        id: `file-watermark-sample-${Date.now()}`,
        name: 'UtilDoc_Editorial_Sample.pdf',
        size: bytes.byteLength,
        type: 'application/pdf',
        pageCount: 3,
        uploadedAt: new Date(),
        status: 'queued',
        progress: 0
      });

      setRawFileBytes(bytes);
      setPreviewPage(0);
      setProgress(100);
      setStep('Sample hydrated successfully.');
      setIsProcessing(false);
    } catch (err) {
      console.error(err);
      setErrorMsg('Could not assemble sample PDF.');
      setIsProcessing(false);
    }
  };

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0.5, g: 0.5, b: 0.5 };
  };

  // Parses ranges like "1-3, 5" into an array of 0-based page indices
  const parsePageIndices = (rangeStr: string, totalPages: number): number[] => {
    if (!rangeStr.trim()) return [];
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
  };

  const getTargetPageIndices = (totalPages: number): number[] => {
    switch (pageSelection) {
      case 'first':
        return [0];
      case 'last':
        return [totalPages - 1];
      case 'odd':
        return Array.from({ length: totalPages }).map((_, i) => i).filter(i => (i + 1) % 2 !== 0);
      case 'even':
        return Array.from({ length: totalPages }).map((_, i) => i).filter(i => (i + 1) % 2 === 0);
      case 'custom':
        return parsePageIndices(customPageRange, totalPages);
      case 'all':
      default:
        return Array.from({ length: totalPages }).map((_, i) => i);
    }
  };

  const applyWatermark = async () => {
    if (!file || !rawFileBytes) return;

    if (watermarkType === 'image' && !imageBytes) {
      setErrorMsg('Please select or upload a watermark image first.');
      return;
    }

    if (pageSelection === 'custom' && !customPageRange.trim()) {
      setErrorMsg('Please enter a valid page range (e.g., "1-2, 4").');
      return;
    }

    setIsProcessing(true);
    setProgress(15);
    setStep('Parsing PDF dictionary entries...');

    try {
      const pdfDoc = await PDFDocument.load(rawFileBytes);
      const totalPages = pdfDoc.getPageCount();
      const targetIndices = getTargetPageIndices(totalPages);

      if (targetIndices.length === 0) {
        throw new Error('Your custom page range did not match any pages in this document.');
      }

      setProgress(40);
      setStep('Applying typography and asset configurations...');

      // Embed Font
      let embeddedFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      if (fontFamily === 'Courier-Bold') {
        embeddedFont = await pdfDoc.embedFont(StandardFonts.CourierBold);
      } else if (fontFamily === 'TimesRoman-Bold') {
        embeddedFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      }

      // Embed Image if image-based
      let embeddedImage: any = null;
      if (watermarkType === 'image' && imageBytes && imageFile) {
        if (imageFile.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        }
      }

      setProgress(70);
      setStep('Stamping pages with selected watermark preset...');

      const pages = pdfDoc.getPages();
      const textRgb = hexToRgb(textColor);

      for (const idx of targetIndices) {
        const page = pages[idx];
        const { width, height } = page.getSize();

        if (watermarkType === 'text') {
          // Calculate draw options based on position presets
          if (textPreset === 'diagonal' || textPreset === 'center') {
            const rotAngle = textPreset === 'diagonal' ? textRotation : 0;
            const pdfRotAngle = -rotAngle;
            const textWidth = embeddedFont.widthOfTextAtSize(watermarkText, textFontSize);
            const textHeight = embeddedFont.heightAtSize(textFontSize);
            
            // Center of the page
            const cx = width / 2;
            const cy = height / 2;
            
            // Pivot adjustment for rotation around bottom-left corner of text
            const rad = (pdfRotAngle * Math.PI) / 180;
            const u = textWidth / 2;
            const v = textHeight / 2;
            
            // Rotated offset from bottom-left corner to text center
            const uRot = u * Math.cos(rad) - v * Math.sin(rad);
            const vRot = u * Math.sin(rad) + v * Math.cos(rad);
            
            // Adjusted drawing start coordinates
            const x = cx - uRot;
            const y = cy - vRot;

            page.drawText(watermarkText, {
              x,
              y,
              size: textFontSize,
              font: embeddedFont,
              color: rgb(textRgb.r, textRgb.g, textRgb.b),
              opacity: textOpacity,
              rotate: degrees(pdfRotAngle),
            });
          } else if (textPreset === 'tiled') {
            // Matrix layout with centered tile offsets
            const cols = 3;
            const rows = 4;
            const tileSize = textFontSize * 0.7;
            const textWidth = embeddedFont.widthOfTextAtSize(watermarkText, tileSize);
            const textHeight = embeddedFont.heightAtSize(tileSize);
            const pdfRotAngle = -textRotation;
            const rad = (pdfRotAngle * Math.PI) / 180;
            const u = textWidth / 2;
            const v = textHeight / 2;
            const uRot = u * Math.cos(rad) - v * Math.sin(rad);
            const vRot = u * Math.sin(rad) + v * Math.cos(rad);

            for (let c = 0; c < cols; c++) {
              for (let r = 0; r < rows; r++) {
                const cx = (width / cols) * (c + 0.5);
                const cy = (height / rows) * (r + 0.5);
                
                const x = cx - uRot;
                const y = cy - vRot;

                page.drawText(watermarkText, {
                  x,
                  y,
                  size: tileSize,
                  font: embeddedFont,
                  color: rgb(textRgb.r, textRgb.g, textRgb.b),
                  opacity: textOpacity,
                  rotate: degrees(pdfRotAngle),
                });
              }
            }
          } else if (textPreset === 'header') {
            page.drawText(watermarkText, {
              x: 50,
              y: height - 40,
              size: textFontSize * 0.4,
              font: embeddedFont,
              color: rgb(textRgb.r, textRgb.g, textRgb.b),
              opacity: textOpacity,
            });
          } else if (textPreset === 'footer') {
            page.drawText(watermarkText, {
              x: 50,
              y: 40,
              size: textFontSize * 0.4,
              font: embeddedFont,
              color: rgb(textRgb.r, textRgb.g, textRgb.b),
              opacity: textOpacity,
            });
          }
        } else if (watermarkType === 'image' && embeddedImage) {
          const scaledDims = embeddedImage.scale(imageScale / 100);
          const imgW = scaledDims.width;
          const imgH = scaledDims.height;

          if (imagePreset === 'center' || imagePreset === 'diagonal') {
            page.drawImage(embeddedImage, {
              x: (width - imgW) / 2,
              y: (height - imgH) / 2,
              width: imgW,
              height: imgH,
              opacity: imageOpacity,
            });
          } else if (imagePreset === 'top-right') {
            page.drawImage(embeddedImage, {
              x: width - imgW - 50,
              y: height - imgH - 50,
              width: imgW,
              height: imgH,
              opacity: imageOpacity,
            });
          } else if (imagePreset === 'bottom-left') {
            page.drawImage(embeddedImage, {
              x: 50,
              y: 50,
              width: imgW,
              height: imgH,
              opacity: imageOpacity,
            });
          } else if (imagePreset === 'tiled') {
            const cols = 2;
            const rows = 3;
            for (let c = 0; c < cols; c++) {
              for (let r = 0; r < rows; r++) {
                const x = (width / cols) * (c + 0.5) - (imgW / 2);
                const y = (height / rows) * (r + 0.5) - (imgH / 2);
                page.drawImage(embeddedImage, {
                  x,
                  y,
                  width: imgW * 0.8,
                  height: imgH * 0.8,
                  opacity: imageOpacity,
                });
              }
            }
          }
        }
      }

      setProgress(90);
      setStep('Compiling modified document arrays...');

      const modifiedBytes = await pdfDoc.save();
      const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);

      setTimeout(() => {
        setResult({
          name: file.name.replace('.pdf', '_watermarked.pdf'),
          downloadUrl,
          size: modifiedBytes.byteLength
        });
        setIsProcessing(false);
      }, 500);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred while stamping watermarks onto the file.');
      setIsProcessing(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setRawFileBytes(null);
    setResult(null);
    setErrorMsg(null);
    setPreviewPage(0);
    removeImage();
  };

  const targetIndices = file ? getTargetPageIndices(file.pageCount) : [];
  const isCurrentPageWatermarked = targetIndices.includes(previewPage);

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
          applyWatermark();
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
        <h1 className="text-3xl sm:text-4xl font-serif font-light tracking-tight">PDF Watermark Board</h1>
        <p className={`text-xs sm:text-sm font-serif mt-2 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
          Overlay custom styled text strings or logo graphic layers onto target document page coordinate structures.
        </p>
      </div>

      {errorMsg && (
        <div className={`max-w-xl mx-auto mb-8 p-5 border text-xs leading-relaxed flex items-start gap-3.5 ${
          darkMode ? 'bg-red-500/5 border-red-500/25 text-red-300' : 'bg-red-50/50 border-red-200 text-red-800'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-sans font-bold uppercase tracking-wider mb-1">Process Failure</p>
            <p className="font-serif">{errorMsg}</p>
          </div>
        </div>
      )}

      {isProcessing ? (
        <EditorialProgressBar
          progress={progress}
          step={step}
          darkMode={darkMode}
          title="Stamping PDF Watermarks"
        />
      ) : result ? (
        /* Success result screen */
        <div className="max-w-2xl mx-auto">
          <div className={`p-10 rounded-none border text-center transition-all ${
            darkMode ? 'bg-[#181817] border-stone-800' : 'bg-[#FAF9F5] border-[#e6e2d8]'
          }`}>
            <div className={`w-12 h-12 border rounded-none flex items-center justify-center mx-auto mb-6 ${
              darkMode ? 'border-[#333331] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'
            }`}>
              <Check className="w-5 h-5" />
            </div>

            <h3 className="font-serif font-medium text-2xl mb-2 italic">Compilation Successful</h3>
            <p className={`text-xs font-serif mb-8 max-w-md mx-auto ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              Watermark layered successfully across selected page streams. Direct local buffer compilation complete.
            </p>

            <div className={`p-5 mb-8 rounded-none border text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              darkMode ? 'bg-[#121211] border-stone-800' : 'bg-white border-[#e6e2d8]'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 border rounded-none shrink-0 ${darkMode ? 'border-[#2c2c2a] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'}`}>
                  <FileText className="w-5 h-5" />
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
              onClick={resetTool}
              className={`px-5 py-2.5 rounded-none text-xs font-sans font-bold uppercase tracking-widest border transition-colors ${
                darkMode 
                  ? 'border-stone-800 text-stone-300 hover:bg-[#121211]' 
                  : 'border-stone-200 text-stone-700 hover:bg-[#FAF9F5]'
              }`}
            >
              Watermark Another Document
            </button>
          </div>
        </div>
      ) : file ? (
        /* Workspace splitting into controls and live preview */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls Panel */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Watermark Type Selector */}
            <div className={`p-5 rounded-none border ${
              darkMode ? 'bg-[#181817] border-stone-800' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'
            }`}>
              <span className="flex items-center gap-1 text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 mb-3">
                <Sliders className="w-3 h-3" /> Watermark Mode
              </span>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWatermarkType('text')}
                  className={`py-2 rounded-none font-sans font-bold text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                    watermarkType === 'text'
                      ? darkMode 
                        ? 'bg-[#bfa15f] text-black border-[#bfa15f]' 
                        : 'bg-[#8c1d1a] text-white border-[#8c1d1a]'
                      : darkMode 
                        ? 'border-stone-800 text-stone-400 hover:border-stone-700 hover:text-white' 
                        : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-800'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  Text Value
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkType('image')}
                  className={`py-2 rounded-none font-sans font-bold text-[10px] uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                    watermarkType === 'image'
                      ? darkMode 
                        ? 'bg-[#bfa15f] text-black border-[#bfa15f]' 
                        : 'bg-[#8c1d1a] text-white border-[#8c1d1a]'
                      : darkMode 
                        ? 'border-stone-800 text-stone-400 hover:border-stone-700 hover:text-white' 
                        : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-800'
                  }`}
                >
                  <Image className="w-3.5 h-3.5" />
                  Image Asset
                </button>
              </div>
            </div>

            {/* Type Specific Fields */}
            {watermarkType === 'text' ? (
              <div className={`p-6 rounded-none border space-y-5 ${
                darkMode ? 'bg-[#181817] border-stone-800' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'
              }`}>
                <h3 className="font-serif font-bold text-sm border-b pb-2 border-dashed border-stone-800 dark:border-stone-800 mb-4">
                  Text Config Parameters
                </h3>

                {/* Text String */}
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 block">
                    Watermark Text String
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value.toUpperCase())}
                    placeholder="CONFIDENTIAL"
                    maxLength={32}
                    className={`w-full px-3 py-2 text-sm font-serif border rounded-none focus:outline-none focus:ring-1 ${
                      darkMode 
                        ? 'bg-[#121211] border-stone-800 focus:ring-[#bfa15f] focus:border-[#bfa15f]' 
                        : 'bg-white border-[#e6e2d8] focus:ring-[#8c1d1a] focus:border-[#8c1d1a]'
                    }`}
                  />
                </div>

                {/* Font Face selection */}
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 block">
                    Font Family
                  </label>
                  <select
                    value={fontFamily}
                    onChange={(e) => setFontFamily(e.target.value)}
                    className={`w-full px-3 py-2 text-xs font-serif border rounded-none focus:outline-none focus:ring-1 ${
                      darkMode 
                        ? 'bg-[#121211] border-stone-800 focus:ring-[#bfa15f] text-white' 
                        : 'bg-white border-[#e6e2d8] focus:ring-[#8c1d1a]'
                    }`}
                  >
                    <option value="Helvetica-Bold">Helvetica Bold (Default)</option>
                    <option value="Courier-Bold">Courier New Bold</option>
                    <option value="TimesRoman-Bold">Times New Roman Bold</option>
                  </select>
                </div>

                {/* Preset layouts */}
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 block">
                    Stamp Layout Preset
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'diagonal', label: 'Diagonal Center' },
                      { id: 'center', label: 'Flat Center' },
                      { id: 'tiled', label: 'Tiled Matrix' },
                      { id: 'header', label: 'Header Margin' },
                      { id: 'footer', label: 'Footer Margin' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setTextPreset(p.id as PositionPreset);
                          if (p.id === 'center') setTextRotation(0);
                          if (p.id === 'diagonal') setTextRotation(-45);
                        }}
                        className={`py-1.5 border rounded-none text-[9px] font-sans font-bold uppercase tracking-widest transition-colors ${
                          textPreset === p.id
                            ? darkMode 
                              ? 'bg-[#bfa15f]/15 border-[#bfa15f] text-[#bfa15f]' 
                              : 'bg-[#8c1d1a]/10 border-[#8c1d1a] text-[#8c1d1a]'
                            : darkMode 
                              ? 'border-stone-800 text-stone-400 hover:border-stone-700' 
                              : 'border-stone-200 text-stone-500 hover:border-stone-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Preset Palette */}
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 block">
                    Typography Palette
                  </label>
                  <div className="flex gap-2 items-center">
                    {[
                      { hex: '#8c1d1a', name: 'Crimson' },
                      { hex: '#2c2c2a', name: 'Charcoal' },
                      { hex: '#bfa15f', name: 'Bronze' },
                      { hex: '#1a365d', name: 'Navy' },
                      { hex: '#78716c', name: 'Stone' }
                    ].map((col) => (
                      <button
                        key={col.hex}
                        type="button"
                        onClick={() => setTextColor(col.hex)}
                        className={`w-6 h-6 border transition-transform ${
                          textColor === col.hex ? 'scale-110 border-black dark:border-white ring-1 ring-offset-2 ring-stone-400' : 'border-stone-300 dark:border-stone-800'
                        }`}
                        style={{ backgroundColor: col.hex }}
                        title={col.name}
                      />
                    ))}
                    <input
                      type="color"
                      value={textColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-7 h-7 cursor-pointer border border-stone-300 dark:border-stone-800 p-0"
                      title="Custom Hex Picker"
                    />
                  </div>
                </div>

                {/* Font Size Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400">
                    <span>Font Size</span>
                    <span className="font-mono">{textFontSize}pt</span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={120}
                    value={textFontSize}
                    onChange={(e) => setTextFontSize(Number(e.target.value))}
                    className="w-full accent-[#8c1d1a] dark:accent-[#bfa15f] cursor-pointer"
                  />
                </div>

                {/* Opacity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400">
                    <span>Opacity Level</span>
                    <span className="font-mono">{Math.round(textOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={1.0}
                    step={0.05}
                    value={textOpacity}
                    onChange={(e) => setTextOpacity(Number(e.target.value))}
                    className="w-full accent-[#8c1d1a] dark:accent-[#bfa15f] cursor-pointer"
                  />
                </div>

                {/* Rotation Slider */}
                {textPreset !== 'center' && textPreset !== 'header' && textPreset !== 'footer' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400">
                      <span>Rotation Angle</span>
                      <span className="font-mono">{textRotation}°</span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={textRotation}
                      onChange={(e) => setTextRotation(Number(e.target.value))}
                      className="w-full accent-[#8c1d1a] dark:accent-[#bfa15f] cursor-pointer"
                    />
                  </div>
                )}

              </div>
            ) : (
              /* Image Config Panels */
              <div className={`p-6 rounded-none border space-y-5 ${
                darkMode ? 'bg-[#181817] border-stone-800' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'
              }`}>
                <h3 className="font-serif font-bold text-sm border-b pb-2 border-dashed border-stone-800 dark:border-stone-800 mb-4">
                  Image Config Parameters
                </h3>

                {imageFile ? (
                  <div className={`p-3 border rounded-none flex items-center justify-between ${
                    darkMode ? 'bg-[#121211] border-stone-800' : 'bg-white border-[#e6e2d8]'
                  }`}>
                    <div className="flex items-center gap-2.5 truncate">
                      {imagePreviewUrl && (
                        <img 
                          src={imagePreviewUrl} 
                          alt="Watermark preview" 
                          className="w-8 h-8 object-cover border border-stone-200 dark:border-stone-800"
                        />
                      )}
                      <div className="truncate">
                        <p className="text-xs font-serif font-bold truncate max-w-[150px]">{imageFile.name}</p>
                        <p className="text-[9px] text-stone-400 font-mono">{formatSize(imageFile.size)}</p>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      onClick={removeImage}
                      className="p-1 text-red-500 hover:bg-red-500/10 transition-colors rounded-none"
                      title="Remove Watermark Image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className={`border border-dashed p-6 text-center cursor-pointer transition-colors ${
                      darkMode ? 'border-stone-800 hover:border-stone-700 bg-stone-900/10' : 'border-[#dcd9d0] hover:border-stone-400 bg-stone-50/20'
                    }`}
                  >
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <Image className={`w-6 h-6 mx-auto mb-2 text-stone-400`} />
                    <p className="text-xs font-serif font-medium italic">Upload Logo Graphic</p>
                    <p className="text-[9px] text-stone-400 font-mono mt-0.5">Supports PNG, JPG, or JPEG formats.</p>
                  </div>
                )}

                {/* Preset layouts */}
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 block">
                    Stamp Layout Preset
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'center', label: 'Center Page' },
                      { id: 'top-right', label: 'Top Right' },
                      { id: 'bottom-left', label: 'Bottom Left' },
                      { id: 'tiled', label: 'Tiled Matrix' }
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setImagePreset(p.id as PositionPreset)}
                        className={`py-1.5 border rounded-none text-[9px] font-sans font-bold uppercase tracking-widest transition-colors ${
                          imagePreset === p.id
                            ? darkMode 
                              ? 'bg-[#bfa15f]/15 border-[#bfa15f] text-[#bfa15f]' 
                              : 'bg-[#8c1d1a]/10 border-[#8c1d1a] text-[#8c1d1a]'
                            : darkMode 
                              ? 'border-stone-800 text-stone-400 hover:border-stone-700' 
                              : 'border-stone-200 text-stone-500 hover:border-stone-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Scale Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400">
                    <span>Graphic Scale</span>
                    <span className="font-mono">{imageScale}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={200}
                    value={imageScale}
                    onChange={(e) => setImageScale(Number(e.target.value))}
                    className="w-full accent-[#8c1d1a] dark:accent-[#bfa15f] cursor-pointer"
                  />
                </div>

                {/* Image Opacity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400">
                    <span>Opacity Level</span>
                    <span className="font-mono">{Math.round(imageOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.05}
                    max={1.0}
                    step={0.05}
                    value={imageOpacity}
                    onChange={(e) => setImageOpacity(Number(e.target.value))}
                    className="w-full accent-[#8c1d1a] dark:accent-[#bfa15f] cursor-pointer"
                  />
                </div>

              </div>
            )}

            {/* Target Pages Selector */}
            <div className={`p-6 rounded-none border space-y-4 ${
              darkMode ? 'bg-[#181817] border-stone-800' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'
            }`}>
              <h3 className="font-serif font-bold text-sm border-b pb-2 border-dashed border-stone-800 dark:border-stone-800">
                Target Pages Selector
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'all', label: 'All Pages' },
                  { id: 'first', label: 'First Page Only' },
                  { id: 'last', label: 'Last Page Only' },
                  { id: 'odd', label: 'Odd Pages' },
                  { id: 'even', label: 'Even Pages' },
                  { id: 'custom', label: 'Custom Range' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setPageSelection(s.id as any)}
                    className={`py-1.5 border rounded-none text-[9px] font-sans font-bold uppercase tracking-widest transition-colors ${
                      pageSelection === s.id
                        ? darkMode 
                          ? 'bg-[#bfa15f]/15 border-[#bfa15f] text-[#bfa15f]' 
                          : 'bg-[#8c1d1a]/10 border-[#8c1d1a] text-[#8c1d1a]'
                        : darkMode 
                          ? 'border-stone-800 text-stone-400 hover:border-stone-700' 
                          : 'border-stone-200 text-stone-500 hover:border-stone-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {pageSelection === 'custom' && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 block">
                    Custom Page Ranges
                  </label>
                  <input
                    type="text"
                    value={customPageRange}
                    onChange={(e) => setCustomPageRange(e.target.value)}
                    placeholder="e.g. 1-2, 4"
                    className={`w-full px-3 py-2 text-xs font-mono border rounded-none focus:outline-none focus:ring-1 ${
                      darkMode 
                        ? 'bg-[#121211] border-stone-800 focus:ring-[#bfa15f] focus:border-[#bfa15f] text-white' 
                        : 'bg-white border-[#e6e2d8] focus:ring-[#8c1d1a] focus:border-[#8c1d1a]'
                    }`}
                  />
                  <p className="text-[9px] text-stone-400 leading-normal font-serif">
                    Delimit page numbers or ranges using commas. Max document limit is <span className="font-mono">{file.pageCount}</span> pages.
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* Dynamic Editorial Visualizer & Action Board */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Live Interactive Canvas Representation */}
            <div className={`p-6 rounded-none border ${
              darkMode ? 'bg-[#181817] border-stone-800' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'
            }`}>
              <div className="flex items-center justify-between border-b border-dashed border-stone-800 dark:border-stone-800/60 pb-3 mb-6">
                <span className="flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400">
                  <Eye className="w-3.5 h-3.5" />
                  Live Mock Preview Context
                </span>
                <button
                  type="button"
                  onClick={resetTool}
                  className="text-[10px] font-sans font-bold uppercase tracking-widest text-red-500 hover:underline"
                >
                  Close Document
                </button>
              </div>

              {/* Document Simulator Page Container */}
              <div className="flex items-center justify-center py-6 bg-stone-100 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 p-4 relative overflow-hidden min-h-[480px]">
                
                {/* Simulated A4 Editorial Sheet */}
                <div className={`w-[280px] h-[396px] bg-[#FAF9F5] text-stone-900 border shadow-lg relative p-6 flex flex-col justify-between overflow-hidden`}>
                  
                  {/* Decorative thin margins */}
                  <div className="absolute inset-2 border border-[#eae6db] pointer-events-none" />

                  {/* Inside standard text lines simulating printed matter */}
                  <div className="space-y-4 z-10 pointer-events-none relative opacity-25">
                    <div className="flex items-center justify-between border-b border-stone-300 pb-1">
                      <span className="text-[7px] font-mono tracking-widest uppercase">UTILDOC REVIEW</span>
                      <span className="text-[7px] font-serif italic">PAGE {(previewPage + 1).toString().padStart(2, '0')}</span>
                    </div>

                    <div className="space-y-1.5 pt-4">
                      <div className="h-2 w-3/4 bg-stone-400" />
                      <div className="h-2 w-1/2 bg-stone-400" />
                    </div>

                    <div className="space-y-1 pt-4">
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const wClass = idx % 3 === 0 ? 'w-full' : idx % 3 === 1 ? 'w-5/6' : 'w-4/5';
                        return <div key={idx} className={`h-1 bg-stone-400 ${wClass}`} />;
                      })}
                    </div>
                  </div>

                  {/* Watermark overlay rendering conditionally depending on text vs image */}
                  <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none overflow-hidden select-none">
                    {isCurrentPageWatermarked ? (
                      watermarkType === 'text' ? (
                        /* Rendering text watermark layouts */
                        textPreset === 'tiled' ? (
                          <div className="w-full h-full grid grid-cols-3 grid-rows-3 p-4 opacity-100">
                            {Array.from({ length: 9 }).map((_, i) => (
                              <div 
                                key={i} 
                                className="flex items-center justify-center font-serif font-black select-none uppercase tracking-wider text-center"
                                style={{
                                  color: textColor,
                                  opacity: textOpacity,
                                  fontSize: `${Math.max(6, textFontSize * 0.7 * 0.47)}px`,
                                  transform: `rotate(${textRotation}deg)`,
                                  fontFamily: fontFamily.includes('Courier') ? 'Courier New' : fontFamily.includes('Times') ? 'Times New Roman' : 'sans-serif'
                                }}
                              >
                                {watermarkText || 'WATERMARK'}
                              </div>
                            ))}
                          </div>
                        ) : textPreset === 'header' ? (
                          <div 
                            className="absolute top-4 left-6 font-serif font-black tracking-widest uppercase"
                            style={{
                              color: textColor,
                              opacity: textOpacity,
                              fontSize: `${Math.max(6, textFontSize * 0.4 * 0.47)}px`,
                              fontFamily: fontFamily.includes('Courier') ? 'Courier New' : fontFamily.includes('Times') ? 'Times New Roman' : 'sans-serif'
                            }}
                          >
                            {watermarkText || 'WATERMARK'}
                          </div>
                        ) : textPreset === 'footer' ? (
                          <div 
                            className="absolute bottom-4 left-6 font-serif font-black tracking-widest uppercase"
                            style={{
                              color: textColor,
                              opacity: textOpacity,
                              fontSize: `${Math.max(6, textFontSize * 0.4 * 0.47)}px`,
                              fontFamily: fontFamily.includes('Courier') ? 'Courier New' : fontFamily.includes('Times') ? 'Times New Roman' : 'sans-serif'
                            }}
                          >
                            {watermarkText || 'WATERMARK'}
                          </div>
                        ) : (
                          /* Center / Diagonal layouts */
                          <div 
                            className="font-serif font-black tracking-widest uppercase text-center max-w-[240px] break-all leading-none"
                            style={{
                              color: textColor,
                              opacity: textOpacity,
                              fontSize: `${Math.max(8, textFontSize * 0.47)}px`,
                              transform: `rotate(${textPreset === 'diagonal' ? textRotation : 0}deg)`,
                              fontFamily: fontFamily.includes('Courier') ? 'Courier New' : fontFamily.includes('Times') ? 'Times New Roman' : 'sans-serif'
                            }}
                          >
                            {watermarkText || 'WATERMARK'}
                          </div>
                        )
                      ) : (
                        /* Rendering image watermark layouts */
                        imagePreviewUrl ? (
                          imagePreset === 'tiled' ? (
                            <div className="w-full h-full grid grid-cols-2 grid-rows-3 p-4 gap-6">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="flex items-center justify-center">
                                  <img
                                    src={imagePreviewUrl}
                                    alt="Tiled visual watermark"
                                    className="object-contain"
                                    style={{
                                      width: `${imageScale * 0.3}px`,
                                      maxHeight: `${imageScale * 0.3}px`,
                                      opacity: imageOpacity
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : imagePreset === 'top-right' ? (
                            <div className="absolute top-6 right-6">
                              <img
                                src={imagePreviewUrl}
                                alt="Top Right visual watermark"
                                className="object-contain"
                                style={{
                                  width: `${imageScale * 0.4}px`,
                                  maxHeight: `${imageScale * 0.4}px`,
                                  opacity: imageOpacity
                                }}
                              />
                            </div>
                          ) : imagePreset === 'bottom-left' ? (
                            <div className="absolute bottom-6 left-6">
                              <img
                                src={imagePreviewUrl}
                                alt="Bottom Left visual watermark"
                                className="object-contain"
                                style={{
                                  width: `${imageScale * 0.4}px`,
                                  maxHeight: `${imageScale * 0.4}px`,
                                  opacity: imageOpacity
                                }}
                              />
                            </div>
                          ) : (
                            /* Center Page */
                            <div className="flex items-center justify-center">
                              <img
                                src={imagePreviewUrl}
                                alt="Centered visual watermark"
                                className="object-contain"
                                style={{
                                  width: `${imageScale * 0.5}px`,
                                  maxHeight: `${imageScale * 0.5}px`,
                                  opacity: imageOpacity
                                }}
                              />
                            </div>
                          )
                        ) : (
                          <div className="text-[10px] font-mono text-stone-400 italic">No logo graphic loaded.</div>
                        )
                      )
                    ) : (
                      <div className="text-[8px] font-mono text-stone-300 dark:text-stone-500 uppercase tracking-widest select-none">No watermark on this page</div>
                    )}
                  </div>

                  {/* Bottom printed footer lines */}
                  <div className="flex items-center justify-between border-t border-stone-200 pt-1 opacity-25 z-10 pointer-events-none text-[6px] font-mono">
                    <span>ESTABLISHED SYST MEMORY</span>
                    <span>{targetIndices.length}/{file.pageCount} PAGES TARGETED</span>
                  </div>

                </div>

              </div>

              {/* Page Navigator Controls */}
              <div className="mt-4 flex items-center justify-between border-t border-stone-200 dark:border-stone-800 pt-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={previewPage === 0}
                    onClick={() => setPreviewPage((p) => Math.max(0, p - 1))}
                    className={`px-2.5 py-1 text-[9px] font-sans font-bold uppercase tracking-wider border rounded-none transition-colors ${
                      previewPage === 0
                        ? 'opacity-40 cursor-not-allowed border-stone-200 dark:border-stone-800 text-stone-400'
                        : darkMode
                          ? 'border-stone-800 hover:border-stone-700 text-stone-300 hover:bg-stone-800/50'
                          : 'border-stone-200 hover:border-stone-300 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    Prev Page
                  </button>
                  <span className="text-[10px] font-mono uppercase text-stone-500 select-none">
                    Page {previewPage + 1} of {file.pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={previewPage >= file.pageCount - 1}
                    onClick={() => setPreviewPage((p) => Math.min(file.pageCount - 1, p + 1))}
                    className={`px-2.5 py-1 text-[9px] font-sans font-bold uppercase tracking-wider border rounded-none transition-colors ${
                      previewPage >= file.pageCount - 1
                        ? 'opacity-40 cursor-not-allowed border-stone-200 dark:border-stone-800 text-stone-400'
                        : darkMode
                          ? 'border-stone-800 hover:border-stone-700 text-stone-300 hover:bg-stone-800/50'
                          : 'border-stone-200 hover:border-stone-300 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    Next Page
                  </button>
                </div>
                
                <span className={`text-[9px] font-sans font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isCurrentPageWatermarked
                    ? 'text-emerald-600 dark:text-emerald-500 font-bold'
                    : 'text-stone-400 dark:text-stone-500'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isCurrentPageWatermarked ? 'bg-emerald-600 dark:bg-emerald-500 animate-pulse' : 'bg-stone-300 dark:bg-stone-700'}`} />
                  {isCurrentPageWatermarked ? 'Watermark Active' : 'Watermark Inactive'}
                </span>
              </div>

              {/* Targets and Meta status */}
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-dashed border-stone-200 dark:border-stone-800 pt-4">
                <div className="text-[10px] font-mono uppercase text-stone-500 tracking-wide">
                  Document Size: <span className="font-bold">{formatSize(file.size)}</span> • Total Pages: <span className="font-bold">{file.pageCount}</span>
                </div>
                <div className="text-[10px] font-mono uppercase text-stone-500 tracking-wide">
                  Targeted: <span className="font-bold text-[#8c1d1a] dark:text-[#bfa15f]">
                    {pageSelection === 'all' ? 'All Pages' : pageSelection === 'first' ? 'First Page' : pageSelection === 'last' ? 'Last Page' : pageSelection === 'odd' ? 'Odd Pages' : pageSelection === 'even' ? 'Even Pages' : customPageRange || 'None Selected'}
                  </span>
                </div>
              </div>

            </div>

            {/* Document Action board */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={resetTool}
                className={`px-5 py-2.5 rounded-none text-xs font-sans font-bold uppercase tracking-widest border transition-colors ${
                  darkMode 
                    ? 'border-stone-800 text-stone-300 hover:bg-[#121211]' 
                    : 'border-stone-200 text-stone-700 hover:bg-[#FAF9F5]'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyWatermark}
                className={`px-6 py-2.5 rounded-none font-sans font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                  darkMode 
                    ? 'bg-[#bfa15f] text-black hover:opacity-90' 
                    : 'bg-[#8c1d1a] text-white hover:opacity-90'
                }`}
              >
                <FileDown className="w-4 h-4" />
                Apply Watermark & Download
              </button>
            </div>

          </div>

        </div>
      ) : (
        /* Unloaded state / Upload Board */
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
            <h3 className="font-serif font-medium text-lg mb-1.5 italic">Choose PDF for Watermark Overlays</h3>
            <p className={`text-xs font-serif max-w-sm mx-auto mb-6 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              Select your document to open the watermark dashboard. The compiled output downloads directly to your device storage.
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
          <p className="text-xs font-serif font-bold">Secure Local Watermarking Stream</p>
          <p className="text-[10px] font-serif text-stone-500 leading-normal mt-0.5">
            Your document bytes and watermark assets are processed completely client-side in secure sandbox allocations. File content is never logged, analyzed, or leaked over outside server relays.
          </p>
        </div>
      </div>

    </div>
  );
}
