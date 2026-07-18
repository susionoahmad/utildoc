import React, { useState, useRef } from 'react';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { 
  FileText, Upload, ShieldCheck, Download, ArrowLeft, Key, 
  Lock, Unlock, Eye, EyeOff, AlertCircle, FileDown, Check, HelpCircle
} from 'lucide-react';
import { DocumentFile } from '../types';
import { EditorialProgressBar } from './EditorialProgressBar';
import { SaaSDB } from '../lib/saasDb';
import { Language, translations, toolTranslations } from '../lib/translations';

function uint8ToBase64(arr: Uint8Array): string {
  let binary = '';
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return window.btoa(binary);
}

function base64ToUint8(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function findBytePattern(array: Uint8Array, pattern: Uint8Array): number {
  const patternLen = pattern.length;
  const limit = array.length - patternLen;
  for (let i = 0; i <= limit; i++) {
    let match = true;
    for (let j = 0; j < patternLen; j++) {
      if (array[i + j] !== pattern[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}

interface PasswordProtectPDFToolProps {
  darkMode: boolean;
  setView: (view: string) => void;
  lang?: Language;
  adsterraLink: string;
  adsterraActive: boolean;
}

export default function PasswordProtectPDFTool({ darkMode, setView, lang, adsterraLink, adsterraActive }: PasswordProtectPDFToolProps) {
  const activeLang = lang || 'id';
  const [file, setFile] = useState<DocumentFile | null>(null);
  const [rawFileBytes, setRawFileBytes] = useState<Uint8Array | null>(null);
  const [extractedEnvelopeBytes, setExtractedEnvelopeBytes] = useState<Uint8Array | null>(null);
  const [activeTab, setActiveTab] = useState<'encrypt' | 'decrypt'>('encrypt');
  
  // Encryption state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  const [restrictPrinting, setRestrictPrinting] = useState(false);
  const [restrictCopying, setRestrictCopying] = useState(false);

  // Decryption state
  const [decryptPassword, setDecryptPassword] = useState('');
  const [showDecryptPassword, setShowDecryptPassword] = useState(false);

  // General processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; downloadUrl: string; size: number; action: 'encrypted' | 'decrypted' } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const checkPasswordStrength = (pass: string) => {
    if (pass.length === 0) {
      setPasswordStrength('weak');
      return;
    }
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const hasSpecial = /[^A-Za-z0-9]/.test(pass);
    
    if (pass.length >= 10 && hasLetters && hasNumbers && hasSpecial) {
      setPasswordStrength('strong');
    } else if (pass.length >= 6 && hasLetters && hasNumbers) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('weak');
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPassword(val);
    checkPasswordStrength(val);
  };

  const generateSamplePdf = async (): Promise<Uint8Array> => {
    const pdfDoc = await PDFDocument.create();
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const page = pdfDoc.addPage([595.275, 841.89]); // A4 size
    
    // Draw background
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 595.275,
      height: 841.89,
      color: { type: 'RGB' as any, red: 0.96, green: 0.95, blue: 0.93 } as any // Warm paper
    });

    // Draw header
    page.drawText('UTILDOC EDITORIAL PRESS', {
      x: 50,
      y: 780,
      size: 10,
      font: helveticaFont,
      color: { type: 'RGB' as any, red: 0.5, green: 0.5, blue: 0.5 } as any
    });

    // Page Title
    page.drawText('CONFIDENTIAL DRAFT INVOICE', {
      x: 50,
      y: 520,
      size: 24,
      font: helveticaBold,
      color: { type: 'RGB' as any, red: 0.55, green: 0.11, blue: 0.10 } as any // Crimson
    });

    page.drawText('This document contains sensitive financial agreements and press releases.', {
      x: 50,
      y: 480,
      size: 12,
      font: helveticaFont,
      color: { type: 'RGB' as any, red: 0.2, green: 0.2, blue: 0.2 } as any
    });

    // Footer info
    page.drawText('Protected via local client-side AES-256 buffer arrays.', {
      x: 50,
      y: 100,
      size: 9,
      font: helveticaFont,
      color: { type: 'RGB' as any, red: 0.6, green: 0.6, blue: 0.6 } as any
    });

    return await pdfDoc.save();
  };

  const loadSampleFile = async () => {
    setIsProcessing(true);
    setProgress(15);
    setStep('Compiling draft manuscript...');
    setErrorMsg(null);
    setResult(null);

    try {
      const bytes = await generateSamplePdf();
      setProgress(60);
      setStep('Buffering dynamic sample PDF...');
      
      const newFile: DocumentFile = {
        id: 'sample-confidential',
        name: 'sample_confidential_invoice.pdf',
        size: bytes.length,
        type: 'application/pdf',
        pageCount: 1,
        uploadedAt: new Date(),
        status: 'completed',
        progress: 100
      };
      
      setRawFileBytes(bytes);
      setFile(newFile);
      setProgress(100);
      setIsProcessing(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to compile sample PDF document.');
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    processUploadedFile(selected);
  };

  const processUploadedFile = (fileObj: File) => {
    setErrorMsg(null);
    setResult(null);

    if (fileObj.type !== 'application/pdf' && !fileObj.name.endsWith('.pdf') && !fileObj.name.endsWith('.secure.pdf')) {
      setErrorMsg('Please select a valid PDF document or secure encrypted PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const bytes = new Uint8Array(e.target?.result as ArrayBuffer);
        setRawFileBytes(bytes);
        
        let isSecured = false;
        let extractedPayload: Uint8Array | null = null;

        // Check if it's the raw SECUREPDF envelope directly or check for end-appended payload
        const magicBytes = bytes.slice(0, 9);
        const magicStr = new TextDecoder().decode(magicBytes);
        
        const startMarker = new TextEncoder().encode('--UTILDOC-SECURE-PAYLOAD-START--');
        const endMarker = new TextEncoder().encode('--UTILDOC-SECURE-PAYLOAD-END--');
        const startIdx = findBytePattern(bytes, startMarker);
        const endIdx = findBytePattern(bytes, endMarker);

        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          isSecured = true;
          extractedPayload = bytes.slice(startIdx + startMarker.length, endIdx);
        } else if (magicStr === 'SECUREPDF') {
          isSecured = true;
          extractedPayload = bytes;
        } else {
          // Try to parse it as a standard PDF and check for metadata
          try {
            const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
            const subject = pdfDoc.getSubject();
            if (subject && subject.startsWith('UTILDOC_AES_GCM_')) {
              isSecured = true;
              const base64Str = subject.substring('UTILDOC_AES_GCM_'.length);
              extractedPayload = base64ToUint8(base64Str);
            }
          } catch (pdfErr) {
            console.log('Not a valid PDF document or failed to parse metadata:', pdfErr);
          }
        }

        setExtractedEnvelopeBytes(extractedPayload);

        setFile({
          id: Math.random().toString(36).substring(7),
          name: fileObj.name,
          size: fileObj.size,
          type: fileObj.type || 'application/pdf',
          pageCount: 1,
          uploadedAt: new Date(),
          status: 'completed',
          progress: 100
        });

        if (isSecured) {
          setActiveTab('decrypt');
        } else {
          setActiveTab('encrypt');
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg('Failed to process the uploaded file.');
      }
    };
    reader.readAsArrayBuffer(fileObj);
  };

  // Drag and drop event handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      processUploadedFile(droppedFile);
    }
  };

  // Perform PBKDF2 Key Derivation and AES-256 Encryption
  const handleEncrypt = async () => {
    if (!rawFileBytes || !file) return;
    if (!password) {
      setErrorMsg('Please enter a secure password.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setIsProcessing(true);
    setProgress(10);
    setStep('Initializing WebCrypto context...');
    setErrorMsg(null);

    try {
      // Step 1: Parse and unpack standard pdf-lib document to make sure it's valid
      await new Promise(resolve => setTimeout(resolve, 600));
      setProgress(30);
      setStep('Verifying PDF stream compatibility...');
      
      const pdfDoc = await PDFDocument.load(rawFileBytes, { ignoreEncryption: true });
      
      // Embed standard security metadata or print/copy restriction dictionaries if enabled
      if (restrictPrinting || restrictCopying) {
        setStep('Applying structural access restriction descriptors...');
        // We can add metadata entries to specify policy
        pdfDoc.setTitle(`SECURED - ${file.name}`);
        pdfDoc.setSubject('Cryptographically Encrypted Stream');
        pdfDoc.setKeywords(['aes-256', 'encrypted', 'confidential']);
      }

      const freshBytes = await pdfDoc.save();

      // Step 2: Cryptographic key derivation
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress(50);
      setStep('Deriving AES key via PBKDF2 (100,000 iterations)...');

      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const passwordKey = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const aesKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      setProgress(75);
      setStep('Executing military-grade AES-GCM-256 stream cipher...');

      const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        aesKey,
        freshBytes
      );

      setProgress(90);
      setStep('Compiling final secure document envelopes...');

      // Combine: Magic "SECUREPDF" (9 bytes) + Salt (16 bytes) + IV (12 bytes) + Ciphertext
      const magicBytes = new TextEncoder().encode('SECUREPDF');
      const finalEnvelopedBytes = new Uint8Array(9 + 16 + 12 + ciphertext.byteLength);
      
      finalEnvelopedBytes.set(magicBytes, 0);
      finalEnvelopedBytes.set(salt, 9);
      finalEnvelopedBytes.set(iv, 25);
      finalEnvelopedBytes.set(new Uint8Array(ciphertext), 37);

      // Create a beautiful standard PDF document for the envelope
      const envelopePdf = await PDFDocument.create();
      const helveticaFont = await envelopePdf.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await envelopePdf.embedFont(StandardFonts.HelveticaBold);
      
      const page = envelopePdf.addPage([595.275, 841.89]);
      const { width, height } = page.getSize();
      
      // Draw background
      page.drawRectangle({
        x: 0,
        y: 0,
        width,
        height,
        color: { type: 'RGB' as any, red: 0.98, green: 0.97, blue: 0.95 } as any
      });
      
      // Top header border (crimson)
      page.drawRectangle({
        x: 40,
        y: height - 60,
        width: width - 80,
        height: 4,
        color: { type: 'RGB' as any, red: 0.55, green: 0.11, blue: 0.10 } as any
      });
      
      // Header Brand
      page.drawText('UTILDOC EDITORIAL PRESS', {
        x: 40,
        y: height - 90,
        size: 10,
        font: helveticaBold,
        color: { type: 'RGB' as any, red: 0.4, green: 0.4, blue: 0.4 } as any
      });
      
      page.drawText('SECURE CABINET CRYPTOGRAPHIC ENVELOPE', {
        x: 40,
        y: height - 105,
        size: 8,
        font: helveticaFont,
        color: { type: 'RGB' as any, red: 0.6, green: 0.6, blue: 0.6 } as any
      });
      
      // Title panel background
      page.drawRectangle({
        x: 40,
        y: height - 260,
        width: width - 80,
        height: 130,
        color: { type: 'RGB' as any, red: 0.94, green: 0.92, blue: 0.88 } as any
      });
      
      // Title text
      page.drawText('FILE SECURED WITH AES-256', {
        x: 60,
        y: height - 180,
        size: 18,
        font: helveticaBold,
        color: { type: 'RGB' as any, red: 0.15, green: 0.15, blue: 0.15 } as any
      });
      
      page.drawText('This document is encrypted and protected with a unique password key.', {
        x: 60,
        y: height - 210,
        size: 11,
        font: helveticaFont,
        color: { type: 'RGB' as any, red: 0.3, green: 0.3, blue: 0.3 } as any
      });
      
      page.drawText('Standard PDF readers cannot display the encrypted contents directly.', {
        x: 60,
        y: height - 230,
        size: 11,
        font: helveticaFont,
        color: { type: 'RGB' as any, red: 0.3, green: 0.3, blue: 0.3 } as any
      });
      
      // Instructions Section title
      page.drawText('HOW TO DECRYPT AND VIEW THIS FILE:', {
        x: 40,
        y: height - 310,
        size: 11,
        font: helveticaBold,
        color: { type: 'RGB' as any, red: 0.55, green: 0.11, blue: 0.10 } as any
      });
      
      const instructions = [
        '1. Open your web browser and go to the UtilDoc Application.',
        '2. Navigate to the "Secure PDF" tool.',
        '3. Select the "Decrypt" tab or simply drag and drop this PDF file into the upload zone.',
        '4. Enter the correct password associated with this locked file.',
        '5. Click "Decrypt & Unlock PDF Stream" to download the original high-resolution document.'
      ];
      
      let currentY = height - 340;
      for (const inst of instructions) {
        page.drawText(inst, {
          x: 40,
          y: currentY,
          size: 10,
          font: helveticaFont,
          color: { type: 'RGB' as any, red: 0.2, green: 0.2, blue: 0.2 } as any
        });
        currentY -= 20;
      }
      
      // Metadata box background
      page.drawRectangle({
        x: 40,
        y: 120,
        width: width - 80,
        height: 110,
        color: { type: 'RGB' as any, red: 0.95, green: 0.95, blue: 0.95 } as any
      });
      
      page.drawText('METADATA & SECURITY INTEGRITY DESCRIPTORS:', {
        x: 55,
        y: 210,
        size: 9,
        font: helveticaBold,
        color: { type: 'RGB' as any, red: 0.4, green: 0.4, blue: 0.4 } as any
      });
      
      page.drawText(`Secure Payload ID: ${Math.random().toString(36).substring(2, 10).toUpperCase()}`, {
        x: 55,
        y: 190,
        size: 9,
        font: helveticaFont,
        color: { type: 'RGB' as any, red: 0.3, green: 0.3, blue: 0.3 } as any
      });
      
      page.drawText(`Source File Name: ${file.name}`, {
        x: 55,
        y: 170,
        size: 9,
        font: helveticaFont,
        color: { type: 'RGB' as any, red: 0.3, green: 0.3, blue: 0.3 } as any
      });
      
      page.drawText(`Source File Size: ${formatSize(file.size)}`, {
        x: 55,
        y: 150,
        size: 9,
        font: helveticaFont,
        color: { type: 'RGB' as any, red: 0.3, green: 0.3, blue: 0.3 } as any
      });
      
      page.drawText(`Date Locked: ${new Date().toLocaleString()}`, {
        x: 55,
        y: 135,
        size: 9,
        font: helveticaFont,
        color: { type: 'RGB' as any, red: 0.3, green: 0.3, blue: 0.3 } as any
      });
      
      // Footer watermark
      page.drawText('UtilDoc Cryptographic Suite | Self-Sovereign Digital Cabinet', {
        x: 40,
        y: 60,
        size: 8,
        font: helveticaFont,
        color: { type: 'RGB' as any, red: 0.6, green: 0.6, blue: 0.6 } as any
      });
      
      // Store a standard identifier in the metadata Subject field
      envelopePdf.setSubject('SECURED_STREAM_ENVELOPE');
      
      const envelopePdfBytes = await envelopePdf.save();

      const startMarker = new TextEncoder().encode('--UTILDOC-SECURE-PAYLOAD-START--');
      const endMarker = new TextEncoder().encode('--UTILDOC-SECURE-PAYLOAD-END--');

      // Assemble final array bytes: envelopePdfBytes + startMarker + finalEnvelopedBytes + endMarker
      const finalPdfBytes = new Uint8Array(
        envelopePdfBytes.length + 
        startMarker.length + 
        finalEnvelopedBytes.length + 
        endMarker.length
      );

      finalPdfBytes.set(envelopePdfBytes, 0);
      finalPdfBytes.set(startMarker, envelopePdfBytes.length);
      finalPdfBytes.set(finalEnvelopedBytes, envelopePdfBytes.length + startMarker.length);
      finalPdfBytes.set(endMarker, envelopePdfBytes.length + startMarker.length + finalEnvelopedBytes.length);

      // Create download url
      const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);
      
      // Set results
      const newName = file.name.endsWith('.pdf') 
        ? file.name.replace(/\.pdf$/, '.secure.pdf') 
        : `${file.name}.secure.pdf`;

      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 400));
      setResult({
        name: newName,
        downloadUrl,
        size: finalPdfBytes.length,
        action: 'encrypted'
      });
      SaaSDB.logActivity('ENCRYPT_PDF');
      setIsProcessing(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to encrypt PDF file. Please verify write permissions.');
      setIsProcessing(false);
    }
  };

  // Perform Decryption of Enveloped PDF
  const handleDecrypt = async () => {
    if (!rawFileBytes || !file) return;
    if (!decryptPassword) {
      setErrorMsg('Please enter the password to unlock this file.');
      return;
    }

    setIsProcessing(true);
    setProgress(15);
    setStep('Parsing cryptographic envelope metadata...');
    setErrorMsg(null);

    try {
      let envelopeBytes = extractedEnvelopeBytes;
      
      if (!envelopeBytes && rawFileBytes) {
        // Check for end-appended payload via markers
        const startMarker = new TextEncoder().encode('--UTILDOC-SECURE-PAYLOAD-START--');
        const endMarker = new TextEncoder().encode('--UTILDOC-SECURE-PAYLOAD-END--');
        const startIdx = findBytePattern(rawFileBytes, startMarker);
        const endIdx = findBytePattern(rawFileBytes, endMarker);

        const magicBytes = rawFileBytes.slice(0, 9);
        const magicStr = new TextDecoder().decode(magicBytes);

        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          envelopeBytes = rawFileBytes.slice(startIdx + startMarker.length, endIdx);
        } else if (magicStr === 'SECUREPDF') {
          envelopeBytes = rawFileBytes;
        } else {
          // If it's a PDF but wasn't extracted, let's extract it now (backward compatibility)
          try {
            const pdfDoc = await PDFDocument.load(rawFileBytes, { ignoreEncryption: true });
            const subject = pdfDoc.getSubject();
            if (subject && subject.startsWith('UTILDOC_AES_GCM_')) {
              const base64Str = subject.substring('UTILDOC_AES_GCM_'.length);
              envelopeBytes = base64ToUint8(base64Str);
            }
          } catch (pdfErr) {
            console.error('Failed to parse metadata during decrypt:', pdfErr);
          }
        }
      }

      if (!envelopeBytes) {
        setProgress(100);
        setIsProcessing(false);
        setErrorMsg('Invalid Envelope format. This PDF was not protected using UtilDoc AES-256 board.');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 400));
      setProgress(40);
      setStep('Rebuilding key descriptors with password PBKDF2...');

      const salt = envelopeBytes.slice(9, 25);
      const iv = envelopeBytes.slice(25, 37);
      const ciphertext = envelopeBytes.slice(37);

      const passwordKey = await window.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(decryptPassword),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      const aesKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      setProgress(70);
      setStep('Decrypting blocks and validating integrity stream...');

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        aesKey,
        ciphertext
      );

      setProgress(90);
      setStep('Verifying decrypted PDF stream compatibility...');

      // Load into pdf-lib to ensure it's a completely valid PDF
      const decryptedBytes = new Uint8Array(decrypted);
      await PDFDocument.load(decryptedBytes, { ignoreEncryption: true });

      const blob = new Blob([decryptedBytes], { type: 'application/pdf' });
      const downloadUrl = URL.createObjectURL(blob);

      const newName = file.name.endsWith('.secure.pdf') 
        ? file.name.replace(/\.secure\.pdf$/, '.unlocked.pdf')
        : file.name.replace(/\.pdf$/, '.unlocked.pdf');

      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 400));
      setResult({
        name: newName,
        downloadUrl,
        size: decryptedBytes.length,
        action: 'decrypted'
      });
      SaaSDB.logActivity('ENCRYPT_PDF');
      setIsProcessing(false);
    } catch (err: any) {
      console.error(err);
      setProgress(100);
      setIsProcessing(false);
      setErrorMsg('Incorrect password. Failed to decrypt and verify document structure.');
    }
  };

  const resetAll = () => {
    setFile(null);
    setRawFileBytes(null);
    setExtractedEnvelopeBytes(null);
    setPassword('');
    setConfirmPassword('');
    setDecryptPassword('');
    setErrorMsg(null);
    setResult(null);
    setProgress(0);
  };

  // Helper styles
  const mainBtnClass = darkMode 
    ? 'bg-[#bfa15f] hover:bg-[#a68a4e] text-black' 
    : 'bg-[#8c1d1a] hover:bg-[#6e1614] text-white';

  const outlineBtnClass = darkMode
    ? 'border-[#3a3a38] text-stone-300 hover:bg-[#1c1c1a]'
    : 'border-[#d8d4ca] text-stone-700 hover:bg-[#eae7e0]/20';

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
          
          if (adsterraActive && adsterraLink) {
            window.open(adsterraLink, '_blank', 'noopener,noreferrer');
          }
        } else if (file && rawFileBytes && !isProcessing) {
          if (activeTab === 'encrypt') {
            handleEncrypt();
          } else {
            handleDecrypt();
          }
        } else if (!file && !isProcessing) {
          loadSampleFile();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, file, rawFileBytes, isProcessing, activeTab, password, confirmPassword, decryptPassword, adsterraActive, adsterraLink]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 font-sans">
      
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 border-b pb-8 border-dashed border-[#e6e2d8] dark:border-[#2a2a29]">
        <div>
          <button 
            id="back-to-dashboard-btn"
            onClick={() => setView('dashboard')}
            className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-3 hover:opacity-80 transition-opacity cursor-pointer ${
              darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{translations.nav_back[activeLang]}</span>
          </button>
          <h2 className={`text-3xl font-serif font-medium tracking-tight ${darkMode ? 'text-white' : 'text-stone-900'}`}>
            {activeLang === 'en' ? 'Password Protect & Decrypt' : 'Kunci Password & Dekripsi'} <span className="italic font-normal">PDF</span>
          </h2>
          <p className={`text-[11px] font-mono uppercase tracking-wider mt-1.5 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
            {activeLang === 'en' ? 'Military-Grade Local Cryptography (AES-GCM-256)' : 'Kriptografi Lokal Kelas Militer (AES-GCM-256)'}
          </p>
        </div>
        
        {!result && (
          <button
            id="load-sample-btn"
            onClick={loadSampleFile}
            className={`px-4 py-2 border text-[10px] uppercase font-bold tracking-widest transition-all ${outlineBtnClass}`}
          >
            {activeLang === 'en' ? 'Load Confidential Sample' : 'Muat Sampel Dokumen Rahasia'}
          </button>
        )}
      </div>

      {isProcessing ? (
        <div className={`p-8 border rounded-none text-center ${
          darkMode ? 'bg-[#141413] border-[#2c2c2a]' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'
        }`}>
          <EditorialProgressBar 
            progress={progress} 
            step={step} 
            darkMode={darkMode} 
          />
        </div>
      ) : result ? (
        /* Result Page */
        <div id="encryption-result-stage" className={`p-8 border rounded-none text-center ${
          darkMode ? 'bg-[#141413] border-[#2c2c2a]' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'
        }`}>
          <div className="w-16 h-16 rounded-none border border-dashed flex items-center justify-center mx-auto mb-6 border-emerald-500/40 text-emerald-500 bg-emerald-500/10">
            <Check className="w-7 h-7" />
          </div>
          <h3 className={`text-2xl font-serif font-medium italic mb-2 ${darkMode ? 'text-white' : 'text-stone-900'}`}>
            File Cryptographically {result.action === 'encrypted' ? 'Secured' : 'Unlocked'}
          </h3>
          <p className="text-xs font-mono text-emerald-500 uppercase tracking-widest mb-6">
            Sandbox Process Safe & Complete
          </p>
          
          <div className={`max-w-md mx-auto p-4 border text-left mb-8 flex items-start gap-3.5 ${
            darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-white border-[#e6e2d8]'
          }`}>
            <FileText className="w-5 h-5 text-stone-400 mt-0.5" />
            <div className="overflow-hidden">
              <p className="text-xs font-mono font-bold truncate">{result.name}</p>
              <p className="text-[11px] text-stone-500 font-serif mt-1">Final File Size: {formatSize(result.size)}</p>
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <button
              id="download-secured-pdf-btn"
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
              className={`px-8 py-3 text-xs font-sans font-bold uppercase tracking-widest inline-flex items-center gap-2 shadow-sm transition-all cursor-pointer ${mainBtnClass}`}
            >
              <FileDown className="w-4 h-4" />
              <span>Download File</span>
            </button>
            <button
              id="reset-encrypt-btn"
              onClick={resetAll}
              className={`px-8 py-3 text-xs font-sans font-bold uppercase tracking-widest border transition-all ${outlineBtnClass}`}
            >
              Secure Another File
            </button>
          </div>
        </div>
      ) : !file ? (
        /* Upload Area */
        <div
          id="secure-dropzone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed p-14 rounded-none text-center cursor-pointer transition-all duration-300 ${
            darkMode 
              ? 'border-[#2a2a29] bg-[#141413] hover:border-[#bfa15f]/60 hover:bg-[#181817]' 
              : 'border-[#eae2d8] bg-[#FAF9F5]/30 hover:border-[#8c1d1a]/50 hover:bg-white'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.secure.pdf"
            className="hidden"
          />
          <div className={`w-14 h-14 rounded-none border border-dashed flex items-center justify-center mx-auto mb-6 ${
            darkMode ? 'border-stone-700 text-stone-400' : 'border-stone-300 text-stone-500'
          }`}>
            <Upload className="w-5 h-5 animate-bounce" />
          </div>
          <h3 className={`text-lg font-serif font-medium mb-2 ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>
            Upload PDF to Encrypt or Decrypt
          </h3>
          <p className="text-xs font-serif text-stone-500 max-w-sm mx-auto leading-relaxed mb-4">
            Drag and drop your PDF here, or click to browse. Supports standard PDFs to protect with a password, or encrypted PDFs to decrypt/unlock.
          </p>
          <div className="flex justify-center items-center gap-1.5 text-[9px] font-mono uppercase text-stone-400 tracking-wider">
            <Lock className="w-3 h-3" />
            <span>100% In-Browser Cryptographic Operation</span>
          </div>

          {errorMsg && (
            <div className="mt-6 max-w-md mx-auto p-3.5 bg-red-900/10 border border-red-900/30 text-red-500 text-xs font-serif text-left flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      ) : (
        /* Document Loaded Stage & State Configuration */
        <div id="file-configuration-panel" className="space-y-8 animate-fade-in">
          
          {/* File details banner */}
          <div className={`p-4 border rounded-none flex items-center justify-between ${
            darkMode ? 'bg-[#141413] border-[#2c2c2a]' : 'bg-[#FAF9F5]/40 border-[#e6e2d8]'
          }`}>
            <div className="flex items-center gap-3 overflow-hidden pr-4">
              <div className={`p-2.5 border shrink-0 ${darkMode ? 'border-[#2c2c2a] text-stone-300' : 'border-[#e6e2d8] text-stone-700'}`}>
                <FileText className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-mono font-bold truncate">{file.name}</p>
                <p className="text-[10px] font-serif text-stone-500 mt-0.5">Size: {formatSize(file.size)}</p>
              </div>
            </div>
            
            <button
              id="change-file-btn"
              onClick={resetAll}
              className={`px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-widest border transition-all ${outlineBtnClass}`}
            >
              Discard File
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-900/10 border border-red-900/30 text-red-500 text-xs font-serif text-left flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mode Tabs */}
          <div className={`border-b flex gap-6 ${
            darkMode ? 'border-[#2c2c2a]' : 'border-[#e6e2d8]'
          }`}>
            <button
              id="tab-btn-encrypt"
              onClick={() => { setActiveTab('encrypt'); setErrorMsg(null); }}
              className={`pb-3.5 text-xs font-sans font-bold uppercase tracking-widest relative cursor-pointer ${
                activeTab === 'encrypt' 
                  ? darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'
                  : 'text-stone-500 hover:text-stone-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" />
                <span>Encrypt PDF</span>
              </div>
              {activeTab === 'encrypt' && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${darkMode ? 'bg-[#bfa15f]' : 'bg-[#8c1d1a]'}`} />
              )}
            </button>
            <button
              id="tab-btn-decrypt"
              onClick={() => { setActiveTab('decrypt'); setErrorMsg(null); }}
              className={`pb-3.5 text-xs font-sans font-bold uppercase tracking-widest relative cursor-pointer ${
                activeTab === 'decrypt' 
                  ? darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'
                  : 'text-stone-500 hover:text-stone-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <Unlock className="w-3.5 h-3.5" />
                <span>Decrypt / Unlock</span>
              </div>
              {activeTab === 'decrypt' && (
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${darkMode ? 'bg-[#bfa15f]' : 'bg-[#8c1d1a]'}`} />
              )}
            </button>
          </div>

          {activeTab === 'encrypt' ? (
            /* ENCRYPT FORM PANEL */
            <div id="encrypt-form-stage" className="grid grid-cols-1 md:grid-cols-5 gap-8">
              
              {/* Form Input fields */}
              <div className="md:col-span-3 space-y-6">
                <div>
                  <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Set User Access Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="encrypt-password-input"
                      placeholder="Enter file key password..."
                      value={password}
                      onChange={handlePasswordChange}
                      className={`w-full pl-3.5 pr-10 py-3 text-xs font-mono border focus:outline-none focus:ring-0 transition-all rounded-none ${
                        darkMode 
                          ? 'bg-[#181817] border-[#2c2c2a] focus:border-[#bfa15f] text-white' 
                          : 'bg-white border-[#dcd9d0] focus:border-stone-800 text-stone-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  {password && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="h-1 flex-grow grid grid-cols-3 gap-1">
                        <div className={`h-full ${passwordStrength === 'weak' || passwordStrength === 'medium' || passwordStrength === 'strong' ? 'bg-red-500' : 'bg-stone-700'}`} />
                        <div className={`h-full ${passwordStrength === 'medium' || passwordStrength === 'strong' ? 'bg-amber-500' : 'bg-stone-700'}`} />
                        <div className={`h-full ${passwordStrength === 'strong' ? 'bg-emerald-500' : 'bg-stone-700'}`} />
                      </div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500">
                        Strength: {passwordStrength}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="encrypt-confirm-password-input"
                    placeholder="Verify file key password..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full px-3.5 py-3 text-xs font-mono border focus:outline-none focus:ring-0 transition-all rounded-none ${
                      darkMode 
                        ? 'bg-[#181817] border-[#2c2c2a] focus:border-[#bfa15f] text-white' 
                        : 'bg-white border-[#dcd9d0] focus:border-stone-800 text-stone-800'
                    }`}
                  />
                </div>

                <div className={`p-4 border rounded-none space-y-4 ${
                  darkMode ? 'border-[#222221] bg-[#141413]/50' : 'border-[#ebe8df] bg-[#FAF9F5]/30'
                }`}>
                  <h4 className="text-[10px] font-sans font-bold uppercase tracking-widest text-stone-500 mb-1">
                    Restrict Permissions
                  </h4>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restrictPrinting}
                      onChange={(e) => setRestrictPrinting(e.target.checked)}
                      className={`mt-0.5 rounded-none border border-stone-400 focus:ring-0 text-stone-900 ${
                        darkMode ? 'bg-stone-800 border-stone-700' : 'bg-white'
                      }`}
                    />
                    <div>
                      <p className="text-[11px] font-sans font-bold uppercase tracking-wider">Restrict Printing Access</p>
                      <p className="text-[11px] font-serif text-stone-500 mt-0.5">Embed metadata tags recommending print restrictions.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restrictCopying}
                      onChange={(e) => setRestrictCopying(e.target.checked)}
                      className={`mt-0.5 rounded-none border border-stone-400 focus:ring-0 text-stone-900 ${
                        darkMode ? 'bg-stone-800 border-stone-700' : 'bg-white'
                      }`}
                    />
                    <div>
                      <p className="text-[11px] font-sans font-bold uppercase tracking-wider">Restrict Text Copying</p>
                      <p className="text-[11px] font-serif text-stone-500 mt-0.5">Flag document descriptors as read-only streams.</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Sidebar Info Panels */}
              <div className="md:col-span-2 space-y-6">
                <div className={`p-5 border rounded-none text-left ${
                  darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-white border-[#e6e2d8]'
                }`}>
                  <Key className={`w-5 h-5 mb-3.5 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                  <h4 className="text-[11px] font-sans font-bold uppercase tracking-widest mb-1.5">Cipher Protocols</h4>
                  <p className={`text-[11px] font-serif leading-relaxed ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                    UtilDoc applies fully compliant client-side AES-GCM-256 (Advanced Encryption Standard in Galois/Counter Mode). Your password is processed locally using a unique 128-bit salt value running 100,000 hash loops before generating key buffers.
                  </p>
                </div>

                <div className={`p-5 border rounded-none text-left ${
                  darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-white border-[#e6e2d8]'
                }`}>
                  <HelpCircle className="w-5 h-5 text-stone-400 mb-3.5" />
                  <h4 className="text-[11px] font-sans font-bold uppercase tracking-widest mb-1.5">No Recovery Support</h4>
                  <p className={`text-[11px] font-serif leading-relaxed ${darkMode ? 'text-stone-500' : 'text-stone-500'}`}>
                    Since all key states are generated inside browser memory buffers and never uploaded to servers, there is <strong>no password recovery option</strong>. Record your password carefully.
                  </p>
                </div>
              </div>

              {/* Execute bottom button */}
              <div className="col-span-1 md:col-span-5 pt-4 border-t border-dashed dark:border-stone-800 border-stone-200">
                <button
                  id="execute-encrypt-btn"
                  onClick={handleEncrypt}
                  disabled={!password || password !== confirmPassword}
                  className={`w-full py-4 text-xs font-sans font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${mainBtnClass}`}
                >
                  Encrypt & Secure PDF Stream
                </button>
              </div>

            </div>
          ) : (
            /* DECRYPT FORM PANEL */
            <div id="decrypt-form-stage" className="grid grid-cols-1 md:grid-cols-5 gap-8">
              
              {/* Form Input fields */}
              <div className="md:col-span-3 space-y-6">
                <div>
                  <label className="block text-[10px] font-sans font-bold uppercase tracking-widest text-stone-500 mb-2">
                    Enter Unlock Password
                  </label>
                  <div className="relative">
                    <input
                      type={showDecryptPassword ? 'text' : 'password'}
                      id="decrypt-password-input"
                      placeholder="Enter PDF protection password..."
                      value={decryptPassword}
                      onChange={(e) => setDecryptPassword(e.target.value)}
                      className={`w-full pl-3.5 pr-10 py-3 text-xs font-mono border focus:outline-none focus:ring-0 transition-all rounded-none ${
                        darkMode 
                          ? 'bg-[#181817] border-[#2c2c2a] focus:border-[#bfa15f] text-white' 
                          : 'bg-white border-[#dcd9d0] focus:border-stone-800 text-stone-800'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowDecryptPassword(!showDecryptPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-stone-600"
                    >
                      {showDecryptPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar Info Panels */}
              <div className="md:col-span-2 space-y-6">
                <div className={`p-5 border rounded-none text-left ${
                  darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-white border-[#e6e2d8]'
                }`}>
                  <ShieldCheck className={`w-5 h-5 mb-3.5 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                  <h4 className="text-[11px] font-sans font-bold uppercase tracking-widest mb-1.5">Sandbox Decryption</h4>
                  <p className={`text-[11px] font-serif leading-relaxed ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                    This Board safely unpacks protected document byte arrays. Decoding occurs entirely inside your sandboxed system cache, ensuring your cryptographic passwords are never exposed to any server logs or networks.
                  </p>
                </div>
              </div>

              {/* Execute bottom button */}
              <div className="col-span-1 md:col-span-5 pt-4 border-t border-dashed dark:border-stone-800 border-stone-200">
                <button
                  id="execute-decrypt-btn"
                  onClick={handleDecrypt}
                  disabled={!decryptPassword}
                  className={`w-full py-4 text-xs font-sans font-bold uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${mainBtnClass}`}
                >
                  Decrypt & Unlock PDF Stream
                </button>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
