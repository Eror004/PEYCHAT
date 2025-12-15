import { GoogleGenAI } from "@google/genai";

// Fungsi helper untuk pause sejenak (delay)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export default async function handler(req, res) {
  // 1. Validasi Method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 2. Ambil API Key (Priority: PEYY_KEY -> API_KEY)
  const apiKey = process.env.PEYY_KEY || process.env.API_KEY;

  if (!apiKey) {
    console.error("CRITICAL ERROR: PEYY_KEY or API_KEY is undefined");
    return res.status(500).json({ error: "Server Error: API Key (PEYY_KEY) belum terbaca di Vercel." });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const { history, message, attachments, systemInstruction } = req.body;

    // --- OPTIMISASI 1: HEMAT TOKEN (Pangkas History) ---
    // Google Free Tier gampang kena limit kalau chat kepanjangan.
    // Kita ambil 14 pesan terakhir saja. Ini cukup untuk konteks, tapi hemat token.
    const MAX_HISTORY = 14; 
    let processedHistory = history || [];
    
    if (processedHistory.length > MAX_HISTORY) {
        // Ambil bagian akhir array saja
        processedHistory = processedHistory.slice(processedHistory.length - MAX_HISTORY);
    }

    // Pastikan format history valid untuk API
    const validHistory = processedHistory.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    // Persiapkan konten pesan saat ini
    let contents = [];
    if (message && typeof message === 'string' && message.trim()) {
      contents.push({ text: message });
    }
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

    if (contents.length === 0) {
       return res.status(400).json({ error: "Pesan tidak boleh kosong." });
    }

    // Setup Chat Instance
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
      },
      history: validHistory,
    });

    // --- OPTIMISASI 2: AUTO-RETRY LOGIC ---
    // Kalau kena Rate Limit (429), kita coba lagi max 3 kali sebelum nyerah.
    let resultStream;
    let attempt = 0;
    const maxRetries = 3;
    let success = false;

    while (attempt < maxRetries && !success) {
      try {
        resultStream = await chat.sendMessageStream({
          message: contents,
        });
        success = true; // Berhasil! Keluar loop.
      } catch (err) {
        // Cek apakah errornya karena Rate Limit (429) atau Server Overload (503)
        const isRateLimit = err.message?.includes('429') || err.message?.includes('exhausted') || err.message?.includes('503');
        
        if (isRateLimit) {
          attempt++;
          console.warn(`⚠️ Rate limit hit (Attempt ${attempt}/${maxRetries}). Retrying in ${attempt * 2}s...`);
          // Tunggu bertahap: 2 detik, 4 detik, 6 detik...
          await delay(2000 * attempt);
        } else {
          // Kalau error lain (misal API Key salah), langsung lempar error, jangan di-retry.
          throw err;
        }
      }
    }

    if (!success) {
      throw new Error("Gagal setelah 3x percobaan. Server Google lagi sibuk banget.");
    }

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
      if (error.message?.includes('API_KEY')) msg = "Invalid API Key. Cek PEYY_KEY di Vercel.";
      if (error.message?.includes('429') || error.message?.includes('exhausted')) {
         msg = "Server lagi sibuk banget (Rate Limit). Coba tunggu 1 menit lagi ya.";
      }
      
      res.status(500).json({ error: msg });
    } else {
      res.end();
    }
  }
}