import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, FileText, CheckCircle2, Download, ShieldCheck, 
  Settings, Loader2, FileImage, RefreshCw, Trash2, 
  Plus, Eye, AlertCircle, ArrowRight, Scale
} from 'lucide-react';
import JSZip from 'jszip';
import { DocumentFile } from '../types';
import { EditorialProgressBar } from './EditorialProgressBar';
import { SaaSDB } from '../lib/saasDb';
import { Language, translations, toolTranslations } from '../lib/translations';

interface ImageFileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
  file: File;
  width?: number;
  height?: number;
}

interface ConvertedImageItem extends ImageFileItem {
  convertedDataUrl: string;
  convertedSize: number;
  convertedType: string;
  convertedWidth: number;
  convertedHeight: number;
}

interface ImageConverterToolProps {
  darkMode: boolean;
  setView: (view: string) => void;
  lang?: Language;
  adsterraLink: string;
  adsterraActive: boolean;
}

export default function ImageConverterTool({ darkMode, setView, lang, adsterraLink, adsterraActive }: ImageConverterToolProps) {
  const activeLang = lang || 'id';
  const [images, setImages] = useState<ImageFileItem[]>([]);
  const [targetFormat, setTargetFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState<number>(0.90); // Quality multiplier for JPEG/WebP
  const [scalePercent, setScalePercent] = useState<number>(100); // Scale factor
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  
  const [convertedImages, setConvertedImages] = useState<ConvertedImageItem[]>([]);
  const [zipUrl, setZipUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<ConvertedImageItem | ImageFileItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    };
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const processImageFiles = async (files: FileList) => {
    setErrorMsg(null);
    const newImages: ImageFileItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Only image files (JPEG, PNG, WebP, SVG, GIF) are supported.');
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
        id: `img-conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      setConvertedImages([]);
      setZipUrl(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFiles(e.target.files);
    }
  };

  const deleteImage = (index: number) => {
    const deleted = images[index];
    URL.revokeObjectURL(deleted.previewUrl);
    setImages(prev => prev.filter((_, i) => i !== index));
    setConvertedImages([]);
    setZipUrl(null);
  };

  const clearAll = () => {
    images.forEach(img => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setConvertedImages([]);
    setZipUrl(null);
    setErrorMsg(null);
    setProgress(0);
  };

  const loadSample = async () => {
    setIsProcessing(true);
    setProgress(30);
    setStep('Compiling catalog graphic design sample...');
    setErrorMsg(null);
    setConvertedImages([]);
    setZipUrl(null);

    try {
      // Fetch a gorgeous sample geometric pattern placeholder from the client browser canvas
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw elegant catalog layout grid background
        ctx.fillStyle = '#faf9f6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#8c1d1a';
        ctx.fillRect(50, 50, 4, 700);

        ctx.strokeStyle = '#e6e1d5';
        ctx.lineWidth = 1;
        for (let i = 100; i < canvas.width; i += 100) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, canvas.height);
          ctx.stroke();
        }

        ctx.font = 'bold 36px Georgia, serif';
        ctx.fillStyle = '#1c1c1a';
        ctx.fillText('UTILDOC PRESS PLATFORM', 80, 110);

        ctx.font = 'italic 18px Georgia, serif';
        ctx.fillStyle = '#8c1d1a';
        ctx.fillText('Studio Editorial Conversion Catalog', 80, 145);

        ctx.fillStyle = '#1c1c1a';
        ctx.fillRect(80, 180, 1040, 2);

        // draw sample pattern circle
        ctx.beginPath();
        ctx.arc(600, 480, 150, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(140, 29, 26, 0.08)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#8c1d1a';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(600, 480, 100, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(140, 29, 26, 0.3)';
        ctx.stroke();
      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const file = new File([blob], 'UtilDoc_Editorial_Catalog_Sample.png', { type: 'image/png' });
        const previewUrl = URL.createObjectURL(file);
        
        setImages([{
          id: `sample-img-${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl,
          file,
          width: canvas.width,
          height: canvas.height
        }]);
      }
      setProgress(100);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load geometric layout sample image.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert image utilizing html5 canvas elements
  const convertImage = (imgItem: ImageFileItem): Promise<ConvertedImageItem> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const width = img.naturalWidth * (scalePercent / 100);
        const height = img.naturalHeight * (scalePercent / 100);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas 2D drawing context is unavailable.'));
          return;
        }

        // Fill white background for JPEGs
        if (targetFormat === 'jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        const formatType = targetFormat === 'png' 
          ? 'image/png' 
          : targetFormat === 'jpeg' 
            ? 'image/jpeg' 
            : 'image/webp';

        const mimeFormat = targetFormat === 'png' 
          ? 'image/png' 
          : targetFormat === 'jpeg' 
            ? 'image/jpeg' 
            : 'image/webp';

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Rasterization blob allocation failed.'));
            return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve({
                ...imgItem,
                convertedDataUrl: reader.result,
                convertedSize: blob.size,
                convertedType: mimeFormat,
                convertedWidth: width,
                convertedHeight: height
              });
            } else {
              reject(new Error('Failed to encode conversion buffer.'));
            }
          };
          reader.readAsDataURL(blob);
        }, formatType, targetFormat === 'png' ? undefined : quality);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load target image asset stream: ${imgItem.name}`));
      };
      img.src = imgItem.previewUrl;
    });
  };

  const handleConvertImages = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setProgress(10);
    setStep('Parsing catalog graphics queue...');
    setErrorMsg(null);
    setConvertedImages([]);
    setZipUrl(null);

    try {
      const results: ConvertedImageItem[] = [];
      
      for (let i = 0; i < images.length; i++) {
        const imgItem = images[i];
        const percent = Math.floor(10 + ((i / images.length) * 70));
        setProgress(percent);
        setStep(`Transcoding frame ${i + 1} of ${images.length}: ${imgItem.name}...`);
        
        const converted = await convertImage(imgItem);
        results.push(converted);
      }

      setProgress(85);
      setStep('Packaging converted assets into ZIP container...');

      const zip = new JSZip();
      for (const item of results) {
        const base64Data = item.convertedDataUrl.split(',')[1];
        const baseName = item.name.replace(/\.[^/.]+$/, "");
        const filename = `${baseName}.${targetFormat}`;
        zip.file(filename, base64Data, { base64: true });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);

      setConvertedImages(results);
      setZipUrl(url);
      SaaSDB.logActivity('IMAGE_CONVERTER');
      setProgress(100);
      setStep('Graphics conversion finalized successfully.');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during transcoding parameters.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadSingleImage = (img: ConvertedImageItem) => {
    const link = document.createElement('a');
    link.href = img.convertedDataUrl;
    const baseName = img.name.replace(/\.[^/.]+$/, "");
    link.download = `${baseName}.${targetFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (adsterraActive && adsterraLink) {
      window.open(adsterraLink, '_blank', 'noopener,noreferrer');
    }
  };

  const totalOriginalSize = images.reduce((acc, img) => acc + img.size, 0);
  const totalConvertedSize = convertedImages.reduce((acc, img) => acc + img.convertedSize, 0);
  const sizeSavings = totalOriginalSize - totalConvertedSize;
  const savingsPercent = totalOriginalSize > 0 ? (sizeSavings / totalOriginalSize) * 100 : 0;

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (zipUrl && images.length > 0) {
          const link = document.createElement('a');
          link.href = zipUrl;
          link.download = `UtilDoc_Converted_Images_${Date.now().toString().slice(-4)}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          if (adsterraActive && adsterraLink) {
            window.open(adsterraLink, '_blank', 'noopener,noreferrer');
          }
        } else if (images.length > 0 && !isProcessing && convertedImages.length === 0) {
          handleConvertImages();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zipUrl, images, isProcessing, convertedImages, targetFormat, quality, scalePercent, adsterraActive, adsterraLink]);

  return (
    <div id="image-converter-tool-container" className="max-w-4xl mx-auto px-4 py-8">
      {/* Editorial Header */}
      <div className="mb-8 border-b border-stone-200 dark:border-stone-800 pb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-sans font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-none border ${
              darkMode ? 'bg-[#2a251c] text-[#bfa15f] border-[#bfa15f]/30' : 'bg-[#f6f2eb] text-[#8c1d1a] border-[#8c1d1a]/20'
            }`}>
              Raster Utility
            </span>
          </div>
          <h1 className={`text-4xl font-serif font-medium tracking-tight italic ${
            darkMode ? 'text-stone-100' : 'text-stone-950'
          }`}>
            {toolTranslations['image-converter']?.name[activeLang] || 'Image Converter'}
          </h1>
          <p className={`text-xs font-serif leading-relaxed mt-2 max-w-xl ${
            darkMode ? 'text-stone-400' : 'text-stone-600'
          }`}>
            {toolTranslations['image-converter']?.description[activeLang] || 'Instantly convert graphics between PNG, JPEG, and WebP. Adjust quality thresholds, downscale viewport dimensions offline securely.'}
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
        /* File Dropzone */
        <div id="converter-dropzone" className="mb-8">
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
              Drag & Drop Graphics Files
            </h3>
            <p className={`text-xs font-serif leading-relaxed max-w-sm mx-auto mb-6 ${
              darkMode ? 'text-stone-500' : 'text-stone-550'
            }`}>
              Support JPG, PNG, WebP, SVG, and GIFs. No size limits.
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center gap-3">
              <button
                type="button"
                className={`px-6 py-2.5 text-xs font-sans font-bold uppercase tracking-widest transition-all ${
                  darkMode 
                    ? 'bg-[#eae7e0] text-[#121211] hover:bg-white' 
                    : 'bg-[#1c1c1a] text-[#FAF9F5] hover:bg-stone-800'
                }`}
              >
                Browse Images
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
                Load Vector Art Sample
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Core Controls layout */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (Catalog Staging) */}
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
                  Add Images
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
                  Reset All
                </button>
              </div>
            </div>

            {/* List items */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {(convertedImages.length > 0 ? convertedImages : images).map((img, idx) => {
                const isConverted = 'convertedDataUrl' in img;
                const converted = img as ConvertedImageItem;
                
                return (
                  <div 
                    key={img.id}
                    className={`p-3 border rounded-none flex items-center justify-between gap-3 ${
                      darkMode ? 'bg-[#161615] border-stone-800 hover:border-stone-700' : 'bg-[#faf9f6] border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-12 h-16 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shrink-0 overflow-hidden flex items-center justify-center">
                        <img 
                          src={isConverted ? converted.convertedDataUrl : img.previewUrl} 
                          alt={img.name} 
                          className="max-w-full max-h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-0 right-0 bg-stone-950/85 text-white font-mono text-[8px] px-1">
                          #{idx + 1}
                        </span>
                      </div>

                      <div className="min-w-0 font-serif">
                        <p className={`text-xs font-bold truncate max-w-[150px] sm:max-w-sm ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>
                          {img.name}
                        </p>
                        
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[10px] font-mono text-stone-400">
                            {formatSize(img.size)} ({img.type.split('/')[1].toUpperCase()})
                          </span>
                          
                          {isConverted && (
                            <>
                              <ArrowRight className="w-3 h-3 text-stone-400" />
                              <span className={`text-[10px] font-mono font-bold ${
                                converted.convertedSize <= img.size ? 'text-emerald-500' : 'text-amber-500'
                              }`}>
                                {formatSize(converted.convertedSize)} ({targetFormat.toUpperCase()})
                              </span>
                            </>
                          )}
                        </div>
                        
                        <p className="text-[9px] text-stone-500 font-sans mt-0.5">
                          {img.width}x{img.height} px
                          {isConverted && ` → ${converted.convertedWidth}x${converted.convertedHeight} px`}
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
                      
                      {isConverted ? (
                        <button
                          onClick={() => downloadSingleImage(converted)}
                          className={`p-1.5 border rounded-none transition-all ${
                            darkMode ? 'bg-[#bfa15f]/10 border-[#bfa15f]/30 text-[#bfa15f] hover:bg-[#bfa15f]/20' : 'bg-[#8c1d1a]/5 border-[#8c1d1a]/25 text-[#8c1d1a] hover:bg-[#8c1d1a]/10'
                          }`}
                          title="Download Converted Image"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => deleteImage(idx)}
                          className="p-1.5 border border-red-200/40 dark:border-red-950/20 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-none transition-all"
                          title="Delete Frame"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {convertedImages.length > 0 && (
              /* Conversion Performance Analytics Box */
              <div className={`p-5 border rounded-none flex flex-col sm:flex-row items-center gap-6 justify-between ${
                darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#faf9f6] border-[#e6e2d8]'
              }`}>
                <div className="space-y-1 font-serif">
                  <h4 className="text-xs font-sans font-bold uppercase tracking-wider">Rasterization Diagnostics</h4>
                  <div className="flex items-center gap-4 text-[11px] text-stone-500 flex-wrap">
                    <p>Before: <span className="font-mono">{formatSize(totalOriginalSize)}</span></p>
                    <p>After: <span className="font-mono">{formatSize(totalConvertedSize)}</span></p>
                  </div>
                </div>

                <div className={`p-3.5 border rounded-none text-center ${
                  sizeSavings >= 0 
                    ? (darkMode ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50/25 border-emerald-200 text-emerald-800')
                    : (darkMode ? 'bg-amber-500/5 border-amber-500/20 text-amber-400' : 'bg-amber-50/25 border-amber-200 text-amber-800')
                }`}>
                  <span className="text-[9px] uppercase font-sans font-bold tracking-widest block">Data Footprint</span>
                  <p className="text-sm font-mono font-bold mt-0.5">
                    {sizeSavings >= 0 ? `Saved ${formatSize(sizeSavings)} (${savingsPercent.toFixed(1)}%)` : `Added ${formatSize(Math.abs(sizeSavings))}`}
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Right Column (Controls or Success Download Box) */}
          <div className="lg:col-span-1 space-y-6">
            
            {zipUrl && convertedImages.length > 0 ? (
              /* Success ZIP Card */
              <div className={`p-5 border rounded-none space-y-4 ${
                darkMode ? 'bg-[#181817] border-[#2a2a29]' : 'bg-[#fcfbf9] border-[#e6e1d5]'
              }`}>
                <div className="flex items-center gap-3 pb-3 border-b border-stone-200 dark:border-stone-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="text-xs font-sans font-bold uppercase tracking-wider">Raster Complete</h4>
                    <p className={`text-[10px] font-serif ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
                      Converted to {targetFormat.toUpperCase()} perfectly.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 font-serif text-[11px]">
                  <p><span className="font-sans font-bold uppercase tracking-wider text-[9px] block text-stone-400 dark:text-stone-500">Staged Files</span>{images.length} items</p>
                  <p><span className="font-sans font-bold uppercase tracking-wider text-[9px] block text-stone-400 dark:text-stone-500">Format Target</span>{targetFormat.toUpperCase()}</p>
                  <p><span className="font-sans font-bold uppercase tracking-wider text-[9px] block text-stone-400 dark:text-stone-500">Scale Viewport</span>{scalePercent}% Dimension</p>
                </div>

                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = zipUrl;
                    link.download = `UtilDoc_Converted_Images_${targetFormat.toUpperCase()}.zip`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    if (adsterraActive && adsterraLink) {
                      window.open(adsterraLink, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  className={`w-full py-3 text-xs font-sans font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    darkMode 
                      ? 'bg-[#eae7e0] text-[#121211] hover:bg-white' 
                      : 'bg-[#1c1c1a] text-[#FAF9F5] hover:bg-stone-800'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Download ZIP ({formatSize(totalConvertedSize)})
                </button>

                <button
                  onClick={() => {
                    setConvertedImages([]);
                    setZipUrl(null);
                  }}
                  className={`w-full py-2.5 text-xs font-sans font-bold uppercase tracking-widest border transition-all ${
                    darkMode 
                      ? 'border-stone-800 text-stone-300 hover:bg-stone-900' 
                      : 'border-stone-300 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Change Settings
                </button>
              </div>
            ) : (
              /* Conversion Config Setup Panel */
              <div className={`p-5 rounded-none border ${
                darkMode ? 'bg-[#161615] border-[#252524]' : 'bg-[#faf9f6] border-[#e6e1d5]'
              }`}>
                <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-3 mb-4">
                  <Settings className={`w-4 h-4 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`} />
                  <h3 className="text-xs font-sans font-bold uppercase tracking-wider">Rasterization Setup</h3>
                </div>

                <div className="space-y-4">
                  {/* Target Format */}
                  <div>
                    <label className="block text-[9px] font-sans font-bold uppercase tracking-wider text-stone-400 mb-1.5">Output Format</label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: 'png', label: 'PNG', desc: 'Lossless' },
                        { id: 'jpeg', label: 'JPEG', desc: 'Compact' },
                        { id: 'webp', label: 'WebP', desc: 'Modern' }
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setTargetFormat(f.id as any)}
                          className={`py-2 px-1 border transition-all flex flex-col items-center justify-center ${
                            targetFormat === f.id
                              ? (darkMode ? 'bg-[#bfa15f] border-[#bfa15f] text-[#121211]' : 'bg-[#8c1d1a] border-[#8c1d1a] text-white')
                              : (darkMode ? 'border-stone-800 hover:bg-stone-900 text-stone-300 bg-[#121211]/20' : 'border-stone-300 hover:bg-stone-50 text-stone-600 bg-white')
                          }`}
                        >
                          <span className="text-[11px] font-sans font-bold tracking-tight uppercase block">{f.label}</span>
                          <span className="text-[8px] font-serif opacity-60">{f.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dimension Scaling */}
                  <div>
                    <label className="block text-[9px] font-sans font-bold uppercase tracking-wider text-stone-400 mb-1.5 flex justify-between items-center">
                      <span>Dimension Scale</span>
                      <span className="font-mono text-[9px] lowercase opacity-60">{scalePercent}%</span>
                    </label>
                    
                    <div className="grid grid-cols-4 gap-1 mb-2">
                      {[
                        { id: 25, label: '25%' },
                        { id: 50, label: '50%' },
                        { id: 75, label: '75%' },
                        { id: 100, label: '100%' }
                      ].map((sc) => (
                        <button
                          key={sc.id}
                          onClick={() => setScalePercent(sc.id)}
                          className={`py-1 text-[10px] font-sans font-bold border transition-all ${
                            scalePercent === sc.id
                              ? (darkMode ? 'bg-stone-800 border-stone-600 text-stone-100' : 'bg-stone-200 border-stone-300 text-stone-900')
                              : (darkMode ? 'border-stone-800 text-stone-400 bg-[#121211]/20' : 'border-stone-200 text-stone-600 bg-white')
                          }`}
                        >
                          {sc.label}
                        </button>
                      ))}
                    </div>

                    <input 
                      type="range"
                      min="10"
                      max="200"
                      value={scalePercent}
                      onChange={(e) => setScalePercent(parseInt(e.target.value, 10))}
                      className="w-full h-1 bg-stone-200 dark:bg-stone-800 accent-[#8c1d1a] dark:accent-[#bfa15f] cursor-pointer"
                    />
                  </div>

                  {/* Quality multiplier (Only for JPG/WebP) */}
                  {targetFormat !== 'png' && (
                    <div>
                      <label className="block text-[9px] font-sans font-bold uppercase tracking-wider text-stone-400 mb-1.5 flex justify-between items-center">
                        <span>Fidelity Quality</span>
                        <span className="font-mono text-[9px] lowercase opacity-60">{Math.round(quality * 100)}%</span>
                      </label>
                      <input 
                        type="range"
                        min="20"
                        max="100"
                        value={quality * 100}
                        onChange={(e) => setQuality(parseInt(e.target.value, 10) / 100)}
                        className="w-full h-1 bg-stone-200 dark:bg-stone-800 accent-[#8c1d1a] dark:accent-[#bfa15f] cursor-pointer"
                      />
                      <p className="text-[9px] font-serif text-stone-500 mt-1 leading-normal">
                        Lower quality yields substantially compact file structures. High quality keeps fine typographic density crisp.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={handleConvertImages}
                    className={`w-full py-3.5 mt-4 text-xs font-sans font-bold uppercase tracking-widest transition-all ${
                      darkMode 
                        ? 'bg-[#eae7e0] text-[#121211] hover:bg-white' 
                        : 'bg-[#1c1c1a] text-[#FAF9F5] hover:bg-stone-800'
                    }`}
                  >
                    Transcode Graphics
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Preview Modal for single Frame inspection */}
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
                src={'convertedDataUrl' in previewImage ? (previewImage as ConvertedImageItem).convertedDataUrl : previewImage.previewUrl} 
                alt={previewImage.name} 
                className="max-w-full max-h-[350px] object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-1.5 font-serif text-[11px] text-stone-500">
              <p>
                <strong className="font-sans text-[10px] uppercase text-stone-400 mr-2">Specs:</strong> 
                {previewImage.width}x{previewImage.height} px • {formatSize(previewImage.size)}
              </p>
              <p>
                <strong className="font-sans text-[10px] uppercase text-stone-400 mr-2">Encoding:</strong> 
                {previewImage.type}
              </p>
              {'convertedDataUrl' in previewImage && (
                <>
                  <p>
                    <strong className="font-sans text-[10px] uppercase text-[#8c1d1a] dark:text-[#bfa15f] mr-2">Transcoded Specs:</strong> 
                    {(previewImage as ConvertedImageItem).convertedWidth}x{(previewImage as ConvertedImageItem).convertedHeight} px • {formatSize((previewImage as ConvertedImageItem).convertedSize)}
                  </p>
                  <p>
                    <strong className="font-sans text-[10px] uppercase text-[#8c1d1a] dark:text-[#bfa15f] mr-2">Transcoded Format:</strong> 
                    {(previewImage as ConvertedImageItem).convertedType}
                  </p>
                </>
              )}
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
          <h4 className="text-xs font-sans font-bold uppercase tracking-wider">SANDBOXED SECURITY SAFEGUARD</h4>
          <p className={`text-[11px] font-serif leading-relaxed mt-1.5 ${
            darkMode ? 'text-stone-400' : 'text-stone-600'
          }`}>
            UtilDoc operates strictly in sandboxed memory space. Transcoding parameters and raster files are processed directly inside your browser. No graphics or files are ever processed, transferred, or stored on external system networks.
          </p>
        </div>
      </div>
    </div>
  );
}
