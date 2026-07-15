import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, CheckCircle2, Download, ShieldCheck, 
  Settings, Loader2, FileImage, Sparkles, MoveUp, MoveDown, Trash2, 
  Plus, Eye, AlertCircle
} from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { DocumentFile } from '../types';
import { EditorialProgressBar } from './EditorialProgressBar';
import { SaaSDB } from '../lib/saasDb';
import { Language, translations, toolTranslations } from '../lib/translations';

interface ImageItem {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  file: File;
  width?: number;
  height?: number;
}

interface ImageToPDFToolProps {
  darkMode: boolean;
  setView: (view: string) => void;
  lang?: Language;
}

export default function ImageToPDFTool({ darkMode, setView, lang }: ImageToPDFToolProps) {
  const activeLang = lang || 'id';
  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'original'>('a4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | 'auto'>('auto');
  const [margins, setMargins] = useState<'none' | 'small' | 'large'>('none');
  const [layoutMode, setLayoutMode] = useState<'fit' | 'fill'>('fit');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfSize, setPdfSize] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ImageItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const processImageFiles = async (files: FileList) => {
    setErrorMsg(null);
    const newImages: ImageItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Only image files (JPEG, PNG, WebP) are supported.');
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      
      // Get image dimensions
      const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
          resolve({ width: 0, height: 0 });
        };
        img.src = previewUrl;
      });

      newImages.push({
        id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        previewUrl,
        file,
        width: dimensions.width,
        height: dimensions.height
      });
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
      setPdfBlobUrl(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFiles(e.target.files);
    }
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === images.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setImages(updated);
    setPdfBlobUrl(null);
  };

  const deleteImage = (index: number) => {
    const deleted = images[index];
    URL.revokeObjectURL(deleted.previewUrl);
    setImages(prev => prev.filter((_, i) => i !== index));
    setPdfBlobUrl(null);
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setPdfBlobUrl(null);
    setErrorMsg(null);
    setProgress(0);
  };

  // Convert canvas to jpeg format/bytes safely
  const convertImageToJpegBytes = (imgItem: ImageItem): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context could not be established.'));
          return;
        }
        
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Blob conversion failed.'));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result instanceof ArrayBuffer) {
              resolve(new Uint8Array(reader.result));
            } else {
              reject(new Error('ArrayBuffer conversion failed.'));
            }
          };
          reader.readAsArrayBuffer(blob);
        }, 'image/jpeg', 0.90);
      };
      img.onerror = () => reject(new Error('Image could not be parsed into canvas layers.'));
      img.src = imgItem.previewUrl;
    });
  };

  const generatePDF = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProgress(10);
    setStep('Staging image layout assets...');
    setErrorMsg(null);

    try {
      const pdfDoc = await PDFDocument.create();

      for (let i = 0; i < images.length; i++) {
        const imgItem = images[i];
        const percent = Math.floor(10 + ((i / images.length) * 70));
        setProgress(percent);
        setStep(`Transcoding frame ${i + 1} of ${images.length}: ${imgItem.name}...`);

        // Convert any image (PNG, WebP, JPEG) to standardized JPEG binary representation
        const jpegBytes = await convertImageToJpegBytes(imgItem);
        const embeddedImage = await pdfDoc.embedJpg(jpegBytes);
        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;

        // Define dimensions based on chosen page size
        let pageWidth = imgWidth;
        let pageHeight = imgHeight;

        if (pageSize === 'a4') {
          // A4 dimensions are 595.275 x 841.89 points
          pageWidth = 595.275;
          pageHeight = 841.89;
        } else if (pageSize === 'letter') {
          // Letter dimensions are 612 x 792 points
          pageWidth = 612;
          pageHeight = 792;
        }

        // Apply orientation changes if page is constrained
        if (pageSize !== 'original') {
          let shouldRotate = false;
          if (orientation === 'landscape') {
            shouldRotate = pageWidth < pageHeight;
          } else if (orientation === 'portrait') {
            shouldRotate = pageWidth > pageHeight;
          } else if (orientation === 'auto') {
            // Match dominant image aspect ratio
            const isImageLandscape = imgWidth > imgHeight;
            const isPageLandscape = pageWidth > pageHeight;
            shouldRotate = isImageLandscape !== isPageLandscape;
          }

          if (shouldRotate) {
            const temp = pageWidth;
            pageWidth = pageHeight;
            pageHeight = temp;
          }
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Calculate margin size
        let marginX = 0;
        let marginY = 0;
        if (margins === 'small') {
          marginX = 25;
          marginY = 25;
        } else if (margins === 'large') {
          marginX = 50;
          marginY = 50;
        }

        const usableWidth = pageWidth - (marginX * 2);
        const usableHeight = pageHeight - (marginY * 2);

        // Position & Scale calculations
        let drawWidth = usableWidth;
        let drawHeight = usableHeight;
        let drawX = marginX;
        let drawY = marginY;

        if (layoutMode === 'fit') {
          // Fit whole image keeping aspect ratio
          const scaleX = usableWidth / imgWidth;
          const scaleY = usableHeight / imgHeight;
          const scale = Math.min(scaleX, scaleY);

          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;

          // Center image in the usable area
          drawX = marginX + (usableWidth - drawWidth) / 2;
          drawY = marginY + (usableHeight - drawHeight) / 2;
        } else {
          // Fill: Expand to cover whole page area, cropping excess
          const scaleX = usableWidth / imgWidth;
          const scaleY = usableHeight / imgHeight;
          const scale = Math.max(scaleX, scaleY);

          drawWidth = imgWidth * scale;
          drawHeight = imgHeight * scale;

          // Center-crop drawing coordinates
          drawX = marginX + (usableWidth - drawWidth) / 2;
          drawY = marginY + (usableHeight - drawHeight) / 2;
        }

        page.drawImage(embeddedImage, {
          x: drawX,
          y: drawY,
          width: drawWidth,
          height: drawHeight
        });
      }

      setProgress(85);
      setStep('Compiling document page matrices...');
      
      const pdfBytes = await pdfDoc.save();
      
      setProgress(95);
      setStep('Finalizing PDF serialization...');
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      setPdfBlobUrl(url);
      setPdfSize(pdfBytes.byteLength);
      SaaSDB.logActivity('IMAGE_TO_PDF');
      setProgress(100);
      setStep('Success! Images compiled perfectly.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during compilation of PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!pdfBlobUrl) return;
    const link = document.createElement('a');
    link.href = pdfBlobUrl;
    link.download = `UtilDoc_Images_Compiled_${Date.now().toString().slice(-4)}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (pdfBlobUrl) {
          handleDownload();
        } else if (images.length > 0 && !isProcessing) {
          generatePDF();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pdfBlobUrl, images, isProcessing, pageSize, orientation, margins]);

  return (
    <div id="image-to-pdf-tool-container" className="max-w-4xl mx-auto px-4 py-8">
      {/* Editorial Header */}
      <div className="mb-8 border-b border-stone-200 dark:border-stone-800 pb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-sans font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-none border ${
              darkMode ? 'bg-[#2a251c] text-[#bfa15f] border-[#bfa15f]/30' : 'bg-[#f6f2eb] text-[#8c1d1a] border-[#8c1d1a]/20'
            }`}>
              Image Converter
            </span>
          </div>
          <h1 className={`text-4xl font-serif font-medium tracking-tight italic ${
            darkMode ? 'text-stone-100' : 'text-stone-950'
          }`}>
            {toolTranslations['image-to-pdf']?.name[activeLang] || 'Image to PDF'}
          </h1>
          <p className={`text-xs font-serif leading-relaxed mt-2 max-w-xl ${
            darkMode ? 'text-stone-400' : 'text-stone-600'
          }`}>
            {toolTranslations['image-to-pdf']?.description[activeLang] || 'Compile JPG, PNG, or WebP graphics into a highly standardized, single professional PDF publication.'}
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
          {activeLang === 'en' ? 'Catalog' : 'Katalog'}
        </button>
      </div>

      {errorMsg && (
        <div className={`p-4 mb-6 rounded-none border text-xs font-serif leading-relaxed flex items-center justify-between ${
          darkMode ? 'bg-[#2a1a1a] border-[#5a1c1a] text-red-400' : 'bg-[#fff5f5] border-[#f5c6cb] text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
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
          title="Rasterization Graphics Transcoder..."
        />
      ) : images.length === 0 ? (
        /* File Upload Drop Zone */
        <div id="image-dropzone" className="mb-8">
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={async (e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processImageFiles(e.dataTransfer.files);
              }
            }}
            className={`border-2 border-dashed rounded-none p-16 text-center cursor-pointer transition-all ${
              darkMode 
                ? 'border-stone-800 bg-[#161615] hover:border-[#bfa15f]/50 hover:bg-[#181816]' 
                : 'border-stone-300 bg-[#faf9f6] hover:border-[#8c1d1a]/50 hover:bg-[#f6f4ed]'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            <Upload className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-stone-600' : 'text-stone-400'}`} />
            
            <h3 className={`text-sm font-sans font-bold uppercase tracking-widest mb-1 ${
              darkMode ? 'text-stone-200' : 'text-stone-800'
            }`}>
              Drag & Drop Graphics Array
            </h3>
            <p className={`text-xs font-serif leading-relaxed max-w-sm mx-auto mb-6 ${
              darkMode ? 'text-stone-500' : 'text-stone-500'
            }`}>
              Drop single or multiple image frames (JPG, PNG, WebP) to build a unified catalog sheets publication.
            </p>

            <button
              type="button"
              className={`px-6 py-3 text-xs font-sans font-bold uppercase tracking-widest transition-all ${
                darkMode 
                  ? 'bg-[#eae7e0] text-[#121211] hover:bg-white' 
                  : 'bg-[#1c1c1a] text-[#FAF9F5] hover:bg-stone-800'
              }`}
            >
              Browse Local System
            </button>
          </div>
        </div>
      ) : (
        /* Core layout with columns */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main List Column (Left) */}
          <div className="lg:col-span-2 space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-sans font-bold uppercase tracking-widest text-stone-400">
                Staged Frame Catalog ({images.length} Image{images.length > 1 ? 's' : ''})
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-all ${
                    darkMode 
                      ? 'border-stone-800 text-stone-200 hover:bg-stone-900' 
                      : 'border-stone-300 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Frames
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider border border-red-200 dark:border-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/10 transition-all"
                >
                  Reset Catalog
                </button>
              </div>
            </div>

            {/* List of images */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {images.map((img, idx) => (
                <div 
                  key={img.id}
                  className={`p-3 border rounded-none flex items-center justify-between gap-3 ${
                    darkMode ? 'bg-[#161615] border-stone-800 hover:border-stone-700' : 'bg-[#faf9f6] border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-16 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shrink-0 overflow-hidden flex items-center justify-center">
                      <img 
                        src={img.previewUrl} 
                        alt={img.name} 
                        className="max-w-full max-h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-0 right-0 bg-stone-950/85 text-white font-mono text-[8px] px-1">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="min-w-0 font-serif">
                      <p className={`text-xs font-bold truncate max-w-[200px] sm:max-w-sm ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>
                        {img.name}
                      </p>
                      <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                        {formatSize(img.size)} • {img.width && img.height ? `${img.width}x${img.height} px` : 'Dimension unknown'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPreviewImage(img)}
                      className={`p-1.5 border rounded-none transition-all ${
                        darkMode ? 'border-stone-800 text-stone-400 hover:bg-stone-900 hover:text-stone-200' : 'border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                      title="Inspect Frame"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveImage(idx, 'up')}
                      disabled={idx === 0}
                      className={`p-1.5 border rounded-none transition-all disabled:opacity-20 ${
                        darkMode ? 'border-stone-800 text-stone-400 hover:bg-stone-900 hover:text-stone-200' : 'border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                      title="Move Frame Up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveImage(idx, 'down')}
                      disabled={idx === images.length - 1}
                      className={`p-1.5 border rounded-none transition-all disabled:opacity-20 ${
                        darkMode ? 'border-stone-800 text-stone-400 hover:bg-stone-900 hover:text-stone-200' : 'border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                      title="Move Frame Down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteImage(idx)}
                      className="p-1.5 border border-red-200/40 dark:border-red-950/20 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-none transition-all"
                      title="Delete Frame"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Helper Banner */}
            <div className={`p-4 border rounded-none flex items-start gap-3 ${
              darkMode ? 'bg-[#181817] border-stone-800' : 'bg-[#faf9f6] border-stone-200'
            }`}>
              <Sparkles className={`w-4 h-4 mt-0.5 shrink-0 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
              <p className={`text-[11px] font-serif leading-relaxed ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                Frames will be bound and aligned according to the order above. Drag or use the directional buttons to structure your catalog sheets sequence before generating.
              </p>
            </div>

          </div>

          {/* Right Column (Controls or Success download card) */}
          <div className="lg:col-span-1 space-y-6">
            
            {pdfBlobUrl ? (
              /* Success Download Card */
              <div className={`p-5 border rounded-none space-y-4 ${
                darkMode ? 'bg-[#181817] border-[#2a2a29]' : 'bg-[#fcfbf9] border-[#e6e1d5]'
              }`}>
                <div className="flex items-center gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-sans font-bold uppercase tracking-wider">Catalog Ready</h4>
                    <p className={`text-[10px] font-serif ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                      Successfully compiled.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 font-serif text-[11px]">
                  <p><span className="font-sans font-bold uppercase tracking-wider text-[9px] block text-stone-400 dark:text-stone-500">Staged Pages</span>{images.length} frames</p>
                  <p><span className="font-sans font-bold uppercase tracking-wider text-[9px] block text-stone-400 dark:text-stone-500">Compiled PDF Size</span>{formatSize(pdfSize)}</p>
                  <p><span className="font-sans font-bold uppercase tracking-wider text-[9px] block text-stone-400 dark:text-stone-500">Dimension Output</span>{pageSize.toUpperCase()} ({orientation.toUpperCase()})</p>
                </div>

                <button 
                  onClick={handleDownload}
                  className={`w-full py-3 text-xs font-sans font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                    darkMode 
                      ? 'bg-[#eae7e0] text-[#121211] hover:bg-white' 
                      : 'bg-[#1c1c1a] text-[#FAF9F5] hover:bg-stone-800'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>

                <button
                  onClick={() => setPdfBlobUrl(null)}
                  className={`w-full py-2.5 text-xs font-sans font-bold uppercase tracking-widest border transition-all ${
                    darkMode 
                      ? 'border-stone-800 text-stone-300 hover:bg-stone-900' 
                      : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Modify Sequence
                </button>
              </div>
            ) : (
              /* Conversion Settings Panel */
              <div className={`p-5 rounded-none border ${
                darkMode ? 'bg-[#161615] border-[#252524]' : 'bg-[#faf9f6] border-[#e6e1d5]'
              }`}>
                <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3 mb-4">
                  <Settings className={`w-4 h-4 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`} />
                  <h3 className="text-xs font-sans font-bold uppercase tracking-wider">Publication Setup</h3>
                </div>

                <div className="space-y-4">
                  {/* Page Size */}
                  <div>
                    <label className="block text-[9px] font-sans font-bold uppercase tracking-wider text-stone-400 mb-1.5">Page Dimension</label>
                    <div className="space-y-1.5">
                      {[
                        { id: 'original', label: 'Match Image Format', desc: 'No margins. Fits image aspect sizes.' },
                        { id: 'a4', label: 'Standard A4 Size', desc: '595 x 841 points. Print standard.' },
                        { id: 'letter', label: 'US Letter Size', desc: '612 x 792 points. Standard US.' }
                      ].map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setPageSize(p.id as any)}
                          className={`w-full text-left p-2 border transition-all ${
                            pageSize === p.id
                              ? (darkMode ? 'border-[#bfa15f] bg-[#221e16] text-white' : 'border-[#8c1d1a] bg-[#faf5f5] text-stone-950')
                              : (darkMode ? 'border-stone-800 hover:bg-stone-900 bg-[#121211]/40 text-stone-400' : 'border-stone-200 hover:bg-stone-50 bg-white text-stone-600')
                          }`}
                        >
                          <span className="text-[11px] font-sans font-bold uppercase block">{p.label}</span>
                          <span className="text-[9px] font-serif text-stone-500">{p.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Orientation */}
                  {pageSize !== 'original' && (
                    <div>
                      <label className="block text-[9px] font-sans font-bold uppercase tracking-wider text-stone-400 mb-1.5">Orientation</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'auto', label: 'Auto' },
                          { id: 'portrait', label: 'Portrait' },
                          { id: 'landscape', label: 'Landscape' }
                        ].map((o) => (
                          <button
                            key={o.id}
                            onClick={() => setOrientation(o.id as any)}
                            className={`py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider border transition-all ${
                              orientation === o.id
                                ? (darkMode ? 'bg-[#bfa15f] border-[#bfa15f] text-[#121211]' : 'bg-[#8c1d1a] border-[#8c1d1a] text-white')
                                : (darkMode ? 'border-stone-800 hover:bg-stone-900 text-stone-300 bg-[#121211]/20' : 'border-stone-300 hover:bg-stone-50 text-stone-600 bg-white')
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Margins */}
                  {pageSize !== 'original' && (
                    <div>
                      <label className="block text-[9px] font-sans font-bold uppercase tracking-wider text-stone-400 mb-1.5">Page Margins</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'none', label: 'None' },
                          { id: 'small', label: 'Small' },
                          { id: 'large', label: 'Large' }
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setMargins(m.id as any)}
                            className={`py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider border transition-all ${
                              margins === m.id
                                ? (darkMode ? 'bg-[#bfa15f] border-[#bfa15f] text-[#121211]' : 'bg-[#8c1d1a] border-[#8c1d1a] text-white')
                                : (darkMode ? 'border-stone-800 hover:bg-stone-900 text-stone-300 bg-[#121211]/20' : 'border-stone-300 hover:bg-stone-50 text-stone-600 bg-white')
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Layout mode (fit / fill) */}
                  {pageSize !== 'original' && (
                    <div>
                      <label className="block text-[9px] font-sans font-bold uppercase tracking-wider text-stone-400 mb-1.5">Alignment Aspect</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { id: 'fit', label: 'Fit Bounds', desc: 'No content cropped' },
                          { id: 'fill', label: 'Fill Page', desc: 'May crop edge limits' }
                        ].map((l) => (
                          <button
                            key={l.id}
                            onClick={() => setLayoutMode(l.id as any)}
                            className={`py-2 px-1 border transition-all flex flex-col items-center ${
                              layoutMode === l.id
                                ? (darkMode ? 'border-[#bfa15f] bg-[#221e16] text-white' : 'border-[#8c1d1a] bg-[#faf5f5] text-stone-950')
                                : (darkMode ? 'border-stone-800 hover:bg-stone-900 bg-[#121211]/40 text-stone-400' : 'border-stone-200 hover:bg-stone-50 bg-white text-stone-600')
                            }`}
                          >
                            <span className="text-[10px] font-sans font-bold uppercase block">{l.label}</span>
                            <span className="text-[8px] font-serif text-stone-500">{l.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={generatePDF}
                    className={`w-full py-3.5 mt-4 text-xs font-sans font-bold uppercase tracking-widest transition-all ${
                      darkMode 
                        ? 'bg-[#eae7e0] text-[#121211] hover:bg-white' 
                        : 'bg-[#1c1c1a] text-[#FAF9F5] hover:bg-stone-800'
                    }`}
                  >
                    Generate Publication PDF
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Preview Modal for single Image inspection */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className={`w-full max-w-lg border rounded-none p-5 flex flex-col ${
            darkMode ? 'bg-[#161615] border-stone-800 text-stone-100' : 'bg-white border-stone-200 text-stone-950'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800 mb-4">
              <h4 className="text-xs font-sans font-bold uppercase tracking-wider truncate max-w-[280px]">
                Inspect Frame: {previewImage.name}
              </h4>
              <button 
                onClick={() => setPreviewImage(null)}
                className={`text-xs font-sans font-bold uppercase tracking-wider hover:opacity-75`}
              >
                Close
              </button>
            </div>
            
            <div className="bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 max-h-[400px] overflow-hidden flex items-center justify-center p-2 mb-4">
              <img 
                src={previewImage.previewUrl} 
                alt={previewImage.name} 
                className="max-w-full max-h-[350px] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-1.5 font-serif text-[11px] text-stone-500">
              <p><strong className="font-sans text-[10px] uppercase text-stone-400 mr-2">Specs:</strong> {previewImage.width}x{previewImage.height} px • {formatSize(previewImage.size)}</p>
              <p><strong className="font-sans text-[10px] uppercase text-stone-400 mr-2">Encoding:</strong> {previewImage.type}</p>
            </div>
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
            UtilDoc operates strictly in sandboxed memory space. Image files are buffered and transcoded directly inside your browser. No files are ever processed, transferred, or stored on external system networks.
          </p>
        </div>
      </div>
    </div>
  );
}
