import React, { useState, useEffect } from 'react';
import { X, User, Volume2, Brain, Mic, Trash2, Key, ExternalLink, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Persona, VoicePreset } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
  currentPersonaId: string;
  onSelectPersona: (id: string) => void;
  voicePresets: VoicePreset[];
  currentVoiceId: string;
  onSelectVoice: (id: string) => void;
  onReset: () => void;
  userApiKey: string;
  onUpdateApiKey: (key: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  personas,
  currentPersonaId,
  onSelectPersona,
  voicePresets,
  currentVoiceId,
  onSelectVoice,
  onReset,
  userApiKey,
  onUpdateApiKey
}) => {
  const [localKey, setLocalKey] = useState(userApiKey);
  const [showKey, setShowKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
      setLocalKey(userApiKey);
  }, [userApiKey]);

  const handleSaveKey = () => {
      onUpdateApiKey(localKey);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div 
        className="w-full max-w-md bg-pey-bg border border-pey-border rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-[scaleIn_0.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-pey-border bg-pey-card/50">
          <h2 className="text-xl font-display font-bold text-pey-text flex items-center gap-2 tracking-tight">
            Konfigurasi
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-pey-muted hover:text-red-500">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-8 scrollbar-hide">
          
          {/* Persona Selection */}
          <section>
            <h3 className="text-xs font-bold text-pey-muted uppercase tracking-widest mb-4 flex items-center gap-2">
               Mode Operasi
            </h3>
            <div className="grid gap-2">
              {personas.map((persona) => {
                 const isSelected = currentPersonaId === persona.id;

                 return (
                    <button
                      key={persona.id}
                      onClick={() => onSelectPersona(persona.id)}
                      className={`relative p-4 rounded-lg text-left transition-all duration-200 group ${
                        isSelected
                          ? 'bg-pey-accent/5 border-l-2 border-pey-accent'
                          : 'bg-transparent border-l-2 border-transparent hover:bg-pey-card'
                      }`}
                    >
                      <div className="flex flex-col">
                        <div className={`font-medium text-sm ${isSelected ? 'text-pey-accent' : 'text-pey-text group-hover:text-pey-text'}`}>
                          {persona.name}
                        </div>
                        <div className="text-xs text-pey-muted mt-1 leading-relaxed opacity-80">
                          {persona.description}
                        </div>
                      </div>
                    </button>
                 );
              })}
            </div>
          </section>

          {/* Voice Selection */}
          <section>
            <h3 className="text-xs font-bold text-pey-muted uppercase tracking-widest mb-4 flex items-center gap-2">
               Profil Suara
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {voicePresets.map((voice) => {
                const isSelected = currentVoiceId === voice.id;
                return (
                    <button
                    key={voice.id}
                    onClick={() => onSelectVoice(voice.id)}
                    className={`p-3 rounded-lg text-left flex items-center justify-between transition-all ${
                        isSelected
                        ? 'bg-pey-secondary/10 border-l-2 border-pey-secondary text-pey-secondary'
                        : 'bg-transparent border-l-2 border-transparent hover:bg-pey-card text-pey-text'
                    }`}
                    >
                    <div>
                        <div className="font-medium text-sm">{voice.name}</div>
                        <div className="text-[10px] opacity-60 mt-0.5 font-mono">
                        {voice.description}
                        </div>
                    </div>
                    {isSelected && <Volume2 size={14} />}
                    </button>
                )
              })}
            </div>
          </section>
          
          {/* Danger Zone */}
          <section className="pt-6 border-t border-pey-border">
             <button
                type="button"
                onClick={onReset}
                className="w-full py-3 px-4 rounded-lg border border-red-500/20 hover:bg-red-500/5 text-red-500 transition-all flex items-center justify-center gap-2 text-sm font-medium hover:tracking-wide duration-300 group"
             >
                <Trash2 size={16} className="group-hover:rotate-12 transition-transform" />
                <span>Hapus Memori Percakapan</span>
             </button>
          </section>

          {/* Advanced / Custom API Key Section (Bottom) */}
          <section className="pt-2 flex flex-col items-center">
            {!showAdvanced ? (
                <button 
                    onClick={() => setShowAdvanced(true)}
                    className="flex items-center gap-2 px-4 py-2 text-[10px] font-bold tracking-widest uppercase text-pey-muted hover:text-pey-accent transition-all opacity-60 hover:opacity-100 rounded-full hover:bg-pey-card border border-transparent hover:border-pey-border"
                >
                    <Key size={12} />
                    <span>Custom API Key</span>
                    <ChevronDown size={12} />
                </button>
            ) : (
                <div className="w-full animate-[fadeIn_0.3s_ease-out]">
                    <div className="flex justify-center mb-2">
                        <button 
                            onClick={() => setShowAdvanced(false)}
                            className="text-[10px] text-pey-muted hover:text-pey-text flex items-center gap-1 opacity-50 hover:opacity-100"
                        >
                            <ChevronUp size={10} /> Tutup
                        </button>
                    </div>
                    <div className="bg-pey-card/30 p-4 rounded-xl border border-pey-border/50 relative overflow-hidden">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-20 h-20 bg-pey-accent/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                        <h3 className="text-xs font-bold text-pey-accent uppercase tracking-widest mb-2 flex items-center gap-2 relative z-10">
                            <Key size={12} /> Anti Limit Mode
                        </h3>
                        <p className="text-[10px] text-pey-muted mb-3 leading-relaxed relative z-10">
                            Bypass antrian server dengan menggunakan API Key Google Gemini pribadi.
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-pey-accent hover:underline ml-1 inline-flex items-center gap-0.5">
                                Ambil Key Gratis <ExternalLink size={8} />
                            </a>
                        </p>
                        <div className="relative flex gap-2 z-10">
                            <div className="relative flex-1">
                                <input 
                                    type={showKey ? "text" : "password"}
                                    value={localKey}
                                    onChange={(e) => setLocalKey(e.target.value)}
                                    onBlur={handleSaveKey}
                                    placeholder="Paste key dari Google AI Studio..."
                                    className="w-full bg-pey-bg border border-pey-border rounded-lg py-2 pl-3 pr-8 text-xs text-pey-text focus:outline-none focus:border-pey-accent transition-colors shadow-inner"
                                />
                                <button 
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-pey-muted hover:text-pey-text p-1"
                                >
                                    {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};