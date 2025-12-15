import { GoogleGenAI, Content, Part } from "@google/genai";
import { MessageObject, Role, Attachment } from "../types";

// Helper untuk validasi key
const getApiKey = () => {
    // @ts-ignore
    const key = process.env.API_KEY;
    if (!key || key.startsWith("YOUR_API")) {
        console.error("API Key is missing or invalid");
        return null;
    }
    return key;
}

const apiKey = getApiKey();
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const streamChatResponse = async (
  currentHistory: MessageObject[],
  userMessage: string,
  attachments: Attachment[] | undefined,
  systemInstruction: string,
  onChunk: (chunkText: string) => void
): Promise<void> => {
  if (!ai) {
      throw new Error("API Key belum dipasang. Cek file .env di root project.");
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
    console.error("Chat Service Error:", error);
    
    let errorMessage = "Jaringan error atau kuota habis.";
    
    // Deteksi error spesifik
    if (error.message?.includes('API_KEY')) {
        errorMessage = "API Key bermasalah. Pastikan .env sudah benar.";
    } else if (error.message?.includes('400')) {
        errorMessage = "Format request ditolak oleh Google (400 Bad Request).";
    } else if (error.message?.includes('429')) {
        errorMessage = "Kebanyakan request bro, santai dulu (Rate Limit).";
    }

    throw new Error(errorMessage);
  }
};