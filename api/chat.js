import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // 1. Validasi Method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Ambil API Key saat request masuk (Runtime)
  // PERBAIKAN: Kita baca PEYY_KEY (sesuai screenshot) atau API_KEY (cadangan)
  const apiKey = process.env.PEYY_KEY || process.env.API_KEY;

  // Debug log untuk cek di Vercel Logs
  if (!apiKey) {
    console.error("CRITICAL ERROR: PEYY_KEY or API_KEY is undefined");
    return res.status(500).json({ error: "Server Error: API Key (PEYY_KEY) belum terbaca di Vercel." });
  }

  try {
    // Inisialisasi AI instance setiap request
    const ai = new GoogleGenAI({ apiKey: apiKey });

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

    // Fallback jika kosong
    if (contents.length === 0) {
       return res.status(400).json({ error: "Pesan tidak boleh kosong." });
    }

    // 4. Format History
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
    
    if (!res.headersSent) {
      let msg = "Internal Server Error";
      // Cek error spesifik dari Google
      if (error.message?.includes('API_KEY') || error.message?.includes('key')) msg = "Invalid API Key. Cek PEYY_KEY di Vercel.";
      if (error.message?.includes('429')) msg = "Server lagi sibuk (Rate Limit). Coba lagi.";
      
      res.status(500).json({ error: msg });
    } else {
      res.end();
    }
  }
}