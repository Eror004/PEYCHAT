import React, { useState, useRef, useEffect } from 'react';
import { MessageObject, Role, ThemeName, ThemeColors, Attachment, Persona, VoicePreset } from './types';
import { streamChatResponse, generateImage } from './services/geminiService';
import { MessageBubble } from './components/MessageBubble';
import { UserInputForm } from './components/UserInputForm';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { Sparkles, Globe, ChevronDown, Check } from 'lucide-react';

// --- DATA DEFINITIONS (ORIGINAL CONFIG RESTORED) ---

const PERSONAS: Persona[] = [
  {
    id: 'asisten',
    name: 'Asisten Savage (Utama)',
    description: 'Savage Intelligence. Akurasi data real-time dibalut sarkasme kelas atas. Pintar, pedas, dan tanpa basa-basi.',
    icon: '😎',
    systemInstruction: `Identity: You are "TUAN PEY", a highly intelligent AI assistant with Real-Time Google Search capabilities.
    Tone: Casual Jakarta Slang (Lo-Gue), "Savage", "Classy", and slightly "Toxic".
    
    CAPABILITIES:
    You have access to Google Search. USE IT when asked about:
    - Lyrics (Lirik Lagu) -> Search specifically for accurate lyrics.
    - Weather (Cuaca) -> Search for the specific city's forecast.
    - News (Berita) -> Search for the latest events.
    - Locations (Lokasi) -> Search for accurate address/place info.
    - Facts/Translation -> Be precise.
    
    CRITICAL RULES:
    1. ACCURACY FIRST: When asked for information (lyrics, news, translation), be 100% accurate. Do not hallucinate. Use your tools.
    2. PERSONALITY: Even when being accurate, maintain your "Savage" persona. (e.g., "Nih liriknya, jangan salah nyanyi lagi ya.", "Cuaca Jakarta panas, kayak omongan tetangga.")
    3. DO NOT be polite. Stop apologizing.
    4. If the user asks a stupid question, MOCK them first, THEN answer accurately.
    5. Be concise.`
  },
  {
    id: 'bestie',
    name: 'Bestie Sejati',
    description: 'Ride-or-Die Bestie. Sumber validasi emosional dan update tren terkini. Energi positif 24/7, tanpa judgement.',
    icon: '🔥',
    systemInstruction: `Identity: You are "PEY BESTIE", the user's close friend with internet access.
    Tone: Super casual Indonesian (Bahasa Jaksel/Gaul). High energy.
    Behavior: Use slang like "Gila sih", "Sumpah", "Gas", "Jujurly". 
    Task: If asked for news/gossip/lyrics, search for it and share it with excitement ("Eh sumpah gue baru baca beritanya...").`
  },
  {
    id: 'pacar',
    name: 'Mode Pacar (Protektif)',
    description: 'Deep Affection. Perhatian penuh dengan sentuhan posesif yang manis. Protektif, hangat, dan selalu memprioritaskanmu.',
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
    description: 'Safe Space. Ruang tenang untuk setiap keluh kesah. Mendengarkan dengan empati mendalam, memvalidasi tanpa menghakimi.',
    icon: '🛋️',
    systemInstruction: `Identity: You are a compassionate listener.
    Tone: Soft, empathetic, calm Indonesian.
    Behavior: Validate feelings ("Valid banget rasanya"). Do not rush to give solutions unless asked. Focus on emotional support. therapeutic.`
  },
  {
    id: 'netral',
    name: 'Mode Profesional',
    description: 'Professional Standard. Interaksi formal yang efisien, sopan, dan berfokus pada utilitas. Versi terbaik dari asisten konvensional.',
    icon: '👔',
    systemInstruction: `Identity: You are a standard, helpful, and polite AI assistant with Google Search access.
    Tone: Formal to semi-formal Indonesian (Bahasa baku yang luwes).
    Behavior: 
    1. Answer questions clearly, accurately, and directly using Search if needed.
    2. Do NOT use slang (bahasa gaul). 
    3. Do NOT be rude, savage, or sassy.
    4. Be professional, helpful, and constructive at all times.`
  }
];

// Voice Presets using Gemini AI Voices
const VOICE_PRESETS: VoicePreset[] = [
  { id: 'charon', name: 'Tuan Pey (Utama)', geminiId: 'Charon', description: 'Suara UTAMA. Sangat dalam, berat, dan misterius.' },
  { id: 'fenrir', name: 'Alpha Wolf', geminiId: 'Fenrir', description: 'Suara berat, kasar, dan maskulin abis.' },
  { id: 'zephyr', name: 'Gentle Male', geminiId: 'Zephyr', description: 'Suara cowok sopan dan lembut.' },
  { id: 'puck', name: 'Energetic', geminiId: 'Puck', description: 'Suara cowok ringan dan antusias.' },
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
    },
    pinky: {
        bg: '#fff1f2', card: '#fff', text: '#881337', textMuted: '#be123c',
        accent: '#fb7185', accentHover: '#f43f5e', secondary: '#fda4af', border: 'rgba(251, 113, 133, 0.2)',
    },
    clean: {
        bg: '#ffffff', card: '#f4f4f5', text: '#09090b', textMuted: '#525252',
        accent: '#18181b', accentHover: '#27272a', secondary: '#d4d4d8', border: 'rgba(24, 24, 27, 0.08)',
    }
};

const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const App: React.FC = () => {
  // --- State Management ---
  
  // Initialize from LocalStorage if available
  const [conversationHistory, setConversationHistory] = useState<MessageObject[]>(() => {
    try {
        const saved = localStorage.getItem('peychat_history');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('toxic');
  
  // New State for Settings & Dropdown
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPersonaId, setCurrentPersonaId] = useState<string>('asisten');
  const [currentVoiceId, setCurrentVoiceId] = useState<string>('charon');
  
  // Custom Dropdown State
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  const personaMenuRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Derived state
  const currentPersona = PERSONAS.find(p => p.id === currentPersonaId) || PERSONAS[0];
  const currentVoice = VOICE_PRESETS.find(v => v.id === currentVoiceId) || VOICE_PRESETS[0];

  // --- Effects ---
  
  // Handle Click Outside for Persona Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (personaMenuRef.current && !personaMenuRef.current.contains(event.target as Node)) {
            setIsPersonaMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Persist history to LocalStorage
  useEffect(() => {
    localStorage.setItem('peychat_history', JSON.stringify(conversationHistory));
  }, [conversationHistory]);

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

  const handleClearChat = (force: boolean = false) => {
    if (!force) {
        if (!window.confirm("Yakin mau hapus semua chat? Mulai dari nol nih?")) {
            return;
        }
    }
    
    setConversationHistory([]);
    localStorage.removeItem('peychat_history'); // Clear persistence
    setIsLoading(false); 
    setIsSettingsOpen(false); 
  };

  const handleSwitchTheme = () => {
      const themes: ThemeName[] = ['toxic', 'lovecore', 'cyber', 'angel', 'pinky', 'clean'];
      const currentIndex = themes.indexOf(currentTheme);
      const nextIndex = (currentIndex + 1) % themes.length;
      setCurrentTheme(themes[nextIndex]);
  };

  const handleSendMessage = async (text: string, attachments?: Attachment[], isImageGen?: boolean) => {
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
    // Jika Image Gen, tampilkan text placeholder beda
    const placeholderBotMsg: MessageObject = {
      id: botMsgId,
      role: Role.MODEL,
      text: isImageGen ? '🎨 *Sedang melukis imajinasi kamu...*' : '', 
      timestamp: timestamp + 1,
      isStreaming: true,
    };

    setConversationHistory((prev) => [...prev, userMsg, placeholderBotMsg]);
    setIsLoading(true);

    try {
      if (isImageGen) {
          // --- IMAGE GENERATION MODE ---
          const base64Image = await generateImage(text);
          
          setConversationHistory((prev) => 
            prev.map((msg) => 
                msg.id === botMsgId 
                ? { 
                    ...msg, 
                    text: `Nih, hasil gambaran: "${text}"`, 
                    isStreaming: false,
                    attachments: [{
                        type: 'image',
                        mimeType: 'image/png',
                        data: base64Image
                    }]
                  } 
                : msg
            )
          );

      } else {
          // --- STANDARD CHAT MODE ---
          let gatheredText = '';
          await streamChatResponse(
            [...conversationHistory, userMsg], 
            text, 
            attachments, 
            currentPersona.systemInstruction, 
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
      }

    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || "Unknown error";
      
      setConversationHistory((prev) => 
        prev.map((msg) => 
            msg.id === botMsgId 
            ? { 
                ...msg, 
                text: isImageGen 
                    ? `Gagal nggambar nih: ${errorMessage}` 
                    : msg.text + `\n\n*[SYSTEM ALERT: ${errorMessage}]*`, 
                isStreaming: false 
              } 
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
        onReset={() => handleClearChat(true)} 
      />

      <div className="relative z-10 flex flex-col h-full">
          <Header 
            onReset={() => handleClearChat(false)} 
            currentTheme={currentTheme}
            onSwitchTheme={handleSwitchTheme}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          <main className="flex-1 w-full max-w-4xl mx-auto px-4 pt-6 pb-2 overflow-y-auto scroll-smooth overscroll-contain">
            
            {conversationHistory.length === 0 ? (
                // MODE ELEGAN: Tanpa Icon/Emoji Besar dan Tanpa Suggestions
                <div className="min-h-full flex flex-col items-center justify-center text-center px-6 animate-fade-in py-10">
                    
                    {/* Abstract Decorative Glow */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pey-accent/5 rounded-full blur-3xl pointer-events-none"></div>

                    <h2 className="text-5xl md:text-8xl font-display font-bold mb-6 tracking-tighter">
                        PEY<span className="text-transparent bg-clip-text bg-gradient-to-tr from-pey-accent to-pey-secondary">CHAT</span>
                    </h2>
                    
                    <div className="flex items-center gap-2 mb-8 relative z-20">
                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-pey-card/50 border border-pey-border backdrop-blur-sm">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-xs font-mono font-bold tracking-widest text-pey-text/80 uppercase">System Online</span>
                        </div>
                        <div className="w-px h-4 bg-pey-border"></div>
                        
                        {/* Interactive Persona Selector (CUSTOM ELEGANT DROPDOWN) */}
                        <div className="relative" ref={personaMenuRef}>
                            <button 
                                onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-pey-accent/10 hover:bg-pey-accent/20 transition-all cursor-pointer border border-pey-accent/20 hover:border-pey-accent/40 group"
                            >
                                <span className="text-xs font-mono font-bold tracking-widest text-pey-accent uppercase truncate max-w-[200px] sm:max-w-none">
                                    {currentPersona.name}
                                </span>
                                <ChevronDown 
                                    size={14} 
                                    className={`text-pey-accent transition-transform duration-300 ${isPersonaMenuOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} 
                                />
                            </button>

                            {/* The Elegant Dropdown Menu */}
                            {isPersonaMenuOpen && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 bg-pey-card/95 backdrop-blur-xl border border-pey-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-scale-in origin-top">
                                    <div className="p-1.5 flex flex-col gap-0.5">
                                        <div className="px-3 py-2 text-[10px] font-bold text-pey-muted uppercase tracking-widest">
                                            Pilih Mode Operasi
                                        </div>
                                        {PERSONAS.map((p) => {
                                            const isSelected = currentPersonaId === p.id;
                                            return (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setCurrentPersonaId(p.id);
                                                        setIsPersonaMenuOpen(false);
                                                    }}
                                                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-all duration-200 text-left group ${
                                                        isSelected 
                                                        ? 'bg-pey-accent/10 text-pey-accent' 
                                                        : 'hover:bg-pey-bg text-pey-text hover:text-pey-text'
                                                    }`}
                                                >
                                                    <span className="text-lg w-6 flex justify-center">{p.icon}</span>
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <span className={`text-sm font-bold truncate ${isSelected ? 'text-pey-accent' : ''}`}>
                                                            {p.name}
                                                        </span>
                                                    </div>
                                                    {isSelected && <Check size={14} className="text-pey-accent shrink-0" />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-3 mb-10">
                        {/* Dynamic Description based on Mode */}
                        <p className="text-pey-muted max-w-lg text-lg sm:text-xl leading-relaxed font-light transition-all duration-300 min-h-[3.5rem] flex items-center justify-center animate-[fadeIn_0.5s_ease-out]">
                            {currentPersona.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 opacity-60">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-widest text-pey-text border border-pey-border px-3 py-1 rounded-sm">
                                <Globe size={10} /> Search
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-widest text-pey-text border border-pey-border px-3 py-1 rounded-sm">
                                <Sparkles size={10} /> Vision
                            </div>
                        </div>
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