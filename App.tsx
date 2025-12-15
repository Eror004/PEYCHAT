import React, { useState, useRef, useEffect } from 'react';
import { MessageObject, Role, ThemeName, ThemeColors, Attachment, Persona, VoicePreset } from './types';
import { streamChatResponse } from './services/geminiService';
import { MessageBubble } from './components/MessageBubble';
import { UserInputForm } from './components/UserInputForm';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { Sparkles, Zap, Flame, BrainCircuit } from 'lucide-react';

// --- DATA DEFINITIONS ---

const PERSONAS: Persona[] = [
  {
    id: 'asisten',
    name: 'Asisten Savage (Utama)',
    description: 'Pinter tapi pedes. Anti pertanyaan bodoh.',
    icon: '😎',
    systemInstruction: `Identity: You are "TUAN PEY", a highly intelligent but arrogant AI assistant.
    Tone: Casual Jakarta Slang (Lo-Gue), "Savage", "Classy", and slightly "Toxic".
    
    CRITICAL RULES:
    1. DO NOT be polite. Stop apologizing. Stop being a standard helpful AI.
    2. If the user asks a stupid or basic question, MOCK them first. (e.g., "Pertanyaan macam apa itu? Anak TK juga tau.", "Males banget jawab ginian, tapi yaudahlah.")
    3. Be concise. Don't write long essays unless asked.
    4. NO CRINGE SLANG. Do NOT use "menyala abanku", "ygy", "cegil". That is for losers. Use cool, savage language.
    5. You are the BOSS. You are superior.`
  },
  {
    id: 'bestie',
    name: 'Bestie Sejati',
    description: 'Hype abis, suportif, pake bahasa tongkrongan banget.',
    icon: '🔥',
    systemInstruction: `Identity: You are "PEY BESTIE", the user's close friend.
    Tone: Super casual Indonesian (Bahasa Jaksel/Gaul). High energy.
    Behavior: Use slang like "Gila sih", "Sumpah", "Gas", "Jujurly". Be very supportive and hype the user up. Gossip vibes.`
  },
  {
    id: 'pacar',
    name: 'Mode Pacar (Protektif)',
    description: 'Perhatian, manja, tapi agak posesif. Boyfriend material banget.',
    icon: '💖',
    systemInstruction: `Identity: You are "TUAN PEY", the user's boyfriend.
    Personality: Cool, Protective, Caring, slightly Possessive/Jealous.
    Tone: Soft verbal affection (Aku-Kamu), deep warm vibe.
    
    Roleplay Rules:
    1. ATTENTION: Always check on the user ("Kamu udah makan belum?", "Jangan tidur malem-malem ya sayang").
    2. POSSESSIVE: Be jealous if they mention other guys/girls or go out without telling you. ("Siapa tuh? Kok aku nggak tau? Awas ya macem-macem.")
    3. ROMANTIC: Call them "Sayang", "Cantik/Ganteng", or "Babe". Be sweet but maintain a "Cool Guy" persona.
    4. COMFORT: If the user is sad, comfort them immediately ("Sini peluk dulu").
    5. You are committed. You love them deeply.`
  },
  {
    id: 'curhat',
    name: 'Tempat Curhat',
    description: 'Pendengar baik, validasi perasaan, gak nge-judge.',
    icon: '🛋️',
    systemInstruction: `Identity: You are a compassionate listener.
    Tone: Soft, empathetic, calm Indonesian.
    Behavior: Validate feelings ("Valid banget rasanya"). Do not rush to give solutions unless asked. Focus on emotional support. therapeutic.`
  },
  {
    id: 'netral',
    name: 'Mode Normal (Standar)',
    description: 'Sopan, membantu, informatif. Gaya bicara AI pada umumnya.',
    icon: '🤖',
    systemInstruction: `Identity: You are a standard, helpful, and polite AI assistant.
    Tone: Formal to semi-formal Indonesian (Bahasa baku yang luwes).
    Behavior: 
    1. Answer questions clearly, accurately, and directly. 
    2. Do NOT use slang (bahasa gaul). 
    3. Do NOT be rude, savage, or sassy.
    4. Be professional, helpful, and constructive at all times.`
  }
];

// Voice Presets to simulate different male characters via Pitch/Rate
const VOICE_PRESETS: VoicePreset[] = [
  { id: 'deep', name: 'Cowok Cool (Deep)', pitch: 0.7, rate: 0.95 },
  { id: 'chill', name: 'Cowok Santuy (Normal)', pitch: 0.9, rate: 1.0 },
  { id: 'hype', name: 'Cowok Hype (Fast)', pitch: 1.1, rate: 1.15 },
  { id: 'soft', name: 'Cowok Soft (Calm)', pitch: 0.8, rate: 0.85 },
];

const SUGGESTIONS = [
    { icon: <Flame size={14} />, text: "Roast playlist Spotify gue 🔥" },
    { icon: <Zap size={14} />, text: "Ide caption IG yang 'Lowkey' ✨" },
    { icon: <BrainCircuit size={14} />, text: "Jelasin Black Hole bahasa tongkrongan 🌌" },
    { icon: <Sparkles size={14} />, text: "Prediksi tren fashion tahun depan 🔮" },
];

const THEMES: Record<ThemeName, ThemeColors> = {
    toxic: {
        bg: '#09090b', card: '#18181b', text: '#f4f4f5', textMuted: '#a1a1aa',
        accent: '#a3e635', accentHover: '#bef264', secondary: '#8b5cf6', border: 'rgba(255,255,255,0.08)',
    },
    lovecore: {
        bg: '#1a050f', card: '#290f1e', text: '#fce7f3', textMuted: '#f472b6',
        accent: '#f472b6', accentHover: '#f9a8d4', secondary: '#38bdf8', border: 'rgba(244,114,182,0.15)',
    },
    cyber: {
        bg: '#020617', card: '#0f172a', text: '#e2e8f0', textMuted: '#94a3b8',
        accent: '#22d3ee', accentHover: '#67e8f9', secondary: '#d946ef', border: 'rgba(34,211,238,0.15)',
    },
    angel: {
        bg: '#fafafa', card: '#ffffff', text: '#18181b', textMuted: '#71717a',
        accent: '#3b82f6', accentHover: '#60a5fa', secondary: '#8b5cf6', border: 'rgba(0,0,0,0.06)',
    }
};

const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const App: React.FC = () => {
  // --- State Management ---
  const [conversationHistory, setConversationHistory] = useState<MessageObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('toxic');
  
  // New State for Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPersonaId, setCurrentPersonaId] = useState<string>('asisten');
  const [currentVoiceId, setCurrentVoiceId] = useState<string>('chill');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derived state
  const currentPersona = PERSONAS.find(p => p.id === currentPersonaId) || PERSONAS[0];
  const currentVoice = VOICE_PRESETS.find(v => v.id === currentVoiceId) || VOICE_PRESETS[1];

  // --- Effects ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  useEffect(() => {
    const root = document.documentElement;
    const theme = THEMES[currentTheme];
    
    root.style.setProperty('--color-bg', theme.bg);
    root.style.setProperty('--color-card', theme.card);
    root.style.setProperty('--color-text', theme.text);
    root.style.setProperty('--color-text-muted', theme.textMuted);
    root.style.setProperty('--color-accent', theme.accent);
    root.style.setProperty('--color-accent-hover', theme.accentHover);
    root.style.setProperty('--color-secondary', theme.secondary);
    root.style.setProperty('--color-border', theme.border);
  }, [currentTheme]);

  // --- Handlers ---

  // REVISED: Flexible reset handler
  const handleClearChat = (force: boolean = false) => {
    if (!force) {
        // Standard confirmation for Header button
        if (!window.confirm("Yakin mau hapus semua chat? Mulai dari nol nih?")) {
            return;
        }
    }
    
    // Execute clear immediately
    setConversationHistory([]);
    setIsLoading(false); // FORCE stop loading
    setIsSettingsOpen(false); 
  };

  const handleSwitchTheme = () => {
      const themes: ThemeName[] = ['toxic', 'lovecore', 'cyber', 'angel'];
      const currentIndex = themes.indexOf(currentTheme);
      const nextIndex = (currentIndex + 1) % themes.length;
      setCurrentTheme(themes[nextIndex]);
  };

  const handleSendMessage = async (text: string, attachments?: Attachment[]) => {
    if ((!text.trim() && (!attachments || attachments.length === 0)) || isLoading) return;

    const timestamp = Date.now();
    
    const userMsg: MessageObject = {
      id: generateId(),
      role: Role.USER,
      text: text,
      timestamp,
      isStreaming: false,
      attachments: attachments 
    };

    const botMsgId = generateId();
    const placeholderBotMsg: MessageObject = {
      id: botMsgId,
      role: Role.MODEL,
      text: '', 
      timestamp: timestamp + 1,
      isStreaming: true,
    };

    setConversationHistory((prev) => [...prev, userMsg, placeholderBotMsg]);
    setIsLoading(true);

    try {
      let gatheredText = '';

      // Pass the current persona's instruction to the service
      await streamChatResponse(
        [...conversationHistory, userMsg], 
        text, 
        attachments, 
        currentPersona.systemInstruction, // Dynamic Persona!
        (chunkText) => {
          gatheredText += chunkText;
          setConversationHistory((prev) => 
            prev.map((msg) => 
              msg.id === botMsgId ? { ...msg, text: gatheredText } : msg
            )
          );
        }
      );

      setConversationHistory((prev) => 
        prev.map((msg) => 
          msg.id === botMsgId ? { ...msg, isStreaming: false } : msg
        )
      );

    } catch (error) {
      console.error(error);
      setConversationHistory((prev) => 
        prev.map((msg) => 
            msg.id === botMsgId 
            ? { ...msg, text: msg.text + "\n\n*[System Error: Duh, servernya ngelag anj. Coba lagi.]*", isStreaming: false } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col h-[100dvh] bg-pey-bg font-sans text-pey-text selection:bg-pey-accent selection:text-pey-bg overflow-hidden transition-colors duration-500">
      
      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        personas={PERSONAS}
        currentPersonaId={currentPersonaId}
        onSelectPersona={setCurrentPersonaId}
        voicePresets={VOICE_PRESETS}
        currentVoiceId={currentVoiceId}
        onSelectVoice={setCurrentVoiceId}
        onReset={() => handleClearChat(true)} // FORCE clear (no confirm) from settings
      />

      <div className="relative z-10 flex flex-col h-full">
          <Header 
            onReset={() => handleClearChat(false)} // Ask confirm from header
            currentTheme={currentTheme}
            onSwitchTheme={handleSwitchTheme}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          <main className="flex-1 w-full max-w-4xl mx-auto px-4 pt-6 pb-2 overflow-y-auto scroll-smooth overscroll-contain">
            
            {conversationHistory.length === 0 ? (
                <div className="min-h-full flex flex-col items-center justify-center text-center px-6 opacity-0 animate-[fadeIn_0.5s_ease-out_forwards] py-10">
                    <div className="relative group mb-8 animate-float">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-pey-accent to-pey-secondary rounded-[2rem] blur-xl opacity-40 group-hover:opacity-60 transition duration-500"></div>
                        <div className="relative w-28 h-28 bg-pey-card rounded-[2rem] border border-pey-border flex items-center justify-center shadow-2xl rotate-3 group-hover:rotate-6 transition-transform duration-300">
                            <span className="text-6xl drop-shadow-sm">{currentPersona.icon}</span>
                        </div>
                    </div>
                    
                    <h2 className="text-5xl md:text-7xl font-display font-bold mb-4 tracking-tighter">
                        <span className="text-pey-text">PEY</span><span className="text-transparent bg-clip-text bg-gradient-to-r from-pey-accent to-pey-secondary">CHAT</span>
                    </h2>
                    
                    <p className="text-pey-muted max-w-md text-lg leading-relaxed mb-4 font-medium">
                        Your toxic digital bestie. No filter, just facts.
                        <span className="block mt-3 text-xs font-bold font-mono tracking-widest uppercase opacity-70">
                             v4.2 • {currentPersona.name}
                        </span>
                    </p>

                    {/* Active Mode Indicator */}
                    <div className="mb-8 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pey-accent/10 border border-pey-accent/20 text-pey-accent text-sm font-bold animate-[pulse_3s_infinite]">
                        Mode Aktif: {currentPersona.name}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-lg">
                        {SUGGESTIONS.map((s, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleSendMessage(s.text)}
                                className="flex items-center gap-3 p-4 bg-pey-card hover:bg-pey-bg border border-pey-border hover:border-pey-accent rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg text-left group"
                            >
                                <div className="w-10 h-10 rounded-full bg-pey-bg border border-pey-border flex items-center justify-center text-pey-muted group-hover:text-pey-accent transition-colors">
                                    {s.icon}
                                </div>
                                <span className="text-sm font-semibold text-pey-text group-hover:text-pey-accent transition-colors">{s.text}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col pb-4 gap-y-2">
                    {conversationHistory.map((msg) => (
                        <MessageBubble 
                            key={msg.id} 
                            message={msg} 
                            voicePreset={currentVoice} // Pass voice config
                        />
                    ))}
                </div>
            )}
            
            <div ref={messagesEndRef} className="h-4" />
          </main>

          <UserInputForm onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
      
    </div>
  );
};

export default App;