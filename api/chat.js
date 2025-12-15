import { GoogleGenAI } from "@google/genai";

// Initialize Gemini on the server side
// process.env.API_KEY otomatis ada di Serverless Function Vercel
const ai = process.env.API_KEY 
  ? new GoogleGenAI({ apiKey: process.env.API_KEY }) 
  : null;

export default async function handler(req, res) {
  // 1. Validasi Method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Validasi API Key Server Side
  if (!ai) {
    console.error("API_KEY is missing in Vercel Environment Variables.");
    return res.status(500).json({ error: "Server Error: API Key belum disetting di Vercel." });
  }

  try {
    const { history, message, attachments, systemInstruction } = req.body;

    // 3. Persiapkan Message Content (Text + Images)
    let contents = [];
    
    // Jika ada text message
    if (message && typeof message === 'string' && message.trim()) {
      contents.push({ text: message });
    }

    // Jika ada attachments
    if (attachments && Array.isArray(attachments)) {
      attachments.forEach(att => {
        contents.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        });
      });
    }

    // Fallback jika kosong (misal user cuma kirim spasi)
    if (contents.length === 0) {
       return res.status(400).json({ error: "Pesan tidak boleh kosong." });
    }

    // 4. Format History
    // Mapping dari format UI ke format SDK
    const validHistory = (history || []).map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    // 5. Create Chat & Stream
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      },
      history: validHistory,
    });

    const resultStream = await chat.sendMessageStream({
      message: contents,
    });

    // 6. Response Headers untuk Streaming
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    });

    // 7. Pipe Stream ke Client
    for await (const chunk of resultStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }

    res.end();

  } catch (error) {
    console.error("Backend API Error:", error);
    
    // Jika header belum dikirim, kirim JSON error
    if (!res.headersSent) {
      let msg = "Internal Server Error";
      if (error.message?.includes('API_KEY')) msg = "Invalid API Key configuration.";
      if (error.message?.includes('429')) msg = "Server lagi sibuk (Rate Limit). Coba lagi.";
      
      res.status(500).json({ error: msg });
    } else {
      // Jika stream sudah jalan, kita tidak bisa kirim JSON, matikan saja
      res.end();
    }
  }
}