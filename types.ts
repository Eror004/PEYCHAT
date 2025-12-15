export enum Role {
  USER = 'user',
  MODEL = 'model',
}

export interface Attachment {
  mimeType: string;
  data: string; // Base64 string
  previewUrl?: string; // For frontend display
  type: 'image' | 'video' | 'file';
}

export interface MessageObject {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  isStreaming: boolean;
  attachments?: Attachment[];
}

export interface ChatState {
  history: MessageObject[];
  isLoading: boolean;
  error: string | null;
}

export type ThemeName = 'toxic' | 'lovecore' | 'cyber' | 'angel';

export interface ThemeColors {
  bg: string;
  card: string;
  text: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  secondary: string;
  border: string;
}

// --- New Types for Persona & Voice ---

export interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji
  systemInstruction: string;
}

export interface VoicePreset {
  id: string;
  name: string;
  pitch: number; // 0.5 - 1.5 (Lower is deeper/more male)
  rate: number;  // 0.8 - 1.2
}