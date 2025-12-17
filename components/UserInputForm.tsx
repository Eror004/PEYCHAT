import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, FileVideo, Mic, MicOff, Palette, Sparkles, Flame, Plus, Square, Trash2, Check, StopCircle } from 'lucide-react';
import { Attachment } from '../types';

interface UserInputFormProps {
  onSendMessage: (text: string, attachments?: Attachment[], isImageGen?: boolean) => void;
  onStop: () => void;
  isLoading: boolean;
}

// Komponen Visualizer Sederhana (CSS Animation)
const AudioVisualizer = () => {
  return (
    <div className="flex items-center gap-1 h-8 px-4">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="w-1 bg-pey-accent rounded-full animate-[pulse_0.8s_ease-in-out_infinite]"
          style={{
            height: `${Math.max(20, Math.random() * 100)}%`,
            animationDelay: `${i * 0.05}s`,
            animationDuration: `${0.4 + Math.random() * 0.5}s`
          }}
        />
      ))}
    </div>
  );
};

// UTILITY: Client-Side Image Compression
const compressImage = (file: File): Promise<{ data: string; mimeType: string; previewUrl: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Resize lebar ke max 800px (Hemat Kuota)
        const scale = MAX_WIDTH / img.width;
        
        // Jika gambar kecil, jangan di-upscale
        const width = scale < 1 ? MAX_WIDTH : img.width;
        const height = scale < 1 ? img.height * scale : img.height;

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Kompresi ke JPEG kualitas 60% (Sangat Hemat Kuota)
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6); 
            resolve({
                data: compressedDataUrl.split(',')[1],
                mimeType: 'image/jpeg',
                previewUrl: compressedDataUrl
            });
        } else {
            reject(new Error("Canvas context failed"));
        }
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export const UserInputForm: React.FC<UserInputFormProps> = ({ onSendMessage, onStop, isLoading }) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  
  // Voice State
  const [isListening, setIsListening] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [tempTranscript, setTempTranscript] = useState('');
  
  const [isImageMode, setIsImageMode] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roastInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const timerRef = useRef<number | null>(null);

  // Close tools menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (formRef.current && !formRef.current.contains(event.target as Node)) {
            setShowTools(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Timer Logic
  useEffect(() => {
    if (isListening) {
      timerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'id-ID'; 

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // Update transcript real-time visualization
            setTempTranscript(interimTranscript || finalTranscript);

            if (finalTranscript) {
                setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
                setTempTranscript(''); // Reset temp visualizer text after finalized
            }
        };

        recognition.onend = () => {
            // Jika mati sendiri tapi user belum klik stop, biarkan state UI handle
            // Kecuali jika error, handler onError yang akan mengurus
        };
        
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            
            // Ignore no-speech errors (common when silence)
            if (event.error === 'no-speech') {
                return;
            }

            setIsListening(false);
            
            if (event.error === 'not-allowed') {
                alert("Akses mikrofon ditolak! Mohon izinkan akses mikrofon di pengaturan browser Anda (klik ikon gembok/pengaturan di address bar).");
            } else if (event.error === 'service-not-allowed') {
                alert("Layanan suara tidak diizinkan oleh browser.");
            } else if (event.error === 'network') {
                alert("Masalah jaringan saat mencoba mengenali suara.");
            } else {
                // Log other errors but maybe don't alert to avoid spamming user
                console.warn("Unhandled speech error:", event.error);
            }
        };

        recognitionRef.current = recognition;
    }
    
    return () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.abort();
            } catch (e) {
                // ignore
            }
        }
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const startListening = () => {
    if (!recognitionRef.current) {
        alert("Browser kamu gak support fitur suara nih. Coba pake Chrome/Edge ya!");
        return;
    }
    
    try {
        setIsListening(true);
        setTempTranscript('');
        recognitionRef.current.start();
    } catch (e) {
        console.error("Failed to start recognition:", e);
        setIsListening(false);
        alert("Gagal memulai mikrofon. Coba refresh halaman.");
    }
  };

  const stopListening = (save: boolean) => {
    if (recognitionRef.current) {
        try {
            recognitionRef.current.stop();
        } catch (e) {
            // ignore if already stopped
        }
    }
    setIsListening(false);
    
    if (!save) {
        setInput(''); // Clear input if cancelled
        setTempTranscript('');
    }
    // If save is true, text is already in 'input' state from onresult
  };

  const toggleImageMode = () => {
      setIsImageMode(!isImageMode);
      if (!isImageMode) {
          setAttachment(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
      setShowTools(false);
  };

  const processFile = async (file: File, isRoast: boolean = false) => {
    const MAX_SIZE_MB = 10; // Allow larger initial selection because we compress
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Waduh, gambarnya kegedean! Maksimal ${MAX_SIZE_MB}MB ya.`);
      return;
    }

    const mimeType = file.type;
    let type: 'image' | 'video' | 'file' = 'file';
    
    if (mimeType.startsWith('image/')) {
        type = 'image';
        setIsCompressing(true);
        try {
            // COMPRESS IMAGE HERE
            const compressed = await compressImage(file);
            setAttachment({
                mimeType: compressed.mimeType,
                data: compressed.data,
                previewUrl: compressed.previewUrl,
                type: 'image'
            });
        } catch (error) {
            console.error("Compression failed:", error);
            alert("Gagal memproses gambar. Coba gambar lain.");
        } finally {
            setIsCompressing(false);
        }
    } else if (mimeType.startsWith('video/')) {
        // Video tidak dikompresi di client (terlalu berat), baca raw base64
        type = 'video';
        const reader = new FileReader();
        reader.onload = (event) => {
            const base64String = (event.target?.result as string).split(',')[1];
            setAttachment({
                mimeType,
                data: base64String,
                previewUrl: URL.createObjectURL(file),
                type: 'video'
            });
        };
        reader.readAsDataURL(file);
    }

    if (isRoast) {
        setInput("Roast vibe foto ini! Nilai outfit, background, & estetikanya sesuai persona lo! 💀🔥");
        setTimeout(() => textareaRef.current?.focus(), 100);
    }
    setShowTools(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isImageMode) {
        alert("Matikan mode lukis dulu kalau mau kirim gambar!");
        return;
    }
    const file = e.target.files?.[0];
    if (file) {
        processFile(file, false);
        e.target.value = '';
    }
  };

  const handleRoastSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isImageMode) setIsImageMode(false);
    const file = e.target.files?.[0];
    if (file) {
        processFile(file, true);
        e.target.value = '';
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (roastInputRef.current) roastInputRef.current.value = '';
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Jika loading, tombol jadi STOP
    if (isLoading) {
        onStop();
        return;
    }
    
    // Jika recording, stop dan kirim
    if (isListening) {
        stopListening(true);
        // Delay sedikit agar state terupdate sebelum kirim (optional, usually instant)
        setTimeout(() => {
            if (input.trim()) onSendMessage(input.trim(), undefined, isImageMode);
            setInput('');
        }, 200);
        return;
    }

    if ((!input.trim() && !attachment) || isLoading || isCompressing) return;

    onSendMessage(input.trim(), attachment ? [attachment] : undefined, isImageMode);
    setInput('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = ''; 
    if (roastInputRef.current) roastInputRef.current.value = '';
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine Right Button Icon
  const canSend = (input.trim().length > 0 || attachment !== null) && !isCompressing;
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4 shrink-0">
      
      {/* Hidden Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*" />
      <input type="file" ref={roastInputRef} onChange={handleRoastSelect} className="hidden" accept="image/*" />

      {/* Mode Indicator (Floating) */}
      {isImageMode && !isListening && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest text-white bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-0.5 rounded-full shadow-lg animate-pulse flex items-center gap-1 z-20">
              <Sparkles size={10} /> MODE IMAJINASI
          </div>
      )}

      {/* Preview Area (Compact) */}
      {(attachment || isCompressing) && !isListening && (
        <div className="mb-2 ml-10 inline-flex relative group animate-[scaleIn_0.2s_ease-out] origin-bottom-left z-0">
          <div className="relative h-16 rounded-xl overflow-hidden border border-pey-border/50 shadow-lg bg-black/40 backdrop-blur-md">
            {isCompressing ? (
                 <div className="h-full px-4 flex items-center justify-center gap-2 text-xs text-pey-accent">
                    <Sparkles size={14} className="animate-spin" />
                    <span>Kompresi...</span>
                 </div>
            ) : attachment ? (
                <>
                    {attachment.type === 'image' ? (
                    <img src={attachment.previewUrl} alt="Preview" className="h-full w-auto object-cover opacity-90" />
                    ) : attachment.type === 'video' ? (
                    <div className="h-full w-20 flex items-center justify-center text-pey-accent">
                        <FileVideo size={24} />
                    </div>
                    ) : (
                    <div className="h-full px-3 flex items-center justify-center text-pey-text text-xs">
                        File
                    </div>
                    )}
                    <button 
                    onClick={removeAttachment}
                    className="absolute top-0.5 right-0.5 bg-black/60 hover:bg-red-500 text-white rounded-full p-0.5 transition-colors"
                    >
                    <X size={10} />
                    </button>
                </>
            ) : null}
          </div>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={`relative flex items-end gap-2 p-1.5 bg-pey-card/60 backdrop-blur-xl border transition-all duration-300 rounded-[26px] shadow-2xl ${
            isListening 
            ? 'border-pey-accent/50 ring-2 ring-pey-accent/20 bg-pey-card' 
            : isImageMode 
                ? 'border-purple-500/30 ring-1 ring-purple-500/20'
                : 'border-pey-border/60 focus-within:border-pey-accent/50 focus-within:ring-1 focus-within:ring-pey-accent/20'
        }`}
      >
        
        {/* === RECORDING OVERLAY === */}
        {isListening ? (
             <div className="absolute inset-0 z-20 flex items-center justify-between px-2 bg-pey-card rounded-[26px]">
                {/* Left: Delete / Cancel */}
                <button
                    type="button"
                    onClick={() => stopListening(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full text-red-500 hover:bg-red-500/10 transition-colors animate-scale-in"
                    title="Batal"
                >
                    <Trash2 size={20} />
                </button>

                {/* Center: Visualizer & Timer */}
                <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                         <span className="text-xs font-mono font-bold text-pey-text">{formatTime(recordingDuration)}</span>
                    </div>
                    {/* Live Transcript Preview or Status */}
                    <div className="h-5 overflow-hidden w-full flex justify-center">
                        {tempTranscript ? (
                             <p className="text-[10px] text-pey-text truncate max-w-[200px] animate-fade-in">{tempTranscript}</p>
                        ) : (
                             <AudioVisualizer />
                        )}
                    </div>
                </div>

                {/* Right: Done / Send (Replaces normal send button visually) */}
                 <button
                    type="button"
                    onClick={() => handleSubmit()}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-pey-accent text-pey-bg hover:scale-105 transition-transform animate-scale-in"
                    title="Selesai & Kirim"
                >
                    <Send size={20} className="ml-0.5" />
                </button>
             </div>
        ) : null}

        {/* LEFT: Toggle Tools Button */}
        <div className={`relative flex items-center justify-center h-[46px] w-[46px] shrink-0 ${isListening ? 'invisible' : ''}`}>
             <button
                type="button"
                onClick={() => setShowTools(!showTools)}
                disabled={isLoading}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${
                    showTools 
                    ? 'bg-pey-text text-pey-bg rotate-45' 
                    : 'text-pey-muted hover:text-pey-text hover:bg-pey-text/10'
                }`}
            >
                <Plus size={20} />
            </button>

            {/* FLOATING TOOLS MENU */}
            <div className={`absolute bottom-full left-0 mb-3 flex flex-col gap-2 p-1.5 bg-pey-card/90 backdrop-blur-2xl border border-pey-border rounded-full shadow-xl transition-all duration-300 origin-bottom-left z-50 ${
                showTools 
                ? 'opacity-100 scale-100 translate-y-0' 
                : 'opacity-0 scale-75 translate-y-4 pointer-events-none'
            }`}>
                 
                 {/* Upload */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2.5 rounded-full transition-all ${isImageMode ? 'opacity-30 cursor-not-allowed' : 'text-pey-text hover:bg-pey-accent hover:text-pey-bg'}`}
                    title="Upload Media (Hemat Kuota: Auto Compress)"
                >
                    <Paperclip size={18} />
                </button>

                {/* Roast Mode */}
                <button
                    type="button"
                    onClick={() => roastInputRef.current?.click()}
                    className={`p-2.5 rounded-full transition-all ${isImageMode ? 'opacity-30 cursor-not-allowed' : 'text-orange-500 hover:bg-orange-500 hover:text-white'}`}
                    title="Roast My Vibe 🔥"
                >
                    <Flame size={18} />
                </button>

                {/* Image Gen Mode */}
                <button
                    type="button"
                    onClick={toggleImageMode}
                    className={`p-2.5 rounded-full transition-all ${
                        isImageMode 
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/40' 
                        : 'text-purple-400 hover:bg-purple-500 hover:text-white'
                    }`}
                    title="Mode Imajinasi"
                >
                    <Palette size={18} />
                </button>
            </div>
        </div>
        
        {/* CENTER: Text Input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
              isImageMode
              ? "Lukis apa hari ini..."
              : "Tanya TUAN PEY..."
          }
          rows={1}
          className={`flex-1 bg-transparent text-pey-text placeholder-pey-muted/50 px-1 py-3 focus:outline-none resize-none max-h-32 min-h-[46px] font-sans font-medium text-base leading-relaxed ${isListening ? 'opacity-0' : ''}`}
          disabled={isLoading || isListening}
        />

        {/* RIGHT: Contextual Action Button */}
        <button
          type={isLoading ? "button" : "submit"} // Change type to avoid auto-submit logic on click if just mic
          onClick={(e) => {
              if (isLoading) {
                  onStop(); // Stop Generation
              } else if (!canSend && !isImageMode) {
                  e.preventDefault(); // Prevent submit form
                  startListening(); // Start Mic
              }
              // Else let the form submit normally
          }}
          className={`w-[46px] h-[46px] rounded-[20px] transition-all duration-300 flex items-center justify-center shrink-0 shadow-lg ${
             isLoading
                ? 'bg-red-500 text-white hover:bg-red-600 hover:scale-105' // STOP BUTTON
                : canSend
                    ? isImageMode 
                        ? 'bg-gradient-to-tr from-purple-500 to-pink-500 text-white hover:scale-105'
                        : 'bg-pey-text text-pey-bg hover:bg-pey-accent hover:scale-105'
                    : isListening // Should be handled by overlay, but just in case
                        ? 'bg-transparent opacity-0'
                        : 'bg-transparent text-pey-muted hover:text-pey-text hover:bg-pey-text/5'
          }`}
          title={isLoading ? "Stop Bacot" : canSend ? "Kirim" : "Tahan Bacot (Klik)"}
        >
          {isLoading ? (
             <Square size={20} fill="currentColor" />
          ) : (
            canSend ? (
               isImageMode ? <Sparkles size={20} fill="currentColor" /> : <Send size={20} className="ml-0.5" fill="currentColor" />
            ) : (
               <Mic size={22} />
            )
          )}
        </button>

      </form>
    </div>
  );
};