import React from 'react';
import { X, User, Volume2, Brain, Mic, Trash2 } from 'lucide-react';
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
}) => {
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
        <div className="overflow-y-auto p-6 space-y-8">
          
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
                className="w-full py-3 px-4 rounded-lg border border-red-500/20 hover:bg-red-500/5 text-red-500 transition-all flex items-center justify-center gap-2 text-sm font-medium hover:tracking-wide duration-300"
             >
                <span>Hapus Memori Percakapan</span>
             </button>
          </section>

        </div>
      </div>
    </div>
  );
};