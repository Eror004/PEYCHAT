import { GoogleGenAI } from "@google/genai";

// Initialize Gemini on the server side
// process.env.API_KEY is read automatically from Vercel Environment Variables
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export default async function handler(req, res) {
  // Hanya izinkan method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Cek apakah API Key sudah ada di environment variable
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing in Vercel environment variables.");
    return res.status(500).json({ error: "Server misconfiguration: API_KEY missing." });
  }

  try {
    // Vercel secara otomatis memparsing JSON body pada standard Node.js functions
    const { history, message, attachments, systemInstruction } = req.body;

    // 1. Prepare content parts
    // FIX: SDK expects 'message' to be a string OR an array of Parts.
    // Do NOT wrap it in { parts: [...] }.
    let contents = message;
    
    if (attachments && attachments.length > 0) {
      const parts = [];
      
      // Add text part if exists
      if (message && message.trim()) {
        parts.push({ text: message });
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
      
      contents = parts; // Direct Array of Parts
    }

    // 2. Format History for Gemini SDK
    // Ensure we don't send empty text parts which can cause API errors
    const validHistory = (history || []).map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    // 3. Create Chat Session
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      },
      history: validHistory,
    });

    // 4. Send Message and get Stream
    const resultStream = await chat.sendMessageStream({
      message: contents,
    });

    // 5. Stream response back to client using Node.js response object
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    });

    for await (const chunk of resultStream) {
      // FIX: The new SDK returns chunk as GenerateContentResponse.
      // We access .text property directly.
      if (chunk.text) {
        res.write(chunk.text);
      }
    }

    res.end();

  } catch (error) {
    console.error("API Error Details:", error);
    // If headers haven't been sent, send JSON error. 
    // If streaming started, we can't send JSON, just end the stream.
    if (!res.headersSent) {
      res.status(500).json({ error: error.message || "Internal Server Error" });
    } else {
      res.end();
    }
  }
}