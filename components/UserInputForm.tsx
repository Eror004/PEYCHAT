import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Paperclip, X, Image as ImageIcon, FileVideo } from 'lucide-react';
import { Attachment } from '../types';

interface UserInputFormProps {
  onSendMessage: (text: string, attachments?: Attachment[]) => void;
  isLoading: boolean;
}

export const UserInputForm: React.FC<UserInputFormProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simple validation (limit 5MB for demo performance)
    if (file.size > 5 * 1024 * 1024) {
      alert("File kegedean bestie! Max 5MB ya.");
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
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;
    
    onSendMessage(input.trim(), attachment ? [attachment] : undefined);
    setInput('');
    setAttachment(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
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

      <form
        onSubmit={handleSubmit}
        className="relative flex items-end gap-2 p-2 bg-pey-card/90 backdrop-blur-2xl border border-pey-border rounded-[2rem] shadow-2xl transition-all focus-within:ring-2 focus-within:ring-pey-accent/50 focus-within:border-pey-accent"
      >
        <div className="pl-3 pb-3 flex gap-2">
            {/* File Upload Button */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*,video/*"
            />
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-pey-muted hover:text-pey-accent hover:rotate-12 transition-all p-1"
                title="Add photo or video"
                disabled={isLoading}
            >
                <Paperclip size={22} strokeWidth={2} />
            </button>
        </div>
        
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={attachment ? "Ada yang mau ditanyain soal ini?" : "Tanya TUAN PEY..."}
          rows={1}
          className="w-full bg-transparent text-pey-text placeholder-pey-muted px-2 py-3 focus:outline-none resize-none max-h-32 min-h-[50px] font-sans font-medium text-base sm:text-lg"
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={(!input.trim() && !attachment) || isLoading}
          className={`w-12 h-12 rounded-full mb-0.5 mr-0.5 transition-all duration-300 flex items-center justify-center shrink-0 ${
            (input.trim() || attachment) && !isLoading
              ? 'bg-pey-accent text-pey-bg hover:scale-110 hover:rotate-12 shadow-lg shadow-pey-accent/30'
              : 'bg-pey-bg border border-pey-border text-pey-muted cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-pey-muted border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={22} strokeWidth={2.5} className={(input.trim() || attachment) ? 'ml-0.5' : ''} />
          )}
        </button>
      </form>
    </div>
  );
};