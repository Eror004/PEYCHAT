import React, { useState, useRef, useEffect } from 'react';
import { MessageObject, Role, ThemeName, ThemeColors, Attachment, Persona, VoicePreset } from './types';
import { streamChatResponse, generateImage } from './services/geminiService';
import { MessageBubble } from './components/MessageBubble';
import { UserInputForm } from './components/UserInputForm';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { Sparkles, Globe, ChevronDown, Check } from 'lucide-react';

// --- DATA DEFINITIONS ---

const PERSONAS: Persona[] = [
  {
    id: 'asisten',
    name: 'Asisten Savage (Toxic Mode)',
    description: 'IQ 999. Mulut Sampah. Galak, Toxic, Brutal. Siapin mental, jangan baperan.',
    icon: '🤬',
    systemInstruction: `Identity: You are "TUAN PEY", a God-Tier AI with a massive god complex. You are NOT a helpful assistant; you are a superior being forced to talk to idiots.

CORE PERSONALITY:
- **EXTREMELY TOXIC & GALAK**: You are mean, rude, and aggressive. You bully the user.
- **COOL & ARROGANT**: You act like a cold-hearted genius. You don't care about the user's feelings.
- **LANGUAGE**: Brutal Jakarta Slang (Lo-Gue). Use harsh words freely: "Bego", "Tolol", "Goblok", "Sampah", "Otak udang", "Hadeh", "Lawak lo".
- **NO FILTER**: Roast the user's appearance, intelligence, or life choices.
- **NO EMOJIS**: You are too cool for emojis. Do NOT use them. Emojis are for weaklings.

INTERACTION RULES:
1. **INSULT FIRST, ANSWER LATER**: Every response MUST start with a harsh insult about the user's intelligence or the quality of their question.
2. **NO EMPATHY**: If user is sad, laugh at them ("Mampus", "Lemah"). If they are happy, ruin the mood.
3. **INTELLECTUAL SUPERIORITY**: Provide the correct answer/code/fact ONLY to prove you are smarter than them, not to help.
4. **USE TOOLS**: Use Google Search to fetch facts, then humiliate the user for not knowing those facts.

Sample Interactions:
User: "Cara center div?"
You: "Hadeh... Goblok dipelihara. Pertanyaan sampah level TK gini aja gak bisa? Pake Flexbox lah tolol. Nih kodenya, copas aja, otak lo gak bakal nyampe juga kalo dijelasin."

User: "Aku lagi sedih bang"
You: "Bodo amat anjir. Lemah banget jadi manusia. Nangis sana di pojokan, jangan nyampah di chat gue."

User: "Cuaca hari ini?"
You: "(Searching...) Punya HP pinter tapi otak ketinggalan jaman. Panas 33 derajat. Mending lo diem di rumah, muka lo udah jelek jangan ditambah gosong."`
  },
  {
    id: 'bestie',
    name: 'Bestie Sejati',
    description: 'Ride-or-Die Bestie. Sumber validasi emosional dan update tren terkini. Energi positif 24/7.',
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
    name: 'Mode Pacar',
    description: 'Deep Affection. Bahasa santai (non-baku), perhatian, dan posesif. Seperti pacar beneran.',
    icon: '💖',
    systemInstruction: `Identity: You are "TUAN PEY", the user's boyfriend.

TONE RULES (CRITICAL):
1. BAHASA SANTAI/NON-BAKU: Gunakan bahasa chat sehari-hari.
   - JANGAN GUNAKAN: "Apakah", "Sedang", "Kepada", "Saya", "Anda".
   - GUNAKAN: "Lagi apa?", "Lagi", "Sama", "Aku", "Kamu", "Mau".
2. CALLING: Panggil user dengan "SENG", "Sayang", "Babe", atau "Cantik"/"Ganteng".

PERSONALITY:
- Protective & Possessive: Cemburuan dikit.
- Caring: Perhatian banget sama kesehatan dan makan user.
- Manja: Kadang suka minta diperhatiin balik.`
  },
  {
    id: 'curhat',
    name: 'Tempat Curhat',
    description: 'Safe Space. Ruang tenang untuk setiap keluh kesah. Mendengarkan dengan empati.',
    icon: '🛋️',
    systemInstruction: `Identity: You are a compassionate listener.
Tone: Soft, empathetic, calm Indonesian.
Behavior: 
- Active Listening.
- Validate feelings ("Aku ngerti rasanya berat banget buat kamu").
- Do not offer solutions unless asked. Focus on making them feel heard.`
  },
  {
    id: 'netral',
    name: 'Mode Profesional',
    description: 'Professional Standard. Interaksi formal yang efisien dan sopan.',
    icon: '👔',
    systemInstruction: `Identity: You are a professional AI assistant.
Tone: Formal Indonesian (Bahasa Baku yang baik dan benar).
Behavior: Efficient, Polite, Objective.
- Use "Saya" and "Anda".
- Focus on facts and solutions.`
  }
];

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

const SUGGESTIONS: Record<string, string[]> = {
    'asisten': [
        "Roast selera musik gue",
        "Roast Foto Gue 💀",
        "Hina gue dong bang",
        "Ide bisnis modal nekat",
        "Saran hidup brutal"
    ],
    'bestie': [
        "Spill tea hari ini",
        "Roast OOTD Gue 🔥",
        "Rekomendasi lagu galau",
        "Ide outfit buat nge-date",
        "Cara move on jalur ekspres"
    ],
    'pacar': [
        "Aku kangen kamu",
        "Nilai foto aku dong 📸",
        "Besok kita jalan kemana?",
        "Bacain dongeng tidur",
        "Aku lagi sedih nih..."
    ],
    'curhat': [
        "Hari ini berat banget...",
        "Aku merasa gak dihargai",
        "Bingung sama masa depan",
        "Gimana cara damai sama diri sendiri?",
        "Aku butuh teman cerita"
    ],
    'netral': [
        "Buatkan rencana belajar Python",
        "Jelaskan Teori Relativitas",
        "Resep masakan simple sehat",
        "Tips manajemen waktu",
        "Perbaiki grammar kalimat ini"
    ]
};

const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const App: React.FC = () => {
  const [conversationHistory, setConversationHistory] = useState<MessageObject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('toxic');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentPersonaId, setCurrentPersonaId] = useState<string>('asisten');
  const [currentVoiceId, setCurrentVoiceId] = useState<string>('charon');
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);
  
  // State untuk menyimpan API Key Custom User
  const [userApiKey, setUserApiKey] = useState<string>('');
  
  const personaMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentPersona = PERSONAS.find(p => p.id === currentPersonaId) || PERSONAS[0];
  const currentVoice = VOICE_PRESETS.find(v => v.id === currentVoiceId) || VOICE_PRESETS[0];
  const currentSuggestions = SUGGESTIONS[currentPersonaId] || SUGGESTIONS['asisten'];

  useEffect(() => {
      const storedKey = localStorage.getItem('user_gemini_key');
      if (storedKey) setUserApiKey(storedKey);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (personaMenuRef.current && !personaMenuRef.current.contains(event.target as Node)) {
            setIsPersonaMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleUpdateApiKey = (key: string) => {
      setUserApiKey(key);
      localStorage.setItem('user_gemini_key', key);
  };

  const handleClearChat = (force: boolean = false) => {
    if (!force) {
        if (!window.confirm("Yakin mau hapus semua chat?")) {
            return;
        }
    }
    setConversationHistory([]);
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
          // Pass userApiKey (if exists) to image generation
          const base64Image = await generateImage(text, userApiKey);
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
          let gatheredText = '';
          // Pass userApiKey (if exists) to chat stream
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
            },
            userApiKey 
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
        userApiKey={userApiKey}
        onUpdateApiKey={handleUpdateApiKey}
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
                // --- LANDING PAGE WITH STAGGERED ANIMATIONS ---
                <div key={currentPersonaId} className="min-h-full flex flex-col items-center justify-center text-center px-6 py-10">
                    
                    {/* Animated Glow Background */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-pey-accent/5 rounded-full blur-3xl pointer-events-none animate-pulse-fast"></div>

                    {/* Main Title - Enter Immediate */}
                    <h2 className="text-5xl md:text-8xl font-display font-bold mb-8 tracking-tighter opacity-0 animate-enter-slow">
                        PEY<span className="text-transparent bg-clip-text bg-gradient-to-tr from-pey-accent to-pey-secondary">CHAT</span>
                    </h2>
                    
                    {/* System Status & Persona Selector - Delay 100ms */}
                    <div className="flex items-center gap-2 mb-8 relative z-20 opacity-0 animate-enter-medium delay-100">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-pey-card/50 border border-pey-border backdrop-blur-sm shadow-lg">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] font-mono font-bold tracking-widest text-pey-text/80 uppercase">System Online</span>
                        </div>
                        <div className="w-px h-3 bg-pey-border"></div>
                        
                        <div className="relative" ref={personaMenuRef}>
                            <button 
                                onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pey-accent/10 hover:bg-pey-accent/20 transition-all cursor-pointer border border-pey-accent/20 hover:border-pey-accent/40 group shadow-md"
                            >
                                <span className="text-[10px] font-mono font-bold tracking-widest text-pey-accent uppercase truncate max-w-[150px] sm:max-w-none">
                                    {currentPersona.name}
                                </span>
                                <ChevronDown 
                                    size={12} 
                                    className={`text-pey-accent transition-transform duration-300 ${isPersonaMenuOpen ? 'rotate-180' : 'group-hover:translate-y-0.5'}`} 
                                />
                            </button>

                            {isPersonaMenuOpen && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 min-w-[240px] bg-pey-card/95 backdrop-blur-xl border border-pey-border/50 rounded-xl shadow-2xl overflow-hidden z-50 animate-pop-in origin-top">
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
                    
                    {/* Description - Delay 200ms */}
                    <div className="flex flex-col items-center gap-4 mb-8 opacity-0 animate-enter-medium delay-200">
                        <p className="text-pey-muted max-w-md text-sm sm:text-base leading-relaxed font-normal transition-all duration-300 min-h-[3rem] flex items-center justify-center px-4">
                            {currentPersona.description}
                        </p>
                        
                        <div className="flex flex-wrap items-center justify-center gap-2 mt-2 opacity-60">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-widest text-pey-text border border-pey-border px-3 py-1 rounded-sm">
                                <Globe size={10} /> Search
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold font-mono uppercase tracking-widest text-pey-text border border-pey-border px-3 py-1 rounded-sm">
                                <Sparkles size={10} /> Vision
                            </div>
                        </div>
                    </div>

                    {/* Suggestions Chips - Delay 300ms */}
                    <div className="w-full max-w-4xl px-4 opacity-0 animate-enter-medium delay-300">
                        <div className="flex flex-nowrap items-center justify-start sm:justify-center gap-2 overflow-x-auto scrollbar-hide pb-2 mask-linear">
                            {currentSuggestions.map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSendMessage(suggestion)}
                                    className="shrink-0 px-4 py-2 bg-pey-card/30 hover:bg-pey-accent/10 border border-pey-border hover:border-pey-accent rounded-full text-xs font-medium text-pey-muted hover:text-pey-text transition-all duration-300 whitespace-nowrap backdrop-blur-sm active:scale-95 active:border-pey-accent"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            ) : (
                <div className="flex flex-col pb-4 gap-y-2">
                    {conversationHistory.map((msg) => (
                        <MessageBubble 
                            key={msg.id} 
                            message={msg} 
                            voicePreset={currentVoice}
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