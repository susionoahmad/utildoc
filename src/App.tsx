import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import ToolGrid from './components/ToolGrid';
import MergePDFTool from './components/MergePDFTool';
import SplitPDFTool from './components/SplitPDFTool';
import CompressPDFTool from './components/CompressPDFTool';
import PDFMetadataTool from './components/PDFMetadataTool';
import RotatePDFTool from './components/RotatePDFTool';
import WatermarkPDFTool from './components/WatermarkPDFTool';
import PasswordProtectPDFTool from './components/PasswordProtectPDFTool';
import PDFToImageTool from './components/PDFToImageTool';
import ImageToPDFTool from './components/ImageToPDFTool';
import ImageConverterTool from './components/ImageConverterTool';
import OCRScanTool from './components/OCRScanTool';
import AIFixTool from './components/AIFixTool';
import SaaSAdminDashboard from './components/SaaSAdminDashboard';
import { SaaSDB } from './lib/saasDb';
import { Sparkles, Layers, ShieldCheck, Mail, GitBranch, Terminal, Lock } from 'lucide-react';
import { Language, translations } from './lib/translations';

export default function App() {
  const [currentView, setView] = useState<string>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [showShortcutsLegend, setShowShortcutsLegend] = useState<boolean>(false);
  const [adsterraLink, setAdsterraLink] = useState<string>('https://www.profitablecpmgate.com/o84mgnk2?key=38198f7df43e93657788ea12030b65f3');
  const [adsterraActive, setAdsterraActive] = useState<boolean>(true);

  // Centralized authentication states
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [userPlan, setUserPlan] = useState<string>('starter');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showSecurityProtocol, setShowSecurityProtocol] = useState<boolean>(false);
  const [showSecurityCharter, setShowSecurityCharter] = useState<boolean>(false);
  const [showChangelog, setShowChangelog] = useState<boolean>(false);

  // Language state
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('utildoc_lang') as Language) || 'id';
  });

  const changeLang = (l: Language) => {
    setLang(l);
    localStorage.setItem('utildoc_lang', l);
  };

  // Synchronize session state globally
  useEffect(() => {
    const handleSyncSession = async () => {
      const activeSession = await SaaSDB.getActiveUserSession();
      if (activeSession && activeSession.isLoggedIn) {
        setIsLoggedIn(true);
        setEmail(activeSession.email);
        setUserPlan(activeSession.plan);
        setIsAdmin(activeSession.role === 'admin');
      } else {
        setIsLoggedIn(false);
        setEmail('');
        setUserPlan('starter');
        setIsAdmin(false);
      }
    };

    handleSyncSession();
    window.addEventListener('storage', handleSyncSession);
    const interval = setInterval(handleSyncSession, 2000);

    return () => {
      window.removeEventListener('storage', handleSyncSession);
      clearInterval(interval);
    };
  }, []);

  // Sync active Adsterra config on load and view changes
  useEffect(() => {
    const fetchAdsterraConfig = async () => {
      try {
        const settings = await SaaSDB.getSettings();
        if (settings) {
          if (settings.adsterraDirectLink) {
            setAdsterraLink(settings.adsterraDirectLink);
          }
          if (settings.adsterraActive !== undefined) {
            setAdsterraActive(settings.adsterraActive);
          }
        }
      } catch (err) {
        console.error('Failed to load Adsterra config:', err);
      }
    };
    fetchAdsterraConfig();
  }, [currentView]);

  // Sync dark mode class to HTML element for full tailwind support if needed
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Handle back to top on view changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  // Listen for global Escape key and ? key for shortcuts overlay
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');

      if (e.key === 'Escape') {
        if (isInput) {
          (activeEl as HTMLElement).blur();
          return;
        }
        
        if (showShortcutsLegend) {
          setShowShortcutsLegend(false);
          return;
        }

        if (currentView !== 'dashboard') {
          setView('dashboard');
        }
      } else if (e.key === '?' && !isInput) {
        e.preventDefault();
        setShowShortcutsLegend(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentView, showShortcutsLegend]);

  const isToolBlocked = !isLoggedIn && (currentView === 'ocr-scan' || currentView === 'ai-fix');

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      darkMode ? 'bg-[#121211] text-[#eae7e0] font-sans' : 'bg-[#FAF9F5] text-[#1c1c1a] font-sans'
    }`}>
      
      {/* Primary Navigation Header */}
      <Navbar 
        currentView={currentView} 
        setView={setView} 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        adsterraLink={adsterraLink}
        adsterraActive={adsterraActive}
        isLoggedIn={isLoggedIn}
        setIsLoggedIn={setIsLoggedIn}
        email={email}
        setEmail={setEmail}
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
        userPlan={userPlan}
        setUserPlan={setUserPlan}
        showLoginModal={showLoginModal}
        setShowLoginModal={setShowLoginModal}
        lang={lang}
        changeLang={changeLang}
      />

      {/* Main Content Stage */}
      <main className="flex-grow">
        {isToolBlocked ? (
          <div className="max-w-xl mx-auto px-6 py-24 text-center">
            <div className={`w-14 h-14 rounded-none border flex items-center justify-center mx-auto mb-6 ${
              darkMode ? 'border-[#bfa15f]/25 text-[#bfa15f] bg-[#1a1610]' : 'border-[#8c1d1a]/20 text-[#8c1d1a] bg-[#fffbeb]'
            }`}>
              <Lock className="w-5 h-5 animate-pulse" />
            </div>
            <h2 className={`text-3xl font-serif font-medium mb-3 italic tracking-tight ${
              darkMode ? 'text-white' : 'text-stone-900'
            }`}>
              {translations.lock_title[lang]}
            </h2>
            <p className={`text-xs font-serif leading-relaxed mb-8 max-w-sm mx-auto ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
              {translations.lock_subtitle[lang]}
            </p>
            
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowLoginModal(true)}
                className={`px-6 py-3 text-xs font-sans font-bold uppercase tracking-widest transition-all ${
                  darkMode 
                    ? 'bg-[#eae7e0] text-[#121211] hover:bg-white' 
                    : 'bg-[#1c1c1a] text-[#FAF9F5] hover:bg-stone-800'
                }`}
              >
                {translations.lock_signin[lang]}
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`px-6 py-3 text-xs font-sans font-bold uppercase tracking-widest border transition-all ${
                  darkMode 
                    ? 'border-[#3a3a38] text-stone-300 hover:bg-[#1c1c1a]' 
                    : 'border-[#d8d4ca] text-stone-700 hover:bg-[#eae7e0]/20'
                }`}
              >
                {translations.lock_back[lang]}
              </button>
            </div>
          </div>
        ) : (
          <>
            {currentView === 'dashboard' && (
              <ToolGrid 
                darkMode={darkMode} 
                onSelectTool={(toolId) => setView(toolId)} 
                adsterraLink={adsterraLink}
                adsterraActive={adsterraActive}
                lang={lang}
              />
            )}
            {currentView === 'merge-pdf' && (
              <MergePDFTool 
                darkMode={darkMode} 
                setView={setView} 
                adsterraLink={adsterraLink}
                adsterraActive={adsterraActive}
                lang={lang}
              />
            )}
            {currentView === 'split-pdf' && (
              <SplitPDFTool 
                darkMode={darkMode} 
                setView={setView} 
                adsterraLink={adsterraLink}
                adsterraActive={adsterraActive}
                lang={lang}
              />
            )}
            {currentView === 'compress-pdf' && (
              <CompressPDFTool 
                darkMode={darkMode} 
                setView={setView} 
                adsterraLink={adsterraLink}
                adsterraActive={adsterraActive}
                lang={lang}
              />
            )}
            {currentView === 'view-metadata' && (
              <PDFMetadataTool 
                darkMode={darkMode} 
                setView={setView} 
                lang={lang}
              />
            )}
            {currentView === 'rotate-pdf' && (
              <RotatePDFTool 
                darkMode={darkMode} 
                setView={setView} 
                lang={lang}
              />
            )}
            {currentView === 'watermark-pdf' && (
              <WatermarkPDFTool 
                darkMode={darkMode} 
                setView={setView} 
                lang={lang}
              />
            )}
            {currentView === 'encrypt-pdf' && (
              <PasswordProtectPDFTool 
                darkMode={darkMode} 
                setView={setView} 
                lang={lang}
              />
            )}
            {currentView === 'pdf-to-image' && (
              <PDFToImageTool 
                darkMode={darkMode} 
                setView={setView} 
                lang={lang}
              />
            )}
            {currentView === 'image-to-pdf' && (
              <ImageToPDFTool 
                darkMode={darkMode} 
                setView={setView} 
                lang={lang}
              />
            )}
            {currentView === 'image-converter' && (
              <ImageConverterTool 
                darkMode={darkMode} 
                setView={setView} 
                lang={lang}
              />
            )}
            {currentView === 'ocr-scan' && (
              <OCRScanTool 
                darkMode={darkMode} 
                setView={setView} 
                lang={lang}
              />
            )}
            {currentView === 'ai-fix' && (
              <AIFixTool 
                darkMode={darkMode} 
                setView={setView} 
                lang={lang}
              />
            )}
            {currentView === 'saas-admin' && (
              <SaaSAdminDashboard 
                darkMode={darkMode} 
                setView={setView} 
              />
            )}

            {/* Fallback View for clicked items under construction */}
            {!['dashboard', 'merge-pdf', 'split-pdf', 'compress-pdf', 'pdf-to-image', 'image-to-pdf', 'image-converter', 'ocr-scan', 'ai-fix', 'view-metadata', 'rotate-pdf', 'watermark-pdf', 'encrypt-pdf', 'saas-admin'].includes(currentView) && (
              <div className="max-w-xl mx-auto px-6 py-24 text-center">
                <div className={`w-12 h-12 rounded-none border flex items-center justify-center mx-auto mb-6 ${
                  darkMode ? 'border-[#333331] text-[#bfa15f]/80' : 'border-[#e5e0d4] text-[#8c1d1a]'
                }`}>
                  <Terminal className="w-5 h-5 animate-pulse" />
                </div>
                <h2 className={`text-3xl font-serif font-medium mb-3 italic tracking-tight ${
                  darkMode ? 'text-white' : 'text-stone-900'
                }`}>
                  Under Editorial Review
                </h2>
                <p className={`text-xs font-serif leading-relaxed mb-8 max-w-md mx-auto ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                  The utility <span className="font-bold underline tracking-wide uppercase font-sans text-[10px]">"{currentView.replace('-', ' ')}"</span> is currently in production in our offline typesetting studio.
                </p>
                
                <div className={`p-5 rounded-none border text-left mb-8 flex items-start gap-4 ${
                  darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#fcfbf9] border-[#e6e1d5]'
                }`}>
                  <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                  <div>
                    <p className="text-[11px] font-sans font-bold uppercase tracking-wider">Typesetting Staging Active</p>
                    <p className={`text-[11px] font-serif leading-normal mt-1.5 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                      Our production-grade <strong className="font-sans">Merge PDF</strong>, <strong className="font-sans">Split PDF</strong>, and <strong className="font-sans">Compress PDF</strong> layouts are fully typeset and operational.
                    </p>
                  </div>
                </div>

                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setView('dashboard')}
                    className={`px-6 py-2 text-xs font-sans font-bold uppercase tracking-widest transition-all ${
                      darkMode 
                        ? 'bg-[#eae7e0] text-[#121211] hover:bg-[#eae7e0]/90' 
                        : 'bg-[#1c1c1a] text-[#FAF9F5] hover:bg-[#1c1c1a]/90'
                    }`}
                  >
                    Go Back
                  </button>
                  <button
                    onClick={() => setView('merge-pdf')}
                    className={`px-6 py-2 text-xs font-sans font-bold uppercase tracking-widest border transition-all ${
                      darkMode 
                        ? 'border-[#3a3a38] text-stone-300 hover:bg-[#1c1c1a]' 
                        : 'border-[#d8d4ca] text-stone-700 hover:bg-[#eae7e0]/20'
                    }`}
                  >
                    Try Merge
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Global Application Footer */}
      <footer className={`border-t py-16 transition-colors duration-200 ${
        darkMode ? 'bg-[#0d0d0d] border-[#20201f] text-stone-400' : 'bg-[#FAF9F5] border-[#eae6db] text-stone-600'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 border-b pb-12 border-dashed border-[#e6e2d8] dark:border-[#2a2a29]">
            
            {/* Column 1 Logo */}
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-2">
                <div className={`p-1 border ${darkMode ? 'border-[#333331] text-[#bfa15f]' : 'border-[#d8d4ca] text-[#8c1d1a]'}`}>
                  <Layers className="w-4 h-4" />
                </div>
                <span className={`font-serif text-lg font-bold tracking-tight ${darkMode ? 'text-white' : 'text-stone-900'}`}>
                  Util<span className="italic font-normal">Doc</span>
                </span>
              </div>
              <p className="text-xs font-serif leading-relaxed max-w-sm">
                {translations.footer_desc[lang]}
              </p>
              <div className="flex items-center gap-1.5 text-[9px] font-mono tracking-widest uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-stone-400 dark:bg-stone-500"></span>
                <span>{translations.footer_status[lang]}</span>
              </div>
            </div>

            {/* Column 2 Services */}
            <div>
              <h4 className={`text-xs font-sans font-bold uppercase tracking-widest mb-6 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`}>
                {lang === 'en' ? 'Core Utilities' : 'Utilitas Utama'}
              </h4>
              <ul className="space-y-3 text-xs font-serif">
                <li><button onClick={() => setView('merge-pdf')} className="hover:underline hover:text-stone-900 dark:hover:text-white transition-colors">{lang === 'en' ? 'Merge PDF Documents' : 'Gabung Dokumen PDF'}</button></li>
                <li><button onClick={() => setView('split-pdf')} className="hover:underline hover:text-stone-900 dark:hover:text-white transition-colors">{lang === 'en' ? 'Split PDF Pages' : 'Pisah Halaman PDF'}</button></li>
                <li><button onClick={() => setView('compress-pdf')} className="hover:underline hover:text-stone-900 dark:hover:text-white transition-colors">{lang === 'en' ? 'Compress PDF Stream' : 'Kompres Stream PDF'}</button></li>
                <li><button onClick={() => setView('view-metadata')} className="hover:underline hover:text-stone-900 dark:hover:text-white transition-colors">{lang === 'en' ? 'View PDF Metadata' : 'Lihat Metadata PDF'}</button></li>
                <li><button onClick={() => setView('rotate-pdf')} className="hover:underline hover:text-stone-900 dark:hover:text-white transition-colors">{lang === 'en' ? 'Rotate PDF Pages' : 'Putar Halaman PDF'}</button></li>
                <li><button onClick={() => setView('watermark-pdf')} className="hover:underline hover:text-stone-900 dark:hover:text-white transition-colors">{lang === 'en' ? 'PDF Watermark Board' : 'Papan Watermark PDF'}</button></li>
                <li><button onClick={() => setView('encrypt-pdf')} className="hover:underline hover:text-stone-900 dark:hover:text-white transition-colors">{lang === 'en' ? 'Secure / Encrypt PDF' : 'Amankan / Enkripsi PDF'}</button></li>
                {adsterraActive && (
                  <li>
                    <a 
                      href={adsterraLink} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="hover:underline text-[#bfa15f] dark:text-[#bfa15f] hover:text-[#bfa15f]/80 transition-colors font-sans font-bold flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3 animate-pulse" /> {translations.nav_sponsor[lang]}
                    </a>
                  </li>
                )}
              </ul>
            </div>

            {/* Column 3 Privacy */}
            <div className="space-y-4">
              <h4 className={`text-xs font-sans font-bold uppercase tracking-widest mb-6 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`}>
                {translations.footer_security_title[lang]}
              </h4>
              <div className={`p-4 rounded-none border flex items-start gap-3 ${
                darkMode ? 'bg-[#141413] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#eae6db]'
              }`}>
                <ShieldCheck className={`w-5 h-5 shrink-0 mt-0.5 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                <p className="text-[11px] font-serif leading-normal">
                  {translations.footer_security_desc[lang]}
                </p>
              </div>
            </div>

          </div>

          {/* Bottom Copyright line */}
          <div className="mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-serif text-stone-500">
            <p>© {new Date().getFullYear()} UtilDoc Studio. {translations.footer_copyright[lang]}</p>
            <div className="flex items-center gap-4 font-sans text-[10px] tracking-wider uppercase">
              <button onClick={() => setShowSecurityProtocol(true)} className="hover:underline uppercase tracking-wider text-[10px] font-sans">{translations.footer_protocol[lang]}</button>
              <span>•</span>
              <button onClick={() => setShowSecurityCharter(true)} className="hover:underline uppercase tracking-wider text-[10px] font-sans">{translations.footer_charter[lang]}</button>
              <span>•</span>
              <button onClick={() => setShowChangelog(true)} className="hover:underline uppercase tracking-wider text-[10px] font-sans flex items-center gap-1">
                <GitBranch className="w-3 h-3" /> v4.2-Editorial
              </button>
            </div>
          </div>

        </div>
      </footer>

      {/* Global Keyboard Shortcut Helper Badge */}
      {currentView !== 'dashboard' && currentView !== 'pricing' && (
        <div 
          onClick={() => setShowShortcutsLegend(true)}
          className="fixed bottom-6 right-6 z-40 hidden md:block cursor-pointer group"
          title={translations.kb_badge_title[lang]}
        >
          <div className={`px-3 py-1.5 text-[10px] font-sans font-bold tracking-wider uppercase border flex items-center gap-3 shadow-xl select-none transition-all duration-200 group-hover:scale-105 ${
            darkMode 
              ? 'bg-[#181817] border-[#2c2c2a] text-[#bfa15f]/90 group-hover:border-[#bfa15f]/40 group-hover:text-[#bfa15f]' 
              : 'bg-[#FAF9F5] border-[#e6e2d8] text-[#8c1d1a]/90 group-hover:border-[#8c1d1a]/40 group-hover:text-[#8c1d1a]'
          }`}>
            <span className="flex items-center gap-1">
              <kbd className={`px-1 py-0.5 border text-[8px] font-mono leading-none rounded-sm ${darkMode ? 'bg-stone-900 border-stone-800 text-stone-300' : 'bg-stone-100 border-stone-300 text-stone-600'}`}>Ctrl+S</kbd> {translations.kb_save[lang]}
            </span>
            <span className={`w-1 h-1 rounded-full ${darkMode ? 'bg-stone-800' : 'bg-stone-300'}`} />
            <span className="flex items-center gap-1">
              <kbd className={`px-1 py-0.5 border text-[8px] font-mono leading-none rounded-sm ${darkMode ? 'bg-stone-900 border-stone-800 text-stone-300' : 'bg-stone-100 border-stone-300 text-stone-600'}`}>Esc</kbd> {translations.kb_close[lang]}
            </span>
            <span className={`w-1 h-1 rounded-full ${darkMode ? 'bg-stone-800' : 'bg-stone-300'}`} />
            <span className={`font-mono text-[9px] ${darkMode ? 'text-stone-500' : 'text-stone-400'}`}>[?] {translations.kb_keys[lang]}</span>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Legend Panel Overlay */}
      {showShortcutsLegend && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowShortcutsLegend(false)}
        >
          <div 
            className={`w-full max-w-lg p-8 border rounded-none shadow-2xl space-y-6 ${
              darkMode ? 'bg-[#181817] border-[#2c2c2a] text-[#eae7e0]' : 'bg-[#FAF9F5] border-[#eae6db] text-[#1c1c1a]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-dashed pb-4 border-[#e6e2d8] dark:border-[#2a2a29]">
              <div className="flex items-center gap-2">
                <Terminal className={`w-4 h-4 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                <h3 className="text-sm font-sans font-bold uppercase tracking-wider">{translations.kb_title[lang]}</h3>
              </div>
              <button 
                onClick={() => setShowShortcutsLegend(false)}
                className="text-xs font-mono hover:underline uppercase tracking-wider opacity-60"
              >
                {translations.kb_close_panel[lang]}
              </button>
            </div>

            <div className="space-y-5 text-xs font-serif">
              <div className="space-y-3">
                <h4 className="text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400">{translations.kb_global[lang]}</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>{translations.kb_close_desc[lang]}</span>
                    <kbd className={`px-1.5 py-0.5 border text-[10px] font-mono rounded ${darkMode ? 'bg-stone-950 border-stone-800 text-stone-300' : 'bg-stone-50 border-stone-300 text-stone-600'}`}>Esc</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>{translations.kb_toggle_desc[lang]}</span>
                    <kbd className={`px-1.5 py-0.5 border text-[10px] font-mono rounded ${darkMode ? 'bg-stone-950 border-stone-800 text-stone-300' : 'bg-stone-50 border-stone-300 text-stone-600'}`}>?</kbd>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-sans font-bold uppercase tracking-widest text-stone-400">{translations.kb_contextual[lang]} (<kbd className="font-mono">Ctrl+S</kbd> / <kbd className="font-mono">Cmd+S</kbd>)</h4>
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-2">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[11px] leading-relaxed"><strong className="font-sans font-bold tracking-tight uppercase text-[9px] block text-stone-400">Merge, Split, Compress PDF</strong>{translations.kb_merge_split_desc[lang]}</span>
                    <kbd className={`shrink-0 px-1.5 py-0.5 border text-[10px] font-mono rounded ${darkMode ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-300'}`}>Ctrl+S</kbd>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[11px] leading-relaxed"><strong className="font-sans font-bold tracking-tight uppercase text-[9px] block text-stone-400">Rotate or Watermark PDF</strong>{translations.kb_rotate_watermark_desc[lang]}</span>
                    <kbd className={`shrink-0 px-1.5 py-0.5 border text-[10px] font-mono rounded ${darkMode ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-300'}`}>Ctrl+S</kbd>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[11px] leading-relaxed"><strong className="font-sans font-bold tracking-tight uppercase text-[9px] block text-stone-400">PDF to Image / Image Converter</strong>{translations.kb_raster_desc[lang]}</span>
                    <kbd className={`shrink-0 px-1.5 py-0.5 border text-[10px] font-mono rounded ${darkMode ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-300'}`}>Ctrl+S</kbd>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[11px] leading-relaxed"><strong className="font-sans font-bold tracking-tight uppercase text-[9px] block text-stone-400">Image to PDF Compiler</strong>{translations.kb_image_to_pdf_desc[lang]}</span>
                    <kbd className={`shrink-0 px-1.5 py-0.5 border text-[10px] font-mono rounded ${darkMode ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-300'}`}>Ctrl+S</kbd>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[11px] leading-relaxed"><strong className="font-sans font-bold tracking-tight uppercase text-[9px] block text-stone-400">AI OCR Scan & Text Fix</strong>{translations.kb_ai_desc[lang]}</span>
                    <kbd className={`shrink-0 px-1.5 py-0.5 border text-[10px] font-mono rounded ${darkMode ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-300'}`}>Ctrl+S</kbd>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-[11px] leading-relaxed"><strong className="font-sans font-bold tracking-tight uppercase text-[9px] block text-stone-400">PDF Metadata Dictionary</strong>{translations.kb_metadata_desc[lang]}</span>
                    <kbd className={`shrink-0 px-1.5 py-0.5 border text-[10px] font-mono rounded ${darkMode ? 'bg-stone-950 border-stone-800' : 'bg-stone-50 border-stone-300'}`}>Ctrl+S</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className={`pt-4 border-t border-dashed text-[10px] font-mono text-center flex items-center justify-center gap-1.5 ${darkMode ? 'border-stone-800 text-stone-500' : 'border-[#e6e2d8] text-stone-400'}`}>
              <Terminal className="w-3.5 h-3.5" />
              <span>{translations.kb_studio_footer[lang]}</span>
            </div>
          </div>
        </div>
      )}

      {/* Security Protocol Modal Overlay */}
      {showSecurityProtocol && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowSecurityProtocol(false)}
        >
          <div 
            className={`w-full max-w-lg p-8 border rounded-none shadow-2xl space-y-6 ${
              darkMode ? 'bg-[#181817] border-[#2c2c2a] text-[#eae7e0]' : 'bg-[#FAF9F5] border-[#eae6db] text-[#1c1c1a]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-dashed pb-4 border-[#e6e2d8] dark:border-[#2a2a29]">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                <h3 className="text-sm font-sans font-bold uppercase tracking-wider">{translations.sp_title[lang]}</h3>
              </div>
              <button 
                onClick={() => setShowSecurityProtocol(false)}
                className="text-xs font-mono hover:underline uppercase tracking-wider opacity-60"
              >
                {translations.kb_close_panel[lang]}
              </button>
            </div>

            <div className="space-y-4 text-xs font-serif leading-relaxed">
              <p className="font-bold text-stone-400 uppercase tracking-widest text-[9px] font-sans">
                {translations.sp_subtitle[lang]}
              </p>
              <p>{translations.sp_p1[lang]}</p>
              <p>{translations.sp_p2[lang]}</p>
              <p>{translations.sp_p3[lang]}</p>
            </div>

            <div className={`pt-4 border-t border-dashed text-[10px] font-mono text-center flex items-center justify-center gap-1.5 ${darkMode ? 'border-stone-800 text-stone-500' : 'border-[#e6e2d8] text-stone-400'}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>UtilDoc Studio • Secure Sandbox Protocol</span>
            </div>
          </div>
        </div>
      )}

      {/* Security Charter Modal Overlay */}
      {showSecurityCharter && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowSecurityCharter(false)}
        >
          <div 
            className={`w-full max-w-lg p-8 border rounded-none shadow-2xl space-y-6 ${
              darkMode ? 'bg-[#181817] border-[#2c2c2a] text-[#eae7e0]' : 'bg-[#FAF9F5] border-[#eae6db] text-[#1c1c1a]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-dashed pb-4 border-[#e6e2d8] dark:border-[#2a2a29]">
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-4 h-4 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                <h3 className="text-sm font-sans font-bold uppercase tracking-wider">{translations.sc_title[lang]}</h3>
              </div>
              <button 
                onClick={() => setShowSecurityCharter(false)}
                className="text-xs font-mono hover:underline uppercase tracking-wider opacity-60"
              >
                {translations.kb_close_panel[lang]}
              </button>
            </div>

            <div className="space-y-4 text-xs font-serif leading-relaxed">
              <p className="font-bold text-stone-400 uppercase tracking-widest text-[9px] font-sans">
                {translations.sc_subtitle[lang]}
              </p>
              <p>{translations.sc_p1[lang]}</p>
              <p>{translations.sc_p2[lang]}</p>
              <p>{translations.sc_p3[lang]}</p>
            </div>

            <div className={`pt-4 border-t border-dashed text-[10px] font-mono text-center flex items-center justify-center gap-1.5 ${darkMode ? 'border-stone-800 text-stone-500' : 'border-[#e6e2d8] text-stone-400'}`}>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>UtilDoc Studio • Privacy First Design</span>
            </div>
          </div>
        </div>
      )}

      {/* Changelog Modal Overlay */}
      {showChangelog && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowChangelog(false)}
        >
          <div 
            className={`w-full max-w-lg p-8 border rounded-none shadow-2xl space-y-6 ${
              darkMode ? 'bg-[#181817] border-[#2c2c2a] text-[#eae7e0]' : 'bg-[#FAF9F5] border-[#eae6db] text-[#1c1c1a]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-dashed pb-4 border-[#e6e2d8] dark:border-[#2a2a29]">
              <div className="flex items-center gap-2">
                <GitBranch className={`w-4 h-4 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'}`} />
                <h3 className="text-sm font-sans font-bold uppercase tracking-wider">{translations.cl_title[lang]}</h3>
              </div>
              <button 
                onClick={() => setShowChangelog(false)}
                className="text-xs font-mono hover:underline uppercase tracking-wider opacity-60"
              >
                {translations.kb_close_panel[lang]}
              </button>
            </div>

            <div className="space-y-4 text-xs font-serif leading-relaxed">
              <p className="font-bold text-stone-400 uppercase tracking-widest text-[9px] font-sans">
                {translations.cl_subtitle[lang]}
              </p>
              <ul className="space-y-3 list-disc list-inside">
                <li>{translations.cl_i1[lang]}</li>
                <li>{translations.cl_i2[lang]}</li>
                <li>{translations.cl_i3[lang]}</li>
                <li>{translations.cl_i4[lang]}</li>
              </ul>
            </div>

            <div className={`pt-4 border-t border-dashed text-[10px] font-mono text-center flex items-center justify-center gap-1.5 ${darkMode ? 'border-stone-800 text-stone-500' : 'border-[#e6e2d8] text-stone-400'}`}>
              <GitBranch className="w-3.5 h-3.5" />
              <span>UtilDoc Studio • Production Release Channel</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
