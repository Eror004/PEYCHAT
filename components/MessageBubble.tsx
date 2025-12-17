import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageObject, Role, VoicePreset } from '../types';
import { Bot, User, Copy, Check, Volume2, StopCircle, Loader2, Terminal, Cpu } from 'lucide-react';

interface MessageBubbleProps {
  message: MessageObject;
  voicePreset?: VoicePreset; // Pass the selected voice config
}

// Utility to decode raw PCM from Gemini
const decodeAudio = async (base64Data: string): Promise<AudioBuffer> => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const dataInt16 = new Int16Array(bytes.buffer);
    const frameCount = dataInt16.length;
    const audioBuffer = audioContext.createBuffer(1, frameCount, 24000);
    const channelData = audioBuffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
    }
    return audioBuffer;
};

// Component khusus untuk Code Block (macOS Style)
const CodeBlock = ({ language, children }: { language: string, children?: React.ReactNode }) => {
    const [copied, setCopied] = useState(false);

    const handleCopyCode = () => {
        const textToCopy = typeof children === 'string' ? children : String(children);
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="my-4 rounded-xl overflow-hidden border border-pey-border/60 bg-[#0d0d0d] shadow-2xl relative group">
            {/* Code Header - Mac Style */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#151515] border-b border-pey-border/20">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                    </div>
                    <span className="ml-2 text-[10px] font-mono text-pey-muted uppercase tracking-wider opacity-60">
                        {language || 'TERMINAL'}
                    </span>
                </div>
                <button 
                    onClick={handleCopyCode} 
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-white/10 text-[10px] text-pey-muted hover:text-white transition-colors"
                >
                    {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
            {/* Code Body */}
            <div className="p-4 overflow-x-auto scrollbar-hide">
                <code className="font-mono text-sm text-[#e0e0e0] whitespace-pre leading-relaxed">
                    {children}
                </code>
            </div>
        </div>
    );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, voicePreset }) => {
  const isUser = message.role === Role.USER;
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioBufferSourceNode | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = async () => {
    if (speaking && audioSource) {
        try {
            audioSource.stop();
        } catch(e) {}
        setSpeaking(false);
        setAudioSource(null);
        return;
    }

    if (loadingAudio) return;

    try {
        setLoadingAudio(true);
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: message.text.slice(0, 400),
                voiceName: voicePreset?.geminiId || 'Fenrir'
            })
        });

        if (!response.ok) throw new Error("TTS Failed");

        const data = await response.json();
        if (data.audio) {
            const audioBuffer = await decodeAudio(data.audio);
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.onended = () => {
                setSpeaking(false);
                setAudioSource(null);
            };
            source.start(0);
            setAudioSource(source);
            setSpeaking(true);
        }
    } catch (error) {
        console.error("Audio playback error:", error);
        alert("Gagal memuat suara Tuan Pey. Coba lagi nanti.");
    } finally {
        setLoadingAudio(false);
    }
  };

  return (
    <div
      className={`group flex w-full mb-6 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      <div
        className={`flex flex-col gap-1 max-w-[95%] sm:max-w-[85%] md:max-w-[80%] ${
            isUser ? 'items-end' : 'items-start'
        }`}
      >
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            
            {/* Avatar */}
            <div
            className={`w-9 h-9 md:w-11 md:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border transition-transform hover:scale-105 ${
                isUser
                ? 'bg-pey-text border-pey-text text-pey-bg'
                : 'bg-pey-accent border-pey-accent text-pey-bg'
            }`}
            >
            {isUser ? <User size={18} strokeWidth={2.5} /> : <Bot size={20} strokeWidth={2.5} />}
            </div>

            {/* Content Bubble */}
            <div className="flex flex-col min-w-0 w-full">
                
            {/* Render Attachments if any */}
            {message.attachments && message.attachments.length > 0 && (
                <div className={`mb-2 flex flex-wrap gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    {message.attachments.map((att, idx) => (
                        <div key={idx} className="relative rounded-xl overflow-hidden border border-pey-border shadow-md max-w-full">
                            {att.type === 'image' ? (
                                <img src={att.previewUrl || `data:${att.mimeType};base64,${att.data}`} alt="attachment" className="max-h-64 object-cover" />
                            ) : att.type === 'video' ? (
                                <video controls className="max-h-64 max-w-full rounded-xl">
                                    <source src={att.previewUrl || `data:${att.mimeType};base64,${att.data}`} type={att.mimeType} />
                                    Your browser does not support video.
                                </video>
                            ) : (
                                <div className="p-4 bg-pey-card text-pey-text font-mono text-xs border border-pey-border">
                                    [File: {att.mimeType}]
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Text Bubble */}
            {(message.text || message.isStreaming) && (
                <div
                    className={`flex flex-col relative px-5 py-3.5 md:px-6 md:py-4 shadow-sm text-sm md:text-base leading-relaxed overflow-hidden ${
                    isUser
                        ? 'bg-pey-card text-pey-text rounded-3xl rounded-tr-sm border border-pey-border'
                        : 'bg-pey-card text-pey-text rounded-3xl rounded-tl-sm border border-pey-border'
                    }`}
                >
                    {/* Header Name for Bot */}
                    {!isUser && (
                    <span className="text-[10px] font-display font-bold text-pey-accent mb-2 tracking-widest opacity-90 uppercase">
                        TUAN PEY
                    </span>
                    )}

                    {isUser ? (
                    <p className="whitespace-pre-wrap font-sans font-medium">{message.text}</p>
                    ) : (
                    <div className="prose prose-sm md:prose-base max-w-none break-words
                        prose-p:text-pey-text prose-headings:text-pey-text prose-strong:text-pey-accent prose-strong:font-bold
                        prose-pre:bg-transparent prose-pre:p-0 prose-pre:m-0 prose-pre:border-none
                        prose-code:text-pey-secondary prose-code:bg-pey-bg/50 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                        prose-a:text-pey-accent prose-a:underline">
                        <ReactMarkdown
                            components={{
                                code(props) {
                                    const {children, className, node, ...rest} = props
                                    const match = /language-(\w+)/.exec(className || '')
                                    // Jika code block (ada language atau multi-line), render component CodeBlock custom
                                    const isCodeBlock = match || (String(children).includes('\n'));
                                    
                                    return isCodeBlock ? (
                                        <CodeBlock language={match ? match[1] : ''}>
                                            {String(children).replace(/\n$/, '')}
                                        </CodeBlock>
                                    ) : (
                                        <code {...rest} className={className}>
                                            {children}
                                        </code>
                                    )
                                },
                                // Custom renderer for Tables to ensure horizontal scroll on mobile
                                table(props) {
                                    return (
                                        <div className="overflow-x-auto my-4 border border-pey-border rounded-lg bg-black/20">
                                            <table {...props} className="w-full text-left border-collapse" />
                                        </div>
                                    )
                                }
                            }}
                        >
                            {message.text}
                        </ReactMarkdown>
                    </div>
                    )}
                </div>
            )}

            {/* Action Footer (Only for Bot & when not streaming) */}
            {!isUser && !message.isStreaming && message.text && (
                <div className="flex items-center gap-2 mt-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg text-pey-muted hover:text-pey-text hover:bg-pey-card border border-transparent hover:border-pey-border transition-all"
                    title="Copy Text"
                >
                    {copied ? <Check size={14} className="text-pey-accent" /> : <Copy size={14} />}
                </button>
                
                <button
                    onClick={handleSpeak}
                    className={`p-1.5 rounded-lg transition-all border border-transparent flex items-center gap-1 ${speaking || loadingAudio ? 'text-pey-accent bg-pey-accent/10 border-pey-accent/20' : 'text-pey-muted hover:text-pey-text hover:bg-pey-card hover:border-pey-border'}`}
                    title="Play Voice (AI)"
                >
                    {loadingAudio ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : speaking ? (
                        <StopCircle size={14} className="animate-pulse" />
                    ) : (
                        <Volume2 size={14} />
                    )}
                </button>
                
                <span className="text-[10px] text-pey-muted ml-auto font-mono bg-pey-card px-2 py-1 rounded-full border border-pey-border">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                </div>
            )}
            
            {/* User Timestamp */}
            {isUser && (
                <span className="text-[10px] text-pey-muted mt-2 mr-1 text-right font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            )}

            {/* DEEP THINKING / PROCESSING ANIMATION V2 */}
            {message.isStreaming && !isUser && (
                <div className="flex items-center gap-3 mt-3 ml-2 animate-pulse">
                    <div className="relative flex items-center justify-center w-5 h-5">
                         <div className="absolute inset-0 bg-pey-accent opacity-20 rounded-full animate-ping"></div>
                         <Cpu size={16} className="text-pey-accent relative z-10 animate-[spin_3s_linear_infinite]" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-pey-accent font-mono tracking-widest">
                            PROCESSING
                        </span>
                        <div className="h-0.5 w-16 bg-pey-border mt-1 rounded-full overflow-hidden">
                             <div className="h-full bg-pey-accent w-1/3 animate-[slideInLeft_1s_infinite]"></div>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
      </div>
    </div>
  );
};