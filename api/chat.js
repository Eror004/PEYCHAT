import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  // 1. Validasi Method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 2. KUMPULKAN SEMUA API KEY (THE AVENGERS - SQUAD 7)
    const rawKeys = [
      process.env.PEYY_KEY,
      process.env.PEYY_KEY_2,
      process.env.PEYY_KEY_3,
      process.env.PEYY_KEY_4,
      process.env.PEYY_KEY_5,
      process.env.PEYY_KEY_6, // Tambahan baru
      process.env.PEYY_KEY_7, // Tambahan baru
      process.env.API_KEY
    ];

    // Filter key yang kosong
    const availableKeys = rawKeys.filter(k => k && k.trim().length > 0);

    if (availableKeys.length === 0) {
      console.error("CRITICAL ERROR: No API Keys found in Environment Variables.");
      return res.status(500).json({ 
        error: "Konfigurasi Server Salah: Tidak ada API Key yang ditemukan. Cek Vercel Settings." 
      });
    }

    // 3. Parse Body & Validasi
    const { history, message, attachments, systemInstruction } = req.body;

    // --- PREPARE DATA ---
    const MAX_HISTORY = 10; // Kurangi sedikit lagi biar aman
    let processedHistory = history || [];
    
    // Pastikan history valid (Hapus pesan kosong/error)
    processedHistory = processedHistory
        .filter(h => h.text && h.text.trim().length > 0) // Hapus pesan kosong
        .slice(-MAX_HISTORY); // Ambil N terakhir

    const validHistory = processedHistory.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    }));

    // Prepare Contents
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

    // --- LOGIC ROTASI KUNCI (INSTANT FAILOVER) ---
    // Shuffle keys
    const shuffledKeys = availableKeys.sort(() => 0.5 - Math.random());
    
    let lastError = null;
    let success = false;
    let resultStream = null;

    // Loop mencoba setiap key
    for (const currentKey of shuffledKeys) {
      try {
          const ai = new GoogleGenAI({ apiKey: currentKey });
          const chat = ai.chats.create({
              model: 'gemini-2.5-flash',
              config: { systemInstruction: systemInstruction },
              history: validHistory,
          });

          resultStream = await chat.sendMessageStream({ message: contents });
          success = true;
          break; // BERHASIL! Keluar loop.

      } catch (err) {
          lastError = err;
          // Cek error 429 (Limit) atau 503 (Overload)
          const isRateLimit = err.message?.includes('429') || err.message?.includes('503');
          
          if (isRateLimit) {
              console.warn(`⚠️ Key ...${currentKey.slice(-4)} sibuk. Ganti key lain...`);
              continue; // LANGSUNG coba key berikutnya tanpa delay (biar gak timeout)
          } else {
              // Jika error lain (misal API Key invalid), catat tapi coba key lain aja jaga-jaga
              console.error(`❌ Key ...${currentKey.slice(-4)} error:`, err.message);
              continue; 
          }
      }
    }

    if (!success) {
      const errorMsg = lastError?.message || "Server Google lagi sibuk banget (Semua Key Limit).";
      console.error("All keys failed. Last error:", lastError);
      return res.status(503).json({ error: `Gagal: ${errorMsg}` });
    }

    // --- STREAM RESPONSE ---
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    });

    for await (const chunk of resultStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }
    res.end();

  } catch (globalError) {
    console.error("Fatal Handler Error:", globalError);
    // Pastikan tidak mengirim response double
    if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error: " + globalError.message });
    }
  }
}