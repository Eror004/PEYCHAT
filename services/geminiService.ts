import { GoogleGenAI, Content, Part } from "@google/genai";
import { MessageObject, Role, Attachment } from "../types";

// Helper untuk validasi key
const getApiKey = () => {
    // @ts-ignore
    const key = process.env.API_KEY;
    
    // Debugging (Akan muncul di Console Browser F12)
    if (!key) {
        console.error("CRITICAL ERROR: API_KEY is missing in the browser environment.");
        console.error("Did you set the Environment Variable 'API_KEY' in Vercel Settings?");
        return null;
    }
    
    return key;
}

const apiKey = getApiKey();
// Initialize only if key exists to prevent immediate crash on load
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const streamChatResponse = async (
  currentHistory: MessageObject[],
  userMessage: string,
  attachments: Attachment[] | undefined,
  systemInstruction: string,
  onChunk: (chunkText: string) => void
): Promise<void> => {
  
  if (!ai) {
      console.error("GoogleGenAI client not initialized.");
      throw new Error("API Key hilang. Cek Setting Environment Vercel lo.");
  }

  try {
    const modelId = 'gemini-2.5-flash';

    // Filter history agar bersih dari pesan error/kosong
    const historyForSdk: Content[] = currentHistory
      .filter(msg => !msg.isStreaming && msg.text && msg.text.trim() !== '')
      .map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

    const chat = ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: systemInstruction,
      },
      history: historyForSdk,
    });

    let messageContent: string | Part[] = userMessage;

    // Handle Attachments (Images/Videos)
    if (attachments && attachments.length > 0) {
      const parts: Part[] = [];
      
      if (userMessage && userMessage.trim()) {
        parts.push({ text: userMessage });
      }
      
      attachments.forEach(att => {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data 
          }
        });
      });
      
      messageContent = parts;
    }

    const resultStream = await chat.sendMessageStream({
      message: messageContent,
    });

    for await (const chunk of resultStream) {
        const text = chunk.text;
        if (text) {
            onChunk(text);
        }
    }

  } catch (error: any) {
    console.error("Chat Service Error Full:", error);
    
    let errorMessage = "Jaringan error atau kuota habis.";
    
    // Deteksi error spesifik
    if (error.message?.includes('API_KEY')) {
        errorMessage = "API Key bermasalah. Pastikan Variable API_KEY ada di Vercel.";
    } else if (error.message?.includes('400')) {
        errorMessage = "Request ditolak Google (400). Mungkin file kegedean?";
    } else if (error.message?.includes('429')) {
        errorMessage = "Kebanyakan request (Rate Limit). Istirahat dulu.";
    } else if (error.message?.includes('503') || error.message?.includes('Overloaded')) {
        errorMessage = "Server Google lagi overload. Coba lagi bentar.";
    }

    throw new Error(errorMessage);
  }
};