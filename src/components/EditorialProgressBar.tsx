import { motion } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface EditorialProgressBarProps {
  progress: number;
  step: string;
  darkMode: boolean;
  title?: string;
  className?: string;
}

export function EditorialProgressBar({
  progress,
  step,
  darkMode,
  title = "Processing Document Streams",
  className = ""
}: EditorialProgressBarProps) {
  // Ensure progress stays within 0-100 bounds
  const clampedProgress = Math.min(Math.max(0, progress), 100);

  // Pick colors corresponding to our theme
  // Dark mode: gold accent #bfa15f
  // Light mode: deep crimson accent #8c1d1a
  const accentColorClass = darkMode ? 'bg-[#bfa15f]' : 'bg-[#8c1d1a]';
  const textColorClass = darkMode ? 'text-[#bfa15f]' : 'text-[#8c1d1a]';
  const borderColorClass = darkMode ? 'border-[#333331]' : 'border-[#e6e2d8]';

  return (
    <div 
      className={`max-w-xl mx-auto p-12 rounded-none border text-center relative overflow-hidden transition-colors duration-300 ${
        darkMode ? 'bg-[#181817] border-[#2c2c2a]' : 'bg-[#FAF9F5] border-[#e6e2d8]'
      } ${className}`}
      id="editorial-progress-container"
    >
      {/* Decorative Editorial Corner Accents */}
      <div className={`absolute top-2 left-2 w-2 h-2 border-t border-l ${borderColorClass}`} />
      <div className={`absolute top-2 right-2 w-2 h-2 border-t border-r ${borderColorClass}`} />
      <div className={`absolute bottom-2 left-2 w-2 h-2 border-b border-l ${borderColorClass}`} />
      <div className={`absolute bottom-2 right-2 w-2 h-2 border-b border-r ${borderColorClass}`} />

      {/* Rotating Editorial Ornament / Loader */}
      <div className="relative mb-6 flex justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
          className="relative flex items-center justify-center w-12 h-12"
        >
          {/* Subtle spinning dashed circle */}
          <div className={`absolute inset-0 rounded-full border border-dashed opacity-30 ${
            darkMode ? 'border-[#bfa15f]' : 'border-[#8c1d1a]'
          }`} />
          {/* Main loader symbol */}
          <Loader2 className={`w-5 h-5 ${textColorClass}`} />
        </motion.div>
      </div>

      {/* Main Title */}
      <h3 className="font-serif font-medium text-2xl mb-2 italic tracking-tight" id="editorial-progress-title">
        {title}
      </h3>

      {/* Description / Sub-step */}
      <p 
        className="text-xs text-stone-500 font-mono mb-8 min-h-[16px] tracking-wide" 
        id="editorial-progress-step"
      >
        {step || "Initializing task sequencer..."}
      </p>

      {/* Beautiful Editorial Dual-Line Progress Track */}
      <div className="relative w-full mb-3 px-1">
        {/* Track Line */}
        <div className="w-full h-1.5 bg-stone-200 dark:bg-stone-800 rounded-none overflow-hidden relative">
          {/* Thin dashed horizontal line in center for editorial texture */}
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-b border-dashed border-stone-300 dark:border-stone-700 opacity-60`} />
          </div>
          
          {/* Animated fill */}
          <motion.div
            className={`h-full absolute top-0 left-0 transition-all duration-300 ${accentColorClass}`}
            initial={{ width: 0 }}
            animate={{ width: `${clampedProgress}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
          />
        </div>
      </div>

      {/* Grid Alignment Ticks / Marks */}
      <div className="flex justify-between text-[9px] font-mono uppercase tracking-widest text-stone-400 dark:text-stone-500 px-1 mb-6">
        <span>00</span>
        <span className="opacity-40">25</span>
        <span className="opacity-40">50</span>
        <span className="opacity-40">75</span>
        <span>100</span>
      </div>

      {/* Progress Meta Info */}
      <div className="flex items-center justify-center gap-3">
        <div className={`w-6 border-t border-dashed ${borderColorClass}`} />
        <p className="text-[10px] font-mono uppercase tracking-widest text-stone-400 dark:text-stone-500">
          Stream Progress: <span className={`font-bold ${textColorClass}`}>{clampedProgress}%</span>
        </p>
        <div className={`w-6 border-t border-dashed ${borderColorClass}`} />
      </div>
    </div>
  );
}
