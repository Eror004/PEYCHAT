import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { MessageObject, Role, Attachment } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const streamChatResponse = async (
  currentHistory: MessageObject[],
  userMessage: string,
  attachments: Attachment[] | undefined,
  systemInstruction: string, // Changed: Now accepts dynamic instruction
  onChunk: (chunkText: string) => void
): Promise<void> => {
  try {
    // 1. Transform internal history to Gemini API format
    const historyForApi = currentHistory
      .filter(msg => !msg.isStreaming && msg.text.trim() !== '')
      .map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: [{ text: msg.text }], 
      }));

    // 2. Initialize Chat Session with Dynamic Instruction
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      },
      history: historyForApi,
    });

    // 3. Construct Message Payload
    let messagePayload: any = userMessage;

    if (attachments && attachments.length > 0) {
      const parts = [];
      
      // Add text part if exists
      if (userMessage.trim()) {
        parts.push({ text: userMessage });
      }

      // Add attachment parts
      attachments.forEach(att => {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      });

      messagePayload = parts;
    }

    // 4. Send Message Stream
    const resultStream = await chat.sendMessageStream({
      message: messagePayload,
    });

    // 5. Iterate through the stream
    for await (const chunk of resultStream) {
      const typedChunk = chunk as GenerateContentResponse;
      if (typedChunk.text) {
        onChunk(typedChunk.text);
      }
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Bentar, jaringan lo ampas kayaknya. Error nih.");
  }
};