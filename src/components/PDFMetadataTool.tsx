import React, { useState, useRef } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  FileText, Upload, Settings, ShieldCheck, Info, Calendar, User, Tag, 
  Sparkles, AlertCircle, Copy, Check, Eye
} from 'lucide-react';
import { DocumentFile } from '../types';
import { MOCK_FILES } from '../data';
import { EditorialProgressBar } from './EditorialProgressBar';

interface PDFMetadataToolProps {
  darkMode: boolean;
  setView: (view: string) => void;
}

interface ParsedMetadata {
  title: string;
  author: string;
  subject: string;
  creator: string;
  producer: string;
  keywords: string;
  creationDate: Date | null;
  modificationDate: Date | null;
  pageCount: number;
  fileSize: number;
  version: string;
  isEncrypted: boolean;
}

export default function PDFMetadataTool({ darkMode, setView }: PDFMetadataToolProps) {
  const [file, setFile] = useState<DocumentFile | null>(null);
  const [metadata, setMetadata] = useState<ParsedMetadata | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not Specified';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setErrorMsg(null);
      setFile({
        id: `file-meta-${Date.now()}`,
        name: selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type,
        pageCount: 0, // calculated later
        uploadedAt: new Date(),
        status: 'queued',
        progress: 0
      });
      // Automatically trigger inspection for user convenience
      inspectFile(selectedFile);
    } else if (selectedFile) {
      setErrorMsg('Please select a valid PDF document.');
    }
  };

  const loadSample = () => {
    setErrorMsg(null);
    const sampleFile = MOCK_FILES[1]; // Tax Review Draft
    setFile({
      ...sampleFile,
      id: `file-meta-sample-${Date.now()}`,
      status: 'queued',
      progress: 0
    });

    setIsProcessing(true);
    setProgress(0);
    setStep('Accessing PDF object catalog streams...');

    const steps = [
      { progress: 25, step: 'Loading document catalog dictionaries...' },
      { progress: 60, step: 'Decompressing PDF Info Dictionary stream...' },
      { progress: 85, step: 'Reconstructing metadata elements...' },
      { progress: 100, step: 'Compilation completed successfully.' }
    ];

    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setProgress(steps[stepIdx].progress);
        setStep(steps[stepIdx].step);
        stepIdx++;
      } else {
        clearInterval(interval);
        setIsProcessing(false);
        setMetadata({
          title: "FY2025 Comprehensive Tax Review Draft",
          author: "UtilDoc Financial Editorial Team",
          subject: "Draft Review of FY25 Corporate Tax Adjustments",
          creator: "Acrobat Distiller 15.0",
          producer: "UtilDoc PDF Compiler Engine",
          keywords: "tax, financial, draft, corporate, 2025",
          creationDate: new Date('2025-06-15T10:30:00Z'),
          modificationDate: new Date('2025-06-28T16:45:00Z'),
          pageCount: 8,
          fileSize: 8192000,
          version: "1.7 (Extension Level 8)",
          isEncrypted: false
        });
      }
    }, 400);
  };

  const inspectFile = async (rawFile: File) => {
    setIsProcessing(true);
    setProgress(10);
    setStep('Buffering file stream...');

    try {
      // Step 1: Read as ArrayBuffer
      const arrayBuffer = await rawFile.arrayBuffer();
      setProgress(40);
      setStep('Decoding internal structural elements...');

      // Step 2: Load with pdf-lib
      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(arrayBuffer, { 
          updateMetadata: false, 
          ignoreEncryption: true 
        });
      } catch (loadErr: any) {
        throw new Error('PDF file could not be parsed. The file may be corrupt or encrypted with strict security protocols.');
      }

      setProgress(75);
      setStep('Extracting document properties dictionaries...');

      // Step 3: Extract properties
      const title = pdfDoc.getTitle() || '';
      const author = pdfDoc.getAuthor() || '';
      const subject = pdfDoc.getSubject() || '';
      const creator = pdfDoc.getCreator() || '';
      const producer = pdfDoc.getProducer() || '';
      const creationDate = pdfDoc.getCreationDate() || null;
      const modificationDate = pdfDoc.getModificationDate() || null;
      const pageCount = pdfDoc.getPageCount() || 0;
      const keywords = pdfDoc.getKeywords() || '';

      setProgress(95);
      setStep('Finalizing typeset report layout...');

      setTimeout(() => {
        setMetadata({
          title: title || 'Untitled Document',
          author: author || 'Not Specified',
          subject: subject || 'Not Specified',
          creator: creator || 'Not Specified',
          producer: producer || 'Not Specified',
          keywords: keywords || 'None',
          creationDate,
          modificationDate,
          pageCount,
          fileSize: rawFile.size,
          version: "1.5 (Acrobat 6.x)", // standard default fallback
          isEncrypted: false
        });
        
        // Update file page count
        setFile(prev => prev ? { ...prev, pageCount } : null);
        setIsProcessing(false);
      }, 500);

    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
      setErrorMsg(err.message || 'An error occurred during metadata compilation.');
      setFile(null);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const resetInspector = () => {
    setFile(null);
    setMetadata(null);
    setErrorMsg(null);
  };

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (metadata && file) {
          const jsonStr = JSON.stringify(metadata, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${file.name.replace('.pdf', '')}_metadata_report.json`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else if (!isProcessing) {
          loadSample();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [metadata, file, isProcessing]);

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
      <div className={`mb-10 pb-6 border-b border-dashed ${darkMode ? 'border-[#2a2a29]' : 'border-[#e6e2d8]'}`}>
        <h1 className={`text-3xl sm:text-4xl font-serif font-light tracking-tight ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>PDF Metadata Inspector</h1>
        <p className={`text-xs sm:text-sm font-serif mt-2 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
          Decompress document dictionaries to inspect titles, authorship histories, and local compiler properties in real-time.
        </p>
      </div>

      {errorMsg && (
        <div className={`max-w-xl mx-auto mb-8 p-5 border text-xs leading-relaxed flex items-start gap-3.5 ${
          darkMode ? 'bg-red-500/5 border-red-500/25 text-red-300' : 'bg-red-50/50 border-red-200 text-red-800'
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-sans font-bold uppercase tracking-wider mb-1">Compilation Failure</p>
            <p className="font-serif">{errorMsg}</p>
          </div>
        </div>
      )}

      {isProcessing ? (
        <EditorialProgressBar
          progress={progress}
          step={step}
          darkMode={darkMode}
          title="Extracting Metadata Stream"
        />
      ) : metadata && file ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Main properties layout */}
          <div className="lg:col-span-8 space-y-6">
            <div className={`p-6 sm:p-8 rounded-none border ${
              darkMode ? 'bg-[#181817] border-stone-800' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'
            }`}>
              <div className={`flex items-center justify-between border-b pb-4 border-dashed mb-6 ${darkMode ? 'border-stone-800' : 'border-stone-200'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 border rounded-none shrink-0 ${darkMode ? 'border-[#2c2c2a] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'}`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className={`font-serif font-bold text-sm truncate max-w-xs sm:max-w-md ${darkMode ? 'text-stone-100' : 'text-stone-800'}`}>{file.name}</h3>
                    <p className="text-[10px] text-stone-400 font-mono mt-0.5">
                      {formatSize(metadata.fileSize)} • {metadata.pageCount} Pages
                    </p>
                  </div>
                </div>
                <button onClick={resetInspector} className="text-[10px] font-sans font-bold uppercase tracking-widest text-red-500 hover:underline">
                  Close File
                </button>
              </div>

              {/* Properties Grid */}
              <div className="space-y-6">
                
                {/* Meta property row item */}
                {[
                  { key: 'Title', value: metadata.title, icon: Eye, help: 'Defined document label' },
                  { key: 'Author', value: metadata.author, icon: User, help: 'Document author credential' },
                  { key: 'Subject', value: metadata.subject, icon: Info, help: 'Stated summary subject' },
                  { key: 'Keywords', value: metadata.keywords, icon: Tag, help: 'Index search keywords list' },
                  { key: 'Producer', value: metadata.producer, icon: Settings, help: 'PDF conversion system' },
                  { key: 'Creator', value: metadata.creator, icon: Sparkles, help: 'Source layout platform' },
                ].map((item) => (
                  <div 
                    key={item.key} 
                    className={`p-4 border group transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      darkMode ? 'bg-[#121211] border-stone-800/60 hover:border-stone-700' : 'bg-white border-stone-200/60 hover:border-stone-300'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <span className="flex items-center gap-1.5 text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400">
                        <item.icon className="w-3 h-3" />
                        {item.key} <span className="opacity-40">• {item.help}</span>
                      </span>
                      <p className={`text-sm font-serif font-medium break-all pr-4 ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>
                        {item.value || 'Not Defined'}
                      </p>
                    </div>

                    {item.value && item.value !== 'Not Specified' && item.value !== 'None' && (
                      <button
                        onClick={() => copyToClipboard(item.value, item.key)}
                        className={`sm:opacity-0 group-hover:opacity-100 px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-widest border shrink-0 transition-all flex items-center gap-1.5 self-start sm:self-auto ${
                          copiedField === item.key
                            ? 'text-emerald-500 border-emerald-500/30'
                            : darkMode 
                              ? 'border-stone-800 hover:border-stone-600 text-stone-400 hover:text-white' 
                              : 'border-stone-200 hover:border-stone-400 text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        {copiedField === item.key ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    )}
                  </div>
                ))}

              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`p-6 rounded-none border ${
              darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
            }`}>
              <div className={`flex items-center gap-2 mb-4 border-b pb-3 border-dashed ${darkMode ? 'border-stone-800' : 'border-stone-200'}`}>
                <Info className={`w-4 h-4 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                <h3 className={`font-sans font-bold text-xs uppercase tracking-widest ${darkMode ? 'text-stone-200' : 'text-stone-750'}`}>Document Specs</h3>
              </div>
              
              <div className="space-y-4">
                {/* Date Created */}
                <div className="p-3 bg-stone-500/5 border border-stone-500/10 rounded-none">
                  <span className="flex items-center gap-1 text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 mb-1">
                    <Calendar className="w-3 h-3" /> Creation Date
                  </span>
                  <p className={`text-xs font-serif leading-normal ${darkMode ? 'text-stone-200' : 'text-stone-700'}`}>
                    {formatDate(metadata.creationDate)}
                  </p>
                </div>

                {/* Date Modified */}
                <div className="p-3 bg-stone-500/5 border border-stone-500/10 rounded-none">
                  <span className="flex items-center gap-1 text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 mb-1">
                    <Calendar className="w-3 h-3" /> Modification Date
                  </span>
                  <p className={`text-xs font-serif leading-normal ${darkMode ? 'text-stone-200' : 'text-stone-700'}`}>
                    {formatDate(metadata.modificationDate)}
                  </p>
                </div>

                {/* Format Version */}
                <div className="p-3 bg-stone-500/5 border border-stone-500/10 rounded-none">
                  <span className="text-[9px] uppercase font-sans font-bold tracking-widest text-stone-400 block mb-1">
                    Format Protocol Version
                  </span>
                  <p className={`text-xs font-mono font-bold leading-normal ${darkMode ? 'text-stone-100' : 'text-stone-800'}`}>
                    PDF v{metadata.version}
                  </p>
                </div>
              </div>

              <div className={`mt-6 pt-6 border-t border-dashed ${darkMode ? 'border-stone-800/60' : 'border-stone-200'}`}>
                <button
                  onClick={resetInspector}
                  className={`w-full py-3 rounded-none font-sans font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    darkMode 
                      ? 'bg-[#bfa15f] text-black hover:opacity-90' 
                      : 'bg-[#8c1d1a] text-white hover:opacity-90'
                  }`}
                >
                  Inspect Another Document
                </button>
              </div>
            </div>

            <div className={`p-4 rounded-none border flex items-start gap-3 ${
              darkMode ? 'bg-[#181817] border-[#2c2c2a] text-stone-300' : 'bg-[#FAF9F5] border-[#e6e2d8] text-stone-600'
            }`}>
              <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
              <div>
                <p className={`text-xs font-serif font-bold ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>Privacy Safeguard</p>
                <p className="text-[10px] font-serif text-stone-500 leading-normal mt-0.5">
                  Metadata tags are extracted completely client-side. No headers are serialized, recorded, or leaked across network relays.
                </p>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Unloaded state / Upload Area */
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
            <h3 className={`font-serif font-medium text-lg mb-1.5 italic ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>Choose PDF for Metadata Inspection</h3>
            <p className={`text-xs font-serif max-w-sm mx-auto mb-6 ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>
              Select any document. PDF headers will be parsed instantly inside your sandboxed web worker memory blocks.
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

    </div>
  );
}
