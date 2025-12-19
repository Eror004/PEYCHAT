import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, message, attachments, systemInstruction, customApiKey } = req.body;

    // --- 1. KEY MANAGEMENT (THE AVENGERS STRATEGY) ---
    // Kita kumpulkan semua key yang ada.
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
        // Filter key kosong & Acak urutan agar beban terbagi rata
        targetKeys = rawKeys.filter(k => k && k.trim().length > 0).sort(() => 0.5 - Math.random());
    }

    if (targetKeys.length === 0) {
      return res.status(500).json({ error: "Server Error: Tidak ada API Key yang tersedia." });
    }

    // --- 2. DATA PREPARATION ---
    const processedHistory = (history || [])
        .filter(h => h.text && h.text.trim().length > 0)
        .slice(-8) // Ambil 8 chat terakhir saja supaya hemat token context
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

    // --- 3. EKSEKUSI DENGAN SMART FALLBACK ---
    let resultStream = null;
    let lastError = null;

    // Loop mencoba kunci satu per satu
    for (let i = 0; i < targetKeys.length; i++) {
        const key = targetKeys[i];
        
        // LOGIKA PINTAR vs HEMAT:
        // Percobaan pertama (i==0) kita coba pakai Thinking Mode (Paling Pinter tapi boros).
        // Jika gagal/limit, percobaan berikutnya kita matikan Thinking Mode (Tetap Pinter, tapi lebih hemat token).
        // Ini memastikan chat TETAP MASUK meskipun kuota sedang "sekarat".
        const useDeepThinking = (i === 0); 

        try {
            const ai = new GoogleGenAI({ apiKey: key });
            
            // Konfigurasi Chat
            const chatConfig = {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }], // Tetap bisa browsing internet
            };

            if (useDeepThinking) {
                 // Mode "Profesor Merenung" (Thinking Budget Aktif)
                 // Bagus untuk logika berat, tapi boros token & rawan limit
                 chatConfig.thinkingConfig = { thinkingBudget: 1024 };
            } else {
                 // Mode "Profesor Spontan" (Thinking Budget 0)
                 // Tetap model gemini-3-flash (Sangat Pintar), cuma gak pake 'mikir lama'.
                 // Jauh lebih hemat kuota & lebih cepat.
                 chatConfig.thinkingConfig = { thinkingBudget: 0 }; 
            }

            const chat = ai.chats.create({
                model: 'gemini-3-flash-preview', // Model terbaru yang pintar & cepat
                config: chatConfig,
                history: processedHistory,
            });

            resultStream = await chat.sendMessageStream({ message: contents });
            break; // BERHASIL! Keluar dari loop

        } catch (err) {
            lastError = err;
            const errMsg = err.message || "";

            // Jika User pakai Custom Key sendiri dan error, jangan ganti ke akun server (biar dia tau key-nya bermasalah)
            if (customApiKey) throw new Error(`Custom Key Error: ${errMsg}`);

            // Cek apakah error karena Limit / Server Penuh
            const isLimit = errMsg.includes('429') || errMsg.includes('503') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED');

            if (isLimit) {
                // Info di log server (tidak muncul di user)
                console.warn(`⚠️ Key ke-${i+1} limit (${useDeepThinking ? 'Mode Berat' : 'Mode Ringan'}). Switch ke backup...`);
                continue; // Coba key berikutnya
            } else {
                // Error lain (misal input salah), log dan coba key lain siapa tau hoki
                console.error(`❌ Key ke-${i+1} error:`, errMsg);
                if (errMsg.includes('INVALID_ARGUMENT') || errMsg.includes('400')) {
                    // Kalau error request user (misal gambar corrupt), stop aja
                     return res.status(400).json({ error: "Request ditolak Google. Coba refresh atau kirim ulang." });
                }
                continue;
            }
        }
    }

    // --- 4. JIKA SEMUA GAGAL ---
    if (!resultStream) {
        console.error("ALL KEYS FAILED.");
        let cleanMsg = "Server sibuk.";
        const errTxt = lastError?.message || "";
        
        if (errTxt.includes('429') || errTxt.includes('quota')) {
            cleanMsg = "⚠️ SEMUA AKUN LIMIT (10/10). Server lagi rame banget. Tunggu 1 menit ya atau pakai API Key sendiri di Settings.";
        } else {
            cleanMsg = `Gagal: ${errTxt.slice(0, 100)}`;
        }
        return res.status(503).json({ error: cleanMsg });
    }

    // --- 5. KIRIM HASIL KE FRONTEND ---
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    });

    const groundingSources = new Map();

    for await (const chunk of resultStream) {
      // Ambil sumber referensi (Google Search) jika ada
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

    // Tampilkan sumber di bawah chat jika ada
    if (groundingSources.size > 0) {
        res.write("\n\n---\n**📚 Sumber:**\n");
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