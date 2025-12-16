import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, FileVideo, Mic, MicOff, Palette, Sparkles, Flame, Plus } from 'lucide-react';
import { Attachment } from '../types';

interface UserInputFormProps {
  onSendMessage: (text: string, attachments?: Attachment[], isImageGen?: boolean) => void;
  isLoading: boolean;
}

export const UserInputForm: React.FC<UserInputFormProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [showTools, setShowTools] = useState(false); // State untuk menu tools
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const roastInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const formRef = useRef<HTMLFormElement>(null);

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

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'id-ID'; 

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript) {
                setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
            }
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Browser kamu gak support fitur suara nih. Coba pake Chrome/Edge ya!");
        return;
    }

    if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
    } else {
        recognitionRef.current.start();
        setIsListening(true);
    }
  };

  const toggleImageMode = () => {
      setIsImageMode(!isImageMode);
      if (!isImageMode) {
          setAttachment(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
      setShowTools(false); // Auto close menu
  };

  const processFile = (file: File, isRoast: boolean = false) => {
    const MAX_SIZE_MB = 3;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Waduh, gambarnya kegedean! Maksimal ${MAX_SIZE_MB}MB ya.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (roastInputRef.current) roastInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = (event.target?.result as string).split(',')[1];
      const mimeType = file.type;
      
      let type: 'image' | 'video' | 'file' = 'file';
      if (mimeType.startsWith('image/')) type = 'image';
      else if (mimeType.startsWith('video/')) type = 'video';

      setAttachment({
        mimeType,
        data: base64String,
        previewUrl: URL.createObjectURL(file),
        type
      });

      if (isRoast) {
          setInput("Roast vibe foto ini! Nilai outfit, background, & estetikanya sesuai persona lo! 💀🔥");
          setTimeout(() => textareaRef.current?.focus(), 100);
      }
      setShowTools(false); // Auto close menu
    };
    reader.readAsDataURL(file);
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
    
    // Logic Tombol Kanan: Jika sedang listening, stop dulu.
    if (isListening) {
        toggleListening();
        return;
    }

    if ((!input.trim() && !attachment) || isLoading) return; // Prevent empty send

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

  // Determine Right Button Icon
  const canSend = (input.trim().length > 0 || attachment !== null) && !isLoading;
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4 shrink-0">
      
      {/* Hidden Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,video/*" />
      <input type="file" ref={roastInputRef} onChange={handleRoastSelect} className="hidden" accept="image/*" />

      {/* Mode Indicator (Floating) */}
      {isImageMode && (
          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest text-white bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-0.5 rounded-full shadow-lg animate-pulse flex items-center gap-1 z-20">
              <Sparkles size={10} /> MODE IMAJINASI
          </div>
      )}

      {/* Preview Area (Compact) */}
      {attachment && (
        <div className="mb-2 ml-10 inline-flex relative group animate-[scaleIn_0.2s_ease-out] origin-bottom-left z-0">
          <div className="relative h-16 rounded-xl overflow-hidden border border-pey-border/50 shadow-lg bg-black/40 backdrop-blur-md">
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
          </div>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={`relative flex items-end gap-2 p-1.5 bg-pey-card/60 backdrop-blur-xl border transition-all duration-300 rounded-[26px] shadow-2xl ${
            isListening 
            ? 'border-red-500/30 ring-1 ring-red-500/20' 
            : isImageMode 
                ? 'border-purple-500/30 ring-1 ring-purple-500/20'
                : 'border-pey-border/60 focus-within:border-pey-accent/50 focus-within:ring-1 focus-within:ring-pey-accent/20'
        }`}
      >
        
        {/* LEFT: Toggle Tools Button */}
        <div className="relative flex items-center justify-center h-[46px] w-[46px] shrink-0">
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

            {/* FLOATING TOOLS MENU (Pop-up) */}
            <div className={`absolute bottom-full left-0 mb-3 flex flex-col gap-2 p-1.5 bg-pey-card/90 backdrop-blur-2xl border border-pey-border rounded-full shadow-xl transition-all duration-300 origin-bottom-left z-50 ${
                showTools 
                ? 'opacity-100 scale-100 translate-y-0' 
                : 'opacity-0 scale-75 translate-y-4 pointer-events-none'
            }`}>
                 
                 {/* 1. Upload */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-2.5 rounded-full transition-all ${isImageMode ? 'opacity-30 cursor-not-allowed' : 'text-pey-text hover:bg-pey-accent hover:text-pey-bg'}`}
                    title="Upload Media"
                >
                    <Paperclip size={18} />
                </button>

                {/* 2. Roast Mode */}
                <button
                    type="button"
                    onClick={() => roastInputRef.current?.click()}
                    className={`p-2.5 rounded-full transition-all ${isImageMode ? 'opacity-30 cursor-not-allowed' : 'text-orange-500 hover:bg-orange-500 hover:text-white'}`}
                    title="Roast My Vibe 🔥"
                >
                    <Flame size={18} />
                </button>

                {/* 3. Image Gen Mode */}
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
              : isListening 
                ? "Mendengarkan..." 
                : "Ketik sesuatu..."
          }
          rows={1}
          className="flex-1 bg-transparent text-pey-text placeholder-pey-muted/50 px-1 py-3 focus:outline-none resize-none max-h-32 min-h-[46px] font-sans font-medium text-base leading-relaxed"
          disabled={isLoading}
        />

        {/* RIGHT: Contextual Action Button (Mic / Send) */}
        <button
          type="submit"
          disabled={isLoading && !isListening}
          className={`w-[46px] h-[46px] rounded-[20px] transition-all duration-300 flex items-center justify-center shrink-0 shadow-lg ${
             canSend
              ? isImageMode 
                ? 'bg-gradient-to-tr from-purple-500 to-pink-500 text-white hover:scale-105'
                : 'bg-pey-text text-pey-bg hover:bg-pey-accent hover:scale-105'
              : isListening
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-transparent text-pey-muted hover:text-pey-text hover:bg-pey-text/5'
          }`}
          title={canSend ? "Kirim" : isListening ? "Stop" : "Bicara"}
        >
          {isLoading && !isListening ? (
            <div className="w-5 h-5 border-2 border-pey-muted border-t-transparent rounded-full animate-spin" />
          ) : (
            canSend ? (
               isImageMode ? <Sparkles size={20} fill="currentColor" /> : <Send size={20} className="ml-0.5" fill="currentColor" />
            ) : isListening ? (
               <div className="w-2.5 h-2.5 bg-white rounded-[2px] animate-pulse" /> // Stop Icon mimic
            ) : (
               <Mic size={22} />
            )
          )}
        </button>

      </form>
    </div>
  );
};