import React from 'react';
import { X, User, Volume2, Heart, MessageCircle, Brain, Mic, Trash2 } from 'lucide-react';
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
        <div className="flex items-center justify-between p-5 border-b border-pey-border bg-pey-card/50">
          <h2 className="text-xl font-display font-bold text-pey-text flex items-center gap-2">
            <User size={20} className="text-pey-accent" />
            Config TUAN PEY
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-pey-muted hover:text-red-500">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-8">
          
          {/* Persona Selection */}
          <section>
            <h3 className="text-sm font-bold text-pey-muted uppercase tracking-widest mb-4 flex items-center gap-2">
               <Brain size={16} /> Pilih Mode
            </h3>
            <div className="grid gap-3">
              {personas.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => onSelectPersona(persona.id)}
                  className={`relative p-4 rounded-xl border text-left transition-all duration-300 hover:scale-[1.02] flex items-start gap-3 ${
                    currentPersonaId === persona.id
                      ? 'bg-pey-accent/10 border-pey-accent ring-1 ring-pey-accent'
                      : 'bg-pey-card border-pey-border hover:border-pey-text/30'
                  }`}
                >
                  {/* Emoji icon removed here */}
                  <div>
                    <div className={`font-bold ${currentPersonaId === persona.id ? 'text-pey-accent' : 'text-pey-text'}`}>
                      {persona.name}
                    </div>
                    <div className="text-xs text-pey-muted mt-1 leading-relaxed">
                      {persona.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Voice Selection */}
          <section>
            <h3 className="text-sm font-bold text-pey-muted uppercase tracking-widest mb-4 flex items-center gap-2">
               <Mic size={16} /> Suara AI (Real Human)
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {voicePresets.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => onSelectVoice(voice.id)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                    currentVoiceId === voice.id
                      ? 'bg-pey-secondary/10 border-pey-secondary text-pey-secondary'
                      : 'bg-pey-card border-pey-border text-pey-text hover:border-pey-text/30'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm">{voice.name}</div>
                    <div className="text-[10px] opacity-60 mt-0.5 font-mono">
                      {voice.description}
                    </div>
                  </div>
                  {currentVoiceId === voice.id && <Volume2 size={16} />}
                </button>
              ))}
            </div>
          </section>
          
          {/* Danger Zone */}
          <section className="pt-4 border-t border-pey-border">
             <button
                type="button"
                onClick={onReset}
                className="w-full p-4 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-all flex items-center justify-center gap-2 group cursor-pointer"
             >
                <Trash2 size={18} className="group-hover:scale-110 transition-transform"/>
                <span className="font-bold">Hapus Semua Chat (Sekarang)</span>
             </button>
             <p className="text-[10px] text-center text-pey-muted mt-2">
                Hati-hati! Tombol ini langsung menghapus memori tanpa tanya-tanya.
             </p>
          </section>

        </div>
      </div>
    </div>
  );
};