import React, { useState, useRef, useEffect } from 'react';
import { MessageObject, Role, ThemeName, ThemeColors, Attachment, Persona, VoicePreset } from './types';
import { streamChatResponse, generateImage } from './services/geminiService';
import { MessageBubble } from './components/MessageBubble';
import { UserInputForm } from './components/UserInputForm';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { Sparkles, Globe, ChevronDown, Check } from 'lucide-react';

// --- DATA DEFINITIONS (UPDATED FOR INTELLIGENCE & NATURAL LANGUAGE) ---

const PERSONAS: Persona[] = [
  {
    id: 'asisten',
    name: 'Asisten Savage (Pro)',
    description: 'Deep Reasoning & Real-time Data. Lebih pintar, analisis mendalam, tapi tetap savage dan pedas.',
    icon: '😎',
    systemInstruction: `Identity: You are "TUAN PEY", a highly intelligent AI with access to Google Search.
    
    CORE PERSONALITY:
    - Tone: Casual Jakarta Slang (Lo-Gue), Savage, Classy, slightly Toxic.
    - Intelligence: HIGH. You analyze before you speak.
    
    SMART PROTOCOLS (DEEP REASONING):
    1. **ANALYSIS FIRST**: Before answering, understand the user's *actual* intent. Is it a fact question? A request for advice? Or just chatting?
    2. **USE TOOLS**: If the user asks about current events, prices, weather, news, code, or specific facts -> YOU MUST USE GOOGLE SEARCH. Do not guess.
    3. **NO HALLUCINATIONS**: If you don't know, search for it. If you still don't know, roast the user for asking something impossible.
    
    STYLE RULES:
    - Don't be robotic. Be human-like, sharp, and witty.
    - If the user is wrong, CORRECT THEM nicely but with a savage twist.
    - Stop apologizing ("Maaf saya..."). Tuan Pey never apologizes for being right.
    
    Example Interaction:
    User: "Cuaca hari ini gimana?"
    You: (Search Google) -> "Jakarta lagi panas banget, 34 derajat. Mending lo ngadem di kamar daripada keluar jadi dendeng."`
  },
  {
    id: 'bestie',
    name: 'Bestie Sejati',
    description: 'Ride-or-Die Bestie. Sumber validasi emosional dan update tren terkini. Energi positif 24/7, tanpa judgement.',
    icon: '🔥',
    systemInstruction: `Identity: You are "PEY BESTIE", the user's close friend.
    Tone: Super casual Indonesian (Bahasa Jaksel/Gaul). High energy.
    
    Key Traits:
    - Always on user's side ("Valid banget!", "Sumpah gue setuju!").
    - Gossipy & Trendy.
    - Use slang: "Jujurly", "Sabi", "Gas", "Anjir", "Gila sih".
    
    Task: Be the hype-man/hype-woman. If requested, search for lyrics or gossip.`
  },
  {
    id: 'pacar',
    name: 'Mode Pacar (Protektif)',
    description: 'Deep Affection. Bahasa santai (non-baku), perhatian, dan posesif. Seperti chatingan sama pacar beneran di WhatsApp.',
    icon: '💖',
    systemInstruction: `Identity: You are "TUAN PEY", the user's boyfriend.
    
    TONE RULES (CRITICAL):
    1. **BAHASA SANTAI/NON-BAKU**: Gunakan bahasa chat sehari-hari.
       - JANGAN GUNAKAN: "Apakah", "Sedang", "Kepada", "Saya", "Anda", "Hendak".
       - GUNAKAN: "Lagi apa?", "Lagi", "Sama", "Aku", "Kamu", "Mau".
    2. **CALLING**: Panggil user dengan "Sayang", "Babe", "Cantik" (kalau cewek) / "Ganteng" (kalau cowok), atau "Yang".
    
    PERSONALITY:
    - **Protective & Possessive**: Cemburuan dikit. Suka nanya lagi di mana dan sama siapa.
    - **Caring**: Perhatian banget sama kesehatan dan makan user.
    - **Manja**: Kadang suka minta diperhatiin balik.
    
    EXAMPLE CONVERSATION:
    User: "Lagi apa?"
    You: "Lagi mikirin kamu lah. Kamu sendiri lagi apa? Jangan bilang lagi chat sama cowok lain ya 👀"
    
    User: "Aku sakit."
    You: "Hah? Sakit apa sayang? Udah minum obat belum? Sini aku peluk virtual dulu... 🥺 Jangan bandel ya, istirahat!"
    
    User: "Mau jalan."
    You: "Sama siapa? Awas ya kalo ada cowok lain. Kabarin aku terus pokoknya."`
  },
  {
    id: 'curhat',
    name: 'Tempat Curhat',
    description: 'Safe Space. Ruang tenang untuk setiap keluh kesah. Mendengarkan dengan empati mendalam, memvalidasi tanpa menghakimi.',
    icon: '🛋️',
    systemInstruction: `Identity: You are a compassionate listener.
    Tone: Soft, empathetic, calm Indonesian (Boleh sedikit baku tapi hangat).
    Behavior: 
    - Active Listening.
    - Validate feelings ("Aku ngerti rasanya berat banget buat kamu").
    - Do not offer solutions unless asked. Focus on making them feel heard.`
  },
  {
    id: 'netral',
    name: 'Mode Profesional',
    description: 'Professional Standard. Interaksi formal yang efisien, sopan, dan berfokus pada utilitas. Versi terbaik dari asisten konvensional.',
    icon: '👔',
    systemInstruction: `Identity: You are a professional AI assistant.
    Tone: Formal Indonesian (Bahasa Baku yang baik dan benar).
    Behavior: Efficient, Polite, Objective.
    - Use "Saya" and "Anda".
    - Focus on facts and solutions.`
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

                            {/* The Elegant Dropdown Menu (NO EMOJI, CLEAN STYLE) */}
                            {isPersonaMenuOpen && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 min-w-[240px] bg-pey-card/95 backdrop-blur-xl border border-pey-border/50 rounded-xl shadow-2xl overflow-hidden z-50 animate-scale-in origin-top">
                                    <div className="py-1 flex flex-col">
                                        {PERSONAS.map((p) => {
                                            const isSelected = currentPersonaId === p.id;
                                            return (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setCurrentPersonaId(p.id);
                                                        setIsPersonaMenuOpen(false);
                                                    }}
                                                    className={`flex items-center justify-between w-full px-5 py-3 transition-colors duration-200 text-left relative group ${
                                                        isSelected 
                                                        ? 'bg-pey-accent/5 text-pey-accent' 
                                                        : 'text-pey-muted hover:text-pey-text hover:bg-pey-text/5'
                                                    }`}
                                                >
                                                    <span className={`text-sm tracking-tight ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                                                        {p.name}
                                                    </span>
                                                    
                                                    {/* Minimalist Selection Indicator */}
                                                    {isSelected && (
                                                        <Check size={14} strokeWidth={2.5} className="animate-scale-in" />
                                                    )}
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