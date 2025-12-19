import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // 1. Validasi Method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, message, attachments, systemInstruction, customApiKey } = req.body;

    // 2. TENTUKAN KEY YANG AKAN DIPAKAI
    let targetKeys = [];

    if (customApiKey && customApiKey.trim().length > 0) {
        targetKeys = [customApiKey.trim()]; // Priority 1: User Key
    } else {
        // STRATEGI MULTI-AKUN (THE AVENGERS)
        const rawKeys = [
          process.env.PEYY_KEY,
          process.env.PEYY_KEY_1,
          process.env.PEYY_KEY_2,
          process.env.PEYY_KEY_3,
          process.env.PEYY_KEY_4,
          process.env.PEYY_KEY_5,
          process.env.PEYY_KEY_6,
          process.env.PEYY_KEY_7,
          process.env.PEYY_KEY_8,
          process.env.PEYY_KEY_9,
          process.env.PEYY_KEY_10,
          process.env.API_KEY
        ];
        // Filter key yang kosong (undefined atau string kosong)
        targetKeys = rawKeys.filter(k => k && k.trim().length > 0);
        
        // Shuffle agar beban terbagi rata ke semua akun
        targetKeys = targetKeys.sort(() => 0.5 - Math.random());
    }

    if (targetKeys.length === 0) {
      return res.status(500).json({ 
        error: "Server Error: No API Keys available. Please provide your own Key in Settings." 
      });
    }

    // --- PREPARE DATA ---
    const MAX_HISTORY = 10;
    let processedHistory = history || [];
    
    // Pastikan history valid (Hapus pesan kosong/error)
    processedHistory = processedHistory
        .filter(h => h.text && h.text.trim().length > 0) 
        .slice(-MAX_HISTORY); 

    const validHistory = processedHistory.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    // --- CONSTRUCT CONTENTS (URUTAN PENTING UNTUK VISION!) ---
    let contents = [];

    // 1. Masukkan Attachments (Gambar/Video) DULUAN
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

    // 2. Masukkan Text KEMUDIAN
    if (message && typeof message === 'string' && message.trim()) {
      contents.push({ text: message });
    }

    // Kalau user cuma kirim gambar tanpa text, kasih text default agar tidak error
    if (contents.length > 0 && !contents.some(c => c.text)) {
        contents.push({ text: "Jelaskan gambar ini." });
    }

    if (contents.length === 0) {
       return res.status(400).json({ error: "Pesan tidak boleh kosong." });
    }

    // --- LOGIC EKSEKUSI ---
    let lastError = null;
    let success = false;
    let resultStream = null;

    // Loop mencoba setiap key yang tersedia
    for (const currentKey of targetKeys) {
      try {
          const ai = new GoogleGenAI({ apiKey: currentKey });
          
          // UPGRADE: Google Search Grounding & Thinking Config
          const chat = ai.chats.create({
              model: 'gemini-3-flash-preview',
              config: { 
                systemInstruction: systemInstruction,
                // THINKING CONFIG: Membuat model "berpikir" sebelum menjawab.
                // Sangat berguna untuk matematika, logika, dan pertanyaan kompleks.
                thinkingConfig: { thinkingBudget: 2048 }, 
                tools: [
                  { googleSearch: {} } // Enable Google Search
                ]
              },
              history: validHistory,
          });

          // Kirim array contents (Image + Text)
          resultStream = await chat.sendMessageStream({ message: contents });
          success = true;
          break; // BERHASIL! Keluar loop.

      } catch (err) {
          lastError = err;
          
          if (customApiKey) {
             throw new Error(`Custom Key Error: ${err.message}`);
          }

          const isRateLimit = err.message?.includes('429') || err.message?.includes('503');
          if (isRateLimit) {
              console.warn(`⚠️ Key ...${currentKey.slice(-4)} sibuk/limit. Ganti ke akun berikutnya...`);
              continue; 
          } else {
              console.error(`❌ Key ...${currentKey.slice(-4)} error:`, err.message);
              if (err.message?.includes('INVALID_ARGUMENT') || err.message?.includes('400')) {
                   return res.status(400).json({ error: "Format request salah (400)." });
              }
              continue; 
          }
      }
    }

    if (!success) {
      const errorMsg = lastError?.message || "Server sibuk.";
      console.error("All keys failed. Last error:", lastError);
      return res.status(503).json({ error: `Gagal: ${errorMsg}` });
    }

    // --- STREAM RESPONSE ---
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    });

    // Map untuk menyimpan sumber unik (URL -> Title)
    const groundingSources = new Map();

    for await (const chunk of resultStream) {
      // Extract Grounding Metadata
      const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata?.groundingChunks) {
        groundingMetadata.groundingChunks.forEach(c => {
            if (c.web) {
                groundingSources.set(c.web.uri, c.web.title || c.web.uri);
            }
        });
      }

      if (chunk.text) {
        res.write(chunk.text);
      }
    }

    // Append Sources to Response
    if (groundingSources.size > 0) {
        res.write("\n\n---\n**📚 Sumber & Referensi:**\n");
        groundingSources.forEach((title, uri) => {
            res.write(`- [${title}](${uri})\n`);
        });
    }

    res.end();

  } catch (globalError) {
    console.error("Fatal Handler Error:", globalError);
    if (!res.headersSent) {
        res.status(500).json({ error: "Error: " + globalError.message });
    }
  }
}