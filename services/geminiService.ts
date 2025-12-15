import { MessageObject, Role, Attachment } from "../types";

// NOTE: We no longer import GoogleGenAI here to reduce bundle size 
// and prevent security risks. The logic moves to /api/chat.js

export const streamChatResponse = async (
  currentHistory: MessageObject[],
  userMessage: string,
  attachments: Attachment[] | undefined,
  systemInstruction: string,
  onChunk: (chunkText: string) => void
): Promise<void> => {
  try {
    // 1. Prepare payload for our serverless backend
    // We filter history to keep payload size manageable
    const historyForApi = currentHistory
      .filter(msg => !msg.isStreaming && msg.text.trim() !== '')
      .map(msg => ({
        role: msg.role,
        text: msg.text
        // We generally don't send old attachments back to save bandwidth, 
        // unless strictly necessary for context
      }));

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        history: historyForApi,
        message: userMessage,
        attachments,
        systemInstruction,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new Error("ReadableStream not supported in this browser.");
    }

    // 2. Read the stream from our backend
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      
      if (value) {
        const chunkValue = decoder.decode(value, { stream: true });
        onChunk(chunkValue);
      }
    }

  } catch (error: any) {
    console.error("Chat Service Error:", error);
    throw new Error("Jaringan lo ampas atau server lagi maintenance. Coba lagi bentar.");
  }
};