import React, { useState } from 'react';
import { TOOLS } from '../data';
import { Tool, ToolCategory } from '../types';
import * as Icons from 'lucide-react';
import { Search, Sparkles, HelpCircle } from 'lucide-react';

interface ToolGridProps {
  darkMode: boolean;
  onSelectTool: (toolId: string) => void;
  adsterraLink: string;
  adsterraActive: boolean;
}

// Icon mapper to dynamically look up Lucide icons
const IconComponent = ({ name, className }: { name: string; className?: string }) => {
  // Map icons from strings safely
  const LucideIcon = (Icons as any)[name] || Icons.File;
  return <LucideIcon className={className} />;
};

export default function ToolGrid({ darkMode, onSelectTool, adsterraLink, adsterraActive }: ToolGridProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory>('all');

  const categories: { label: string; value: ToolCategory }[] = [
    { label: 'All Utilities', value: 'all' },
    { label: 'PDF Utilities', value: 'pdf' },
    { label: 'Image Tools', value: 'image' },
    { label: 'Security & Lock', value: 'security' },
    { label: 'AI Assisted', value: 'ai' }
  ];

  // Filter tools based on searches and category
  const filteredTools = TOOLS.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          tool.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      
      {/* Hero Welcome banner */}
      <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
        <div className={`inline-flex items-center gap-2 px-3 py-1 border border-dashed text-[10px] font-sans font-bold uppercase tracking-widest mb-6 ${
          darkMode ? 'border-[#bfa15f]/40 text-[#bfa15f]' : 'border-[#8c1d1a]/40 text-[#8c1d1a]'
        }`}>
          <Sparkles className="w-3.5 h-3.5" />
          <span>Local Typesetting Press Active</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-serif font-light tracking-tight mb-6 leading-tight">
          Typeset & Convert Documents <span className="italic font-normal">With Absolute Security</span>
        </h1>
        <p className={`text-sm sm:text-base font-serif max-w-2xl mx-auto leading-relaxed mb-6 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
          No system telemetry. No database transfers. No network leakage. Every stream-buffer operation executes strictly inside your browser's local sandbox memory.
        </p>

        {adsterraActive && (
          <div className={`p-4 border rounded-none text-center max-w-2xl mx-auto mt-8 flex flex-col sm:flex-row items-center gap-4 justify-between ${
            darkMode ? 'bg-[#1a1610] border-amber-900/30' : 'bg-[#fffbeb] border-amber-200'
          }`}>
            <div className="flex items-center gap-3 text-left">
              <div className={`p-2 border rounded-none ${darkMode ? 'border-amber-900/40 text-amber-500 bg-amber-500/5' : 'border-amber-200 text-amber-600 bg-amber-50'}`}>
                <Icons.Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-[10px] uppercase tracking-wider text-amber-500">Sponsored Link</h4>
                <p className={`text-[11px] font-serif mt-0.5 leading-normal ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>
                  Support our free sandbox converters by visiting our sponsor site today!
                </p>
              </div>
            </div>
            <a 
              href={adsterraLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest rounded-none border transition-colors whitespace-nowrap shrink-0 ${
                darkMode 
                  ? 'border-amber-500/40 hover:border-amber-400 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10' 
                  : 'border-amber-500 bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              Visit Sponsor
            </a>
          </div>
        )}
      </div>

      {/* Control Area: Search + Category Filters */}
      <div className={`py-6 border-b flex flex-col md:flex-row gap-6 items-center justify-between transition-colors duration-200 mb-14 ${
        darkMode ? 'border-[#2c2c2a]' : 'border-[#e6e2d8]'
      }`}>
        
        {/* Horizontal Category Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none pb-2 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.value}
              id={`cat-btn-${cat.value}`}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer ${
                selectedCategory === cat.value
                  ? darkMode 
                    ? 'bg-[#bfa15f] text-black border border-[#bfa15f]'
                    : 'bg-[#8c1d1a] text-white border border-[#8c1d1a]'
                  : darkMode 
                    ? 'text-stone-400 hover:text-white border border-[#2c2c2a] bg-transparent' 
                    : 'text-stone-600 hover:text-stone-900 border border-[#d8d4ca] bg-transparent'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Dynamic Search Box */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
            <Search className="w-3.5 h-3.5" />
          </div>
          <input
            type="text"
            id="tool-search"
            placeholder="Search catalog index..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-9 pr-12 py-2 text-xs border focus:outline-none focus:ring-0 transition-all font-mono rounded-none ${
              darkMode 
                ? 'bg-[#181817] border-[#2c2c2a] focus:border-[#bfa15f] text-white placeholder-stone-500' 
                : 'bg-white border-[#dcd9d0] focus:border-stone-800 text-stone-800 placeholder-stone-400'
            }`}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-[10px] font-sans uppercase tracking-wider font-bold text-stone-400 hover:text-stone-600"
            >
              Clear
            </button>
          )}
        </div>

      </div>

      {/* Grid Layout */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" id="tools-grid-container">
          {filteredTools.map((tool, idx) => {
            // Pick badge background colors
            const isNew = tool.badge === 'New';
            const isPopular = tool.badge === 'Popular';
            const badgeClass = isNew 
              ? darkMode ? 'text-fuchsia-400 border-fuchsia-900/40' : 'text-fuchsia-700 border-fuchsia-200'
              : isPopular 
                ? darkMode ? 'text-[#bfa15f] border-[#bfa15f]/20' : 'text-[#8c1d1a] border-[#8c1d1a]/20'
                : darkMode ? 'text-emerald-400 border-emerald-900/40' : 'text-emerald-700 border-emerald-200';

            // Picker icon style consistent with Editorial Aesthetic
            const colorAccentClass = darkMode 
              ? 'text-white border-[#2c2c2a] bg-[#181817]' 
              : 'text-stone-800 border-[#e6e2d8] bg-[#FAF9F5]';

            return (
              <React.Fragment key={tool.id}>
                {/* Insert Sponsored Ad Card at index 3 (after 3 tools) */}
                {idx === 3 && adsterraActive && (
                  <a
                    href={adsterraLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`relative group rounded-none p-8 border text-left cursor-pointer transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between ${
                      darkMode 
                        ? 'bg-[#181510] border-amber-900/40 hover:border-amber-500/40' 
                        : 'bg-amber-50/30 border-amber-200 hover:border-amber-400 hover:shadow-xl'
                    }`}
                  >
                    <div>
                      <span className="absolute top-4 right-4 text-[9px] font-sans font-bold uppercase tracking-widest px-2 py-0.5 border rounded-none text-amber-500 border-amber-500/20">
                        Sponsor
                      </span>
                      <div className="p-3 border rounded-none w-fit mb-6 transition-transform duration-300 text-amber-500 border-amber-500/20 bg-amber-500/5 group-hover:scale-105">
                        <Icons.ExternalLink className="w-4 h-4" />
                      </div>
                      <h3 className="font-serif font-medium text-xl tracking-tight mb-2.5 transition-colors duration-200 group-hover:underline text-amber-500 group-hover:text-amber-400">
                        Visit Sponsored Link
                      </h3>
                      <p className={`text-xs font-serif leading-relaxed mb-6 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                        Unlock premium capabilities & support our digital typesetting studio. 100% secure direct sandbox redirection.
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-widest mt-auto text-amber-500 group-hover:text-amber-400">
                      <span>Redirect Sponsor</span>
                      <Icons.ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-200" />
                    </div>
                  </a>
                )}

                <div
                  id={`tool-card-${tool.id}`}
                  onClick={() => onSelectTool(tool.id)}
                  className={`relative group rounded-none p-8 border text-left cursor-pointer transition-all duration-300 hover:scale-[1.01] flex flex-col justify-between ${
                    darkMode 
                      ? 'bg-[#141413] border-[#2c2c2a] hover:border-stone-500/50 hover:bg-[#181817]' 
                      : 'bg-[#FAF9F5]/40 border-[#e6e2d8] hover:border-stone-400 hover:bg-white hover:shadow-xl'
                  }`}
                >
                  
                  {/* Badge top-right */}
                  {tool.badge && (
                    <span className={`absolute top-4 right-4 text-[9px] font-sans font-bold uppercase tracking-widest px-2 py-0.5 border rounded-none ${badgeClass}`}>
                      {tool.badge}
                    </span>
                  )}

                  {/* Icon Box */}
                  <div className={`p-3 border rounded-none w-fit mb-6 transition-transform duration-300 ${colorAccentClass} group-hover:scale-105`}>
                    <IconComponent name={tool.icon} className="w-4 h-4" />
                  </div>

                  {/* Text Group */}
                  <h3 className={`font-serif font-medium text-xl tracking-tight mb-2.5 transition-colors duration-200 group-hover:underline ${
                    darkMode ? 'group-hover:text-[#bfa15f]' : 'group-hover:text-[#8c1d1a]'
                  }`}>
                    {tool.name}
                  </h3>
                  <p className={`text-xs font-serif leading-relaxed mb-6 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
                    {tool.description}
                  </p>

                  {/* Action */}
                  <div className={`flex items-center gap-1 text-[10px] font-sans font-bold uppercase tracking-widest mt-auto ${
                    darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]'
                  }`}>
                    <span>Compile Stream</span>
                    <Icons.ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-200" />
                  </div>

                </div>
              </React.Fragment>
            );
          })}
        </div>
      ) : (
        <div className={`text-center py-20 border border-dashed rounded-none ${
          darkMode ? 'border-stone-800 bg-[#181817]' : 'border-stone-300 bg-[#faf9f6]'
        }`}>
          <HelpCircle className="w-10 h-10 text-stone-400 mx-auto mb-4" />
          <h3 className="font-serif font-medium text-xl">No Matching Utilities</h3>
          <p className="text-xs font-serif text-stone-500 mt-2 max-w-sm mx-auto leading-relaxed">
            Please adjust your layout index filter, clear your active query buffer, or review our general categories index above.
          </p>
        </div>
      )}

      {/* Trust reassurance banner */}
      <div className={`mt-20 p-8 rounded-none border text-center max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-6 justify-between ${
        darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
      }`}>
        <div className="flex items-center gap-4 text-left">
          <div className={`p-3 border rounded-none shrink-0 ${darkMode ? 'border-[#2c2c2a] text-[#bfa15f]' : 'border-[#e6e2d8] text-[#8c1d1a]'}`}>
            <Icons.ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-serif font-medium text-base">Absolute Secure Offline Buffer</h4>
            <p className={`text-xs font-serif mt-1 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
              Virtual files run directly inside local tab memory blocks. Network telemetry is disabled.
            </p>
          </div>
        </div>
        <button 
          onClick={() => onSelectTool('merge-pdf')}
          className={`px-5 py-2 text-[10px] font-sans font-bold uppercase tracking-widest rounded-none border transition-colors whitespace-nowrap ${
            darkMode 
              ? 'border-[#3a3a38] hover:border-stone-400 text-stone-200' 
              : 'border-[#d8d4ca] hover:border-stone-800 text-stone-800'
          }`}
        >
          Begin Merge PDF
        </button>
      </div>

    </div>
  );
}
