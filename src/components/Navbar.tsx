import React, { useState } from 'react';
import { Sun, Moon, Layers, ShieldCheck, HelpCircle, LogIn, Sparkles, LogOut, CheckCircle2, Server } from 'lucide-react';
import { SaaSDB } from '../lib/saasDb';

interface NavbarProps {
  currentView: string;
  setView: (view: string) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  adsterraLink: string;
  adsterraActive: boolean;
}

export default function Navbar({ currentView, setView, darkMode, setDarkMode, adsterraLink, adsterraActive }: NavbarProps) {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [userPlan, setUserPlan] = useState<string>('starter');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');

  // Synchronize with SaaS DB Active Session
  React.useEffect(() => {
    const handleSyncSession = async () => {
      const activeSession = await SaaSDB.getActiveUserSession();
      if (activeSession && activeSession.isLoggedIn) {
        setIsLoggedIn(true);
        setEmail(activeSession.email);
        setUserPlan(activeSession.plan);
      } else {
        setIsLoggedIn(false);
        setUserPlan('starter');
      }
    };

    handleSyncSession();
    
    // Periodically sync user subscription tier in case they upgraded via pricing plans
    window.addEventListener('storage', handleSyncSession);
    const interval = setInterval(handleSyncSession, 2000); // Poll server changes too

    return () => {
      window.removeEventListener('storage', handleSyncSession);
      clearInterval(interval);
    };
  }, [currentView]);

  // Close modal on Escape key press
  React.useEffect(() => {
    if (!showLoginModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowLoginModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showLoginModal]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setLoginError('Please enter both email and password.');
      return;
    }
    setLoginError('');
    try {
      setSuccessMsg('Authenticating...');
      const session = await SaaSDB.login(email, password);
      setIsLoggedIn(true);
      setUserPlan(session.plan);
      setSuccessMsg('Logged in successfully!');
      
      setTimeout(() => {
        setShowLoginModal(false);
        setSuccessMsg('');
      }, 1000);
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed. Please verify credentials.');
      setSuccessMsg('');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setLoginError('Please enter your name, email, and password.');
      return;
    }
    if (password.length < 6) {
      setLoginError('Password must be at least 6 characters.');
      return;
    }
    setLoginError('');
    try {
      setSuccessMsg('Creating account...');
      const session = await SaaSDB.register(email, password, name);
      setIsLoggedIn(true);
      setUserPlan(session.plan);
      setSuccessMsg('Registered & Logged in successfully!');
      
      setTimeout(() => {
        setShowLoginModal(false);
        setSuccessMsg('');
        setIsSignUp(false);
        setName('');
      }, 1000);
    } catch (err: any) {
      setLoginError(err.message || 'Registration failed.');
      setSuccessMsg('');
    }
  };

  const handleLogout = async () => {
    try {
      await SaaSDB.logout();
    } catch (e) {
      console.error(e);
    }
    setIsLoggedIn(false);
    setEmail('');
    setPassword('');
    setUserPlan('starter');
    if (currentView === 'saas-admin') {
      setView('dashboard');
    }
  };

  return (
    <>
      <header className={`sticky top-0 z-40 border-b transition-colors duration-200 ${
        darkMode ? 'bg-[#121211]/90 border-[#2c2c2a] text-[#eae7e0]' : 'bg-[#FAF9F5]/90 border-[#e6e2d8] text-[#1c1c1a]'
      } backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo Section */}
            <div 
              onClick={() => setView('dashboard')} 
              className="flex items-center gap-2.5 cursor-pointer group"
              id="nav-logo"
            >
              <div className={`p-1.5 border transition-all duration-300 ${
                darkMode ? 'border-[#333331] text-[#bfa15f]' : 'border-[#d8d4ca] text-[#8c1d1a]'
              }`}>
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="font-serif font-bold text-lg tracking-tight">Util<span className="italic font-normal">Doc</span></span>
                <p className={`text-[8px] tracking-widest uppercase font-sans font-bold ${
                  darkMode ? 'text-stone-500' : 'text-stone-400'
                }`}>local typesetting</p>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-2">
              <button
                id="nav-btn-all"
                onClick={() => setView('dashboard')}
                className={`px-3 py-1 font-sans font-bold uppercase tracking-wider text-[11px] transition-all duration-150 ${
                  currentView === 'dashboard'
                    ? darkMode ? 'text-[#bfa15f] border-b border-[#bfa15f]' : 'text-[#8c1d1a] border-b border-[#8c1d1a]'
                    : darkMode ? 'text-stone-400 hover:text-stone-100' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Tools
              </button>
              <button
                id="nav-btn-merge"
                onClick={() => setView('merge-pdf')}
                className={`px-3 py-1 font-sans font-bold uppercase tracking-wider text-[11px] transition-all duration-150 ${
                  currentView === 'merge-pdf'
                    ? darkMode ? 'text-[#bfa15f] border-b border-[#bfa15f]' : 'text-[#8c1d1a] border-b border-[#8c1d1a]'
                    : darkMode ? 'text-stone-400 hover:text-stone-100' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Merge PDF
              </button>
              <button
                id="nav-btn-secure"
                onClick={() => setView('encrypt-pdf')}
                className={`px-3 py-1 font-sans font-bold uppercase tracking-wider text-[11px] transition-all duration-150 ${
                  currentView === 'encrypt-pdf'
                    ? darkMode ? 'text-[#bfa15f] border-b border-[#bfa15f]' : 'text-[#8c1d1a] border-b border-[#8c1d1a]'
                    : darkMode ? 'text-stone-400 hover:text-stone-100' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Secure PDF
              </button>
              {adsterraActive && (
                <a
                  id="nav-btn-sponsor"
                  href={adsterraLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 font-sans font-bold uppercase tracking-wider text-[11px] text-[#bfa15f] hover:text-[#bfa15f]/80 dark:text-[#bfa15f] dark:hover:text-[#bfa15f]/80 transition-all duration-150 flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#bfa15f] dark:text-[#bfa15f] animate-pulse" />
                  Support Us (Ads)
                </a>
              )}
              
              {/* SaaS Admin Portal */}
              {isLoggedIn && (
                <button
                  id="nav-btn-admin"
                  onClick={() => setView('saas-admin')}
                  className={`px-3 py-1 font-sans font-bold uppercase tracking-wider text-[11px] transition-all duration-150 flex items-center gap-1.5 ${
                    currentView === 'saas-admin'
                      ? darkMode ? 'text-[#bfa15f] border-b border-[#bfa15f]' : 'text-[#8c1d1a] border-b border-[#8c1d1a]'
                      : darkMode ? 'text-stone-400 hover:text-[#bfa15f]' : 'text-stone-600 hover:text-[#8c1d1a]'
                  }`}
                >
                  <Server className="w-3.5 h-3.5 text-[#bfa15f] dark:text-[#bfa15f] animate-pulse" />
                  SaaS Admin
                </button>
              )}
            </nav>

            {/* Header Right Actions */}
            <div className="flex items-center gap-3">
              {/* Theme Toggle */}
              <button
                id="theme-toggle"
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 transition-all duration-200 border rounded-none ${
                  darkMode 
                    ? 'border-[#2c2c2a] bg-[#181817] hover:bg-[#20201f] text-stone-300' 
                    : 'border-[#e6e2d8] bg-[#FAF9F5] hover:bg-[#f1efe8] text-stone-600'
                }`}
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>

              {/* Login Button State */}
              {isLoggedIn ? (
                <div className="flex items-center gap-3">
                  <div className={`hidden sm:flex flex-col items-end text-xs font-serif`}>
                    <span className="font-bold">{email.split('@')[0]}</span>
                    <span className="text-[9px] font-sans tracking-wide font-bold uppercase flex items-center gap-1 text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-emerald-400"></span> Active Member
                    </span>
                  </div>
                  <button
                    id="logout-btn"
                    onClick={handleLogout}
                    className={`p-2 rounded-none border flex items-center gap-1.5 text-xs font-sans font-bold uppercase tracking-wider transition-all duration-200 ${
                      darkMode
                        ? 'border-[#2c2c2a] bg-[#181817] hover:bg-red-900/10 hover:border-red-500/20 text-stone-300'
                        : 'border-[#e6e2d8] bg-[#FAF9F5] hover:bg-red-50 hover:border-red-200 text-stone-600'
                    }`}
                    title="Sign Out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline pr-0.5">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  id="login-trigger"
                  onClick={() => setShowLoginModal(true)}
                  className={`px-4 py-2 text-xs font-sans font-bold uppercase tracking-widest rounded-none transition-all duration-200 flex items-center gap-1.5 ${
                    darkMode 
                      ? 'bg-[#eae7e0] hover:bg-white text-[#121211]' 
                      : 'bg-[#1c1c1a] hover:bg-stone-800 text-[#FAF9F5]'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLoginModal(false)}
          ></div>
          
          {/* Form Container */}
          <div className={`relative w-full max-w-md rounded-none p-8 shadow-2xl border transition-all duration-200 animate-in fade-in zoom-in-95 duration-150 ${
            darkMode ? 'bg-[#121211] border-[#2c2c2a] text-[#eae7e0]' : 'bg-[#FAF9F5] border-[#e6e2d8] text-[#1c1c1a]'
          }`}>
            <div className="absolute top-4 right-4">
              <button 
                id="modal-close"
                onClick={() => setShowLoginModal(false)}
                className={`p-1 border rounded-none transition-colors duration-150 ${
                  darkMode ? 'hover:bg-stone-800/80 border-[#2c2c2a] text-stone-400' : 'hover:bg-stone-200/50 border-[#e6e2d8] text-stone-500'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="mb-6">
              <div className={`p-2.5 border w-fit rounded-none mb-3.5 ${
                darkMode ? 'border-[#2c2c2a] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'
              }`}>
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="font-serif font-medium text-2xl tracking-tight">Access UtilDoc Studio</h3>
              <p className={`text-xs font-serif mt-1.5 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                Sign in to sync your typesetting configurations across local container states.
              </p>
            </div>

            {successMsg ? (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-2 font-serif">
                <CheckCircle2 className={`w-10 h-10 ${darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'} animate-bounce`} />
                <p className="font-medium text-lg italic mt-2">{successMsg}</p>
                <p className={`text-xs ${darkMode ? 'text-stone-400' : 'text-stone-500'}`}>Synchronizing local memory cells...</p>
              </div>
            ) : isSignUp ? (
              <form onSubmit={handleSignUp} className="space-y-5 font-serif">
                {loginError && (
                  <div className={`p-3 text-xs font-bold font-sans uppercase tracking-wider border rounded-none ${
                    darkMode ? 'bg-red-950/20 border-red-900 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {loginError}
                  </div>
                )}
                
                <div>
                  <label className={`block text-[10px] font-sans font-bold uppercase tracking-widest mb-1.5 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Your Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-none text-sm border focus:outline-none focus:ring-1 focus:ring-stone-400/50 transition-all ${
                      darkMode 
                        ? 'bg-[#181817] border-[#2c2c2a] text-white' 
                        : 'bg-[#faf9f6] border-[#dcd9d0] text-stone-800'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-sans font-bold uppercase tracking-widest mb-1.5 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-none text-sm border focus:outline-none focus:ring-1 focus:ring-stone-400/50 transition-all font-mono ${
                      darkMode 
                        ? 'bg-[#181817] border-[#2c2c2a] text-white' 
                        : 'bg-[#faf9f6] border-[#dcd9d0] text-stone-800'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-sans font-bold uppercase tracking-widest mb-1.5 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-none text-sm border focus:outline-none focus:ring-1 focus:ring-stone-400/50 transition-all font-mono ${
                      darkMode 
                        ? 'bg-[#181817] border-[#2c2c2a] text-white' 
                        : 'bg-[#faf9f6] border-[#dcd9d0] text-stone-800'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  className={`w-full py-3 rounded-none font-sans font-bold uppercase tracking-widest text-xs transition-all duration-200 mt-2 ${
                    darkMode 
                      ? 'bg-[#eae7e0] text-[#121211] hover:bg-white' 
                      : 'bg-[#1c1c1a] text-[#FAF9F5] hover:bg-stone-800'
                  }`}
                >
                  Create Account
                </button>

                <div className={`mt-4 pt-4 border-t text-center text-xs ${darkMode ? 'border-[#2c2c2a] text-stone-400' : 'border-[#e6e2d8] text-stone-500'}`}>
                  Already have an account?{' '}
                  <button 
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setLoginError('');
                    }}
                    className={`underline font-bold uppercase tracking-wide font-sans text-[10px] ${
                      darkMode ? 'text-[#bfa15f] hover:text-white' : 'text-[#8c1d1a] hover:text-[#8c1d1a]/80'
                    }`}
                  >
                    Sign In
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-5 font-serif">
                {loginError && (
                  <div className={`p-3 text-xs font-bold font-sans uppercase tracking-wider border rounded-none ${
                    darkMode ? 'bg-red-950/20 border-red-900 text-red-400' : 'bg-red-50 border-red-200 text-red-700'
                  }`}>
                    {loginError}
                  </div>
                )}
                
                <div>
                  <label className={`block text-[10px] font-sans font-bold uppercase tracking-widest mb-1.5 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-none text-sm border focus:outline-none focus:ring-1 focus:ring-stone-400/50 transition-all font-mono ${
                      darkMode 
                        ? 'bg-[#181817] border-[#2c2c2a] text-white' 
                        : 'bg-[#faf9f6] border-[#dcd9d0] text-stone-800'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-[10px] font-sans font-bold uppercase tracking-widest mb-1.5 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-none text-sm border focus:outline-none focus:ring-1 focus:ring-stone-400/50 transition-all font-mono ${
                      darkMode 
                        ? 'bg-[#181817] border-[#2c2c2a] text-white' 
                        : 'bg-[#faf9f6] border-[#dcd9d0] text-stone-800'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 font-serif">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input type="checkbox" className="rounded-none text-stone-800 dark:text-white focus:ring-stone-400 bg-transparent border-stone-300 dark:border-stone-700" />
                    <span className={darkMode ? 'text-stone-400' : 'text-stone-600'}>Remember session</span>
                  </label>
                  <a href="#" className={`underline hover:opacity-80 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>Forgot password?</a>
                </div>

                <button
                  type="submit"
                  className={`w-full py-3 rounded-none font-sans font-bold uppercase tracking-widest text-xs transition-all duration-200 mt-2 ${
                    darkMode 
                      ? 'bg-[#eae7e0] text-[#121211] hover:bg-white' 
                      : 'bg-[#1c1c1a] text-[#FAF9F5] hover:bg-stone-800'
                  }`}
                >
                  Continue
                </button>

                <div className={`mt-6 pt-5 border-t text-center text-xs ${darkMode ? 'border-[#2c2c2a] text-stone-400' : 'border-[#e6e2d8] text-stone-500'}`}>
                  Don't have an account?{' '}
                  <button 
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setLoginError('');
                    }}
                    className={`underline font-bold uppercase tracking-wide font-sans text-[10px] ${
                      darkMode ? 'text-[#bfa15f] hover:text-white' : 'text-[#8c1d1a] hover:text-[#8c1d1a]/80'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
