import React from 'react';
import { RotateCcw, Palette, Settings } from 'lucide-react';
import { ThemeName } from '../types';

interface HeaderProps {
    onReset: () => void;
    currentTheme: ThemeName;
    onSwitchTheme: () => void;
    onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onReset, currentTheme, onSwitchTheme, onOpenSettings }) => {
  return (
    // Changed from sticky to relative/block since it's now outside the scrollable area
    <header className="w-full backdrop-blur-xl bg-pey-bg/80 border-b border-pey-border transition-colors duration-500 supports-[backdrop-filter]:bg-pey-bg/60 shrink-0">
      <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-default relative">
          
          <h1 className="font-display font-bold text-2xl tracking-tighter text-pey-text hidden sm:block">
            PEY<span className="text-transparent bg-clip-text bg-gradient-to-r from-pey-accent to-pey-secondary">CHAT</span>
          </h1>
          
          {/* Mobile Title (Compact) */}
          <h1 className="font-display font-bold text-xl tracking-tighter text-pey-text sm:hidden">
            PEY<span className="text-transparent bg-clip-text bg-gradient-to-r from-pey-accent to-pey-secondary">CHAT</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
             <button 
                onClick={onOpenSettings}
                className="group flex items-center justify-center w-11 h-11 rounded-full bg-pey-card border border-pey-border hover:border-pey-accent text-pey-muted hover:text-pey-text transition-all duration-300"
                title="Settings / Mode"
            >
                <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
            </button>

            <button 
                onClick={onSwitchTheme}
                className="group relative flex items-center justify-center w-11 h-11 rounded-full bg-pey-card border border-pey-border hover:border-pey-accent text-pey-muted hover:text-pey-text transition-all duration-300"
                title={`Ganti Skin (Current: ${currentTheme})`}
            >
                <Palette size={18} className="group-hover:rotate-12 transition-transform" />
            </button>
            
            <button 
                onClick={onReset}
                className="group flex items-center justify-center w-11 h-11 rounded-full bg-pey-card border border-pey-border hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-500 text-pey-muted transition-all duration-300"
                title="Hapus / Reset Chat"
            >
                <RotateCcw size={18} className="group-hover:-rotate-180 transition-transform duration-500" />
            </button>
        </div>
      </div>
    </header>
  );
};