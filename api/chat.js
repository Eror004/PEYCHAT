import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, message, attachments, systemInstruction, customApiKey } = req.body;

    // 1. STRATEGI KUNCI: Prioritaskan User Key, lalu fallback ke Avengers Pool
    let targetKeys = [];
    if (customApiKey && customApiKey.trim().length > 0) {
        targetKeys = [customApiKey.trim()];
    } else {
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
        // Filter key kosong & Acak urutan agar beban terbagi
        targetKeys = rawKeys.filter(k => k && k.trim().length > 0).sort(() => 0.5 - Math.random());
    }

    if (targetKeys.length === 0) {
      return res.status(500).json({ error: "Server Error: Tidak ada API Key yang tersedia di sistem." });
    }

    // 2. DATA PREPARATION
    const processedHistory = (history || [])
        .filter(h => h.text && h.text.trim().length > 0)
        .slice(-10) // Ambil 10 chat terakhir saja untuk hemat token
        .map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
        }));

    let contents = [];
    if (attachments?.length > 0) {
      attachments.forEach(att => contents.push({ inlineData: { mimeType: att.mimeType, data: att.data } }));
    }
    if (message?.trim()) {
      contents.push({ text: message });
    } else if (contents.length > 0) {
      contents.push({ text: "Jelaskan ini." });
    } else {
       return res.status(400).json({ error: "Pesan kosong." });
    }

    // 3. EKSEKUSI FAILOVER AGRESIF
    let resultStream = null;
    let activeKey = null;
    let lastError = null;

    for (const key of targetKeys) {
      try {
          const ai = new GoogleGenAI({ apiKey: key });
          const chat = ai.chats.create({
              model: 'gemini-3-flash-preview',
              config: { 
                systemInstruction: systemInstruction,
                thinkingConfig: { thinkingBudget: 1024 }, // Hemat budget thinking
                tools: [{ googleSearch: {} }] 
              },
              history: processedHistory,
          });

          resultStream = await chat.sendMessageStream({ message: contents });
          activeKey = key; // Tandai key yang berhasil
          break; // SUKSES! Keluar dari loop

      } catch (err) {
          lastError = err;
          const errMsg = err.message || "";
          
          // Jika Custom Key user salah, langsung stop, jangan failover ke akun server
          if (customApiKey) throw new Error(`API Key kamu bermasalah: ${errMsg}`);

          // Cek tipe error
          const isQuotaError = errMsg.includes('429') || errMsg.includes('503') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED');
          
          if (isQuotaError) {
              console.warn(`⚠️ Key akhiran ...${key.slice(-4)} limit. Mengalihkan ke Key berikutnya...`);
              continue; // Lanjut ke key berikutnya di array
          } else {
              // Jika errornya bukan masalah kuota (misal: Bad Request), stop trying
              console.error(`❌ Key Error (Fatal):`, errMsg);
              if (errMsg.includes('INVALID_ARGUMENT') || errMsg.includes('400')) {
                   return res.status(400).json({ error: "Format request tidak valid (Bad Request)." });
              }
              // Kalau error lain (misal internal server), coba key lain siapa tau hoki
              continue;
          }
      }
    }

    // 4. JIKA SEMUA KEY MATI
    if (!resultStream) {
      console.error("ALL KEYS EXHAUSTED.");
      let cleanMsg = "Server Sedang Penuh.";
      const errTxt = lastError?.message || "";
      
      if (errTxt.includes('429') || errTxt.includes('quota') || errTxt.includes('RESOURCE_EXHAUSTED')) {
          cleanMsg = "⚠️ SEMUA KUNCI SIBUK (10/10). Sistem sedang sangat ramai. Silakan tunggu beberapa menit atau gunakan API Key sendiri di menu Settings agar jalur khusus.";
      } else {
          cleanMsg = `Gagal: ${errTxt.slice(0, 100)}...`; // Potong pesan error biar ga kepanjangan
      }
      
      return res.status(503).json({ error: cleanMsg });
    }

    // 5. STREAM RESPONSE
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    });

    const groundingSources = new Map();

    for await (const chunk of resultStream) {
      // Grounding extraction
      const gMeta = chunk.candidates?.[0]?.groundingMetadata;
      if (gMeta?.groundingChunks) {
        gMeta.groundingChunks.forEach(c => {
            if (c.web) groundingSources.set(c.web.uri, c.web.title || c.web.uri);
        });
      }

      if (chunk.text) {
        res.write(chunk.text);
      }
    }

    if (groundingSources.size > 0) {
        res.write("\n\n---\n**📚 Referensi:**\n");
        groundingSources.forEach((title, uri) => {
            res.write(`- [${title}](${uri})\n`);
        });
    }

    res.end();

  } catch (globalError) {
    console.error("Handler Crash:", globalError);
    if (!res.headersSent) {
        res.status(500).json({ error: globalError.message });
    }
  }
}