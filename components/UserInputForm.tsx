import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, FileVideo, Mic, MicOff, Palette, Sparkles } from 'lucide-react';
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
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'id-ID'; // Set Bahasa Indonesia

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
      // Reset attachment jika masuk mode image gen (karena endpoint image gen biasanya prompt only di sini)
      if (!isImageMode) {
          setAttachment(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Disable file upload in image mode
    if (isImageMode) {
        alert("Matikan mode lukis dulu kalau mau kirim gambar!");
        return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    // VALIDASI UKURAN FILE: Max 3MB (Vercel Serverless limit body ~4.5MB, Base64 adds 33%)
    const MAX_SIZE_MB = 3;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`Waduh, gambarnya kegedean! Maksimal ${MAX_SIZE_MB}MB ya biar server gak bengek.`);
      // Reset input agar user bisa pilih file lain
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    };
    reader.readAsDataURL(file);
    
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;
    
    // Stop recording if active
    if (isListening && recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
    }

    onSendMessage(input.trim(), attachment ? [attachment] : undefined, isImageMode);
    setInput('');
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    // Optional: Auto turn off image mode after send? 
    // setIsImageMode(false); // Let's keep it active for multiple gens
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 shrink-0">
      {/* Preview Area */}
      {attachment && (
        <div className="mb-2 ml-4 inline-flex relative group animate-[fadeIn_0.3s_ease-out]">
          <div className="relative rounded-2xl overflow-hidden border border-pey-accent/30 shadow-lg bg-pey-card">
            {attachment.type === 'image' ? (
              <img src={attachment.previewUrl} alt="Preview" className="h-24 w-auto object-cover opacity-90" />
            ) : attachment.type === 'video' ? (
              <div className="h-24 w-32 flex items-center justify-center bg-black/20 text-pey-accent">
                <FileVideo size={32} />
              </div>
            ) : (
              <div className="h-24 w-32 flex items-center justify-center bg-pey-card/50 text-pey-text">
                <span className="text-xs font-mono p-2 text-center break-all">{attachment.mimeType}</span>
              </div>
            )}
            
            <button 
              onClick={removeAttachment}
              className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white rounded-full p-1 transition-colors backdrop-blur-sm"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Mode Indicator Text */}
      {isImageMode && (
          <div className="ml-4 mb-1 text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 animate-pulse flex items-center gap-1">
              <Sparkles size={12} /> MODE IMAJINASI (IMAGE GEN) AKTIF
          </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`relative flex items-end gap-2 p-2 bg-pey-card/90 backdrop-blur-2xl border rounded-[2rem] shadow-2xl transition-all duration-300 focus-within:ring-2 ${
            isImageMode 
             ? 'border-purple-500/50 ring-purple-500/20 shadow-purple-500/10' 
             : isListening
                ? 'border-red-500/50 ring-red-500/20 shadow-red-500/10'
                : 'border-pey-border focus-within:ring-pey-accent/50 focus-within:border-pey-accent'
        }`}
      >
        <div className="pl-3 pb-3 flex gap-1 sm:gap-2">
            {/* File Upload Button */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*"
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`transition-all p-1.5 rounded-full ${isImageMode ? 'opacity-30 cursor-not-allowed' : 'text-pey-muted hover:text-pey-accent hover:rotate-12'}`}
                title="Add photo"
                disabled={isLoading || isImageMode}
            >
                <Paperclip size={20} strokeWidth={2} />
            </button>

            {/* Image Gen Mode Button */}
             <button
                type="button"
                onClick={toggleImageMode}
                className={`transition-all p-1.5 rounded-full ${
                    isImageMode
                    ? 'text-white bg-gradient-to-tr from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 rotate-12'
                    : 'text-pey-muted hover:text-purple-400 hover:bg-purple-500/10'
                }`}
                title={isImageMode ? "Matikan Mode Lukis" : "Mode Imajinasi (Buat Gambar)"}
                disabled={isLoading}
            >
                <Palette size={20} strokeWidth={2} />
            </button>

            {/* Microphone Button */}
            <button
                type="button"
                onClick={toggleListening}
                className={`transition-all p-1.5 rounded-full ${
                    isListening 
                    ? 'text-red-500 animate-pulse bg-red-500/10' 
                    : 'text-pey-muted hover:text-pey-accent hover:bg-pey-accent/10'
                }`}
                title={isListening ? "Stop Listening" : "Speak (Bahasa Indonesia)"}
                disabled={isLoading}
            >
                {isListening ? <MicOff size={20} strokeWidth={2} /> : <Mic size={20} strokeWidth={2} />}
            </button>
        </div>
        
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
              isImageMode
              ? "Tuan Pey, tolong gambarin..."
              : isListening 
                ? "Lagi dengerin kamu..." 
                : attachment 
                    ? "Tanya soal gambar ini..." 
                    : "Ketik pesan..."
          }
          rows={1}
          className="w-full bg-transparent text-pey-text placeholder-pey-muted px-2 py-3 focus:outline-none resize-none max-h-32 min-h-[50px] font-sans font-medium text-base sm:text-lg"
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={(!input.trim() && !attachment) || isLoading}
          className={`w-12 h-12 rounded-full mb-0.5 mr-0.5 transition-all duration-300 flex items-center justify-center shrink-0 ${
            (input.trim() || attachment) && !isLoading
              ? isImageMode 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:scale-110 shadow-lg shadow-purple-500/30'
                : 'bg-pey-accent text-pey-bg hover:scale-110 hover:rotate-12 shadow-lg shadow-pey-accent/30'
              : 'bg-pey-bg border border-pey-border text-pey-muted cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-pey-muted border-t-transparent rounded-full animate-spin" />
          ) : (
            isImageMode ? <Sparkles size={22} strokeWidth={2.5} className="animate-pulse" /> : <Send size={22} strokeWidth={2.5} className={(input.trim() || attachment) ? 'ml-0.5' : ''} />
          )}
        </button>
      </form>
      
      {/* Listening Indicator Overlay */}
      {isListening && (
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-red-500/90 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce shadow-lg backdrop-blur-sm z-50">
              ● LISTENING...
          </div>
      )}
    </div>
  );
};