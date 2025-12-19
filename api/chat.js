import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, message, attachments, systemInstruction, customApiKey } = req.body;

    // --- 1. KEY MANAGEMENT (THE AVENGERS) ---
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
        // Filter & Shuffle
        targetKeys = rawKeys.filter(k => k && k.trim().length > 0).sort(() => 0.5 - Math.random());
    }

    if (targetKeys.length === 0) {
      return res.status(500).json({ error: "Server Error: API Key tidak ditemukan di sistem." });
    }

    // --- 2. DATA PREPARATION ---
    const processedHistory = (history || [])
        .filter(h => h.text && h.text.trim().length > 0)
        .slice(-8) // Kurangi history jadi 8 untuk hemat token
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

    // --- 3. EKSEKUSI DENGAN FALLBACK STRATEGY ---
    // Kita akan mencoba kunci satu per satu dengan strategi yang makin "hemat"
    
    let resultStream = null;
    let lastError = null;
    let successKey = null;

    // Loop semua kunci yang tersedia
    for (let i = 0; i < targetKeys.length; i++) {
        const key = targetKeys[i];
        
        // Strategi Hemat: 
        // Kunci pertama pakai Thinking (Pintar).
        // Kunci kedua dst MATIKAN Thinking (Hemat Token & Cepat).
        const useThinking = (i === 0); 

        try {
            const ai = new GoogleGenAI({ apiKey: key });
            
            // Config dinamis
            const chatConfig = {
                systemInstruction: systemInstruction,
                tools: [{ googleSearch: {} }],
            };

            if (useThinking) {
                 // Mode Pintar (Boros Token)
                 chatConfig.thinkingConfig = { thinkingBudget: 1024 };
            } else {
                 // Mode Hemat (Anti Limit)
                 chatConfig.thinkingConfig = { thinkingBudget: 0 }; 
            }

            const chat = ai.chats.create({
                model: 'gemini-3-flash-preview', 
                config: chatConfig,
                history: processedHistory,
            });

            resultStream = await chat.sendMessageStream({ message: contents });
            successKey = key;
            break; // BERHASIL

        } catch (err) {
            lastError = err;
            const errMsg = err.message || "";

            // Jika Custom Key user error, jangan lanjut ke failover
            if (customApiKey) throw new Error(`Custom Key Error: ${errMsg}`);

            // Deteksi Error Quota / Overloaded
            const isLimit = errMsg.includes('429') || errMsg.includes('503') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED');

            if (isLimit) {
                console.warn(`⚠️ Key ke-${i+1} limit (${useThinking ? 'Mode Pintar' : 'Mode Hemat'}). Switch ke key berikutnya...`);
                continue; 
            } else {
                console.error(`❌ Key ke-${i+1} error fatal:`, errMsg);
                // Jika error 400 (Bad Request), biasanya karena input user salah, jadi stop aja
                if (errMsg.includes('INVALID_ARGUMENT') || errMsg.includes('400')) {
                    throw new Error("Request ditolak oleh Google (Invalid Argument). Coba kurangi panjang chat atau reset.");
                }
                continue;
            }
        }
    }

    // --- 4. ERROR HANDLING ---
    if (!resultStream) {
        console.error("ALL KEYS FAILED.");
        let cleanMsg = "Server sibuk.";
        const errTxt = lastError?.message || "";
        
        if (errTxt.includes('429') || errTxt.includes('quota')) {
            cleanMsg = "⚠️ SEMUA 10 AKUN SEDANG LIMIT. Google mendeteksi trafik tinggi. Silakan tunggu 1 menit atau gunakan API Key sendiri di menu Settings.";
        } else {
            cleanMsg = `Gagal: ${errTxt.slice(0, 100)}...`;
        }
        return res.status(503).json({ error: cleanMsg });
    }

    // --- 5. STREAMING OUTPUT ---
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    });

    const groundingSources = new Map();

    for await (const chunk of resultStream) {
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