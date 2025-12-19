import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, message, attachments, systemInstruction, customApiKey } = req.body;

    // --- 1. KEY MANAGEMENT (THE 10 KEYS POOL) ---
    // Kita manfaatkan 10 kunci gratisanmu secara bergantian (Load Balancing).
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
        // Acak urutan agar beban terbagi rata.
        targetKeys = rawKeys.filter(k => k && k.trim().length > 0).sort(() => 0.5 - Math.random());
    }

    if (targetKeys.length === 0) {
      return res.status(500).json({ error: "Server Error: Tidak ada API Key yang tersedia." });
    }

    // --- 2. DATA PREPARATION ---
    const processedHistory = (history || [])
        .filter(h => h.text && h.text.trim().length > 0)
        .slice(-10) // Kita bisa simpan sedikit lebih banyak history karena model Flash context-nya besar
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

    // --- 3. EKSEKUSI: SMART FLEET STRATEGY ---
    // Target: Hemat, Cepat, Tapi Pintar.
    let resultStream = null;
    let lastError = null;

    for (let i = 0; i < targetKeys.length; i++) {
        const key = targetKeys[i];

        try {
            const ai = new GoogleGenAI({ apiKey: key });
            
            const chat = ai.chats.create({
                // Pilihan Model: Gemini 3 Flash Preview
                // Alasan: Paling imbang antara kecepatan, kecerdasan, dan efisiensi kuota gratis.
                model: 'gemini-3-flash-preview', 
                
                config: {
                    systemInstruction: systemInstruction,
                    
                    // THINKING CONFIG (RAHASIA KEPINTARAN)
                    // Budget 1024: Cukup untuk mikir logika coding/matematika,
                    // tapi tidak terlalu lama sampai bikin user nunggu ("Responsif").
                    // Ini jauh lebih hemat daripada mode Pro.
                    thinkingConfig: { thinkingBudget: 1024 }, 
                    
                    tools: [{ googleSearch: {} }],
                },
                history: processedHistory,
            });

            resultStream = await chat.sendMessageStream({ message: contents });
            
            // Jika berhasil konek dan dapat stream, stop loop kunci.
            break; 

        } catch (err) {
            const errMsg = err.message || "";
            lastError = err;

            // Log error untuk debug (server side logs)
            console.warn(`Key ke-${i+1} gagal: ${errMsg.slice(0, 100)}...`);

            // Jika error karena User (misal gambar tidak valid), jangan retry kunci lain, langsung lempar error.
            if (errMsg.includes('INVALID_ARGUMENT') || errMsg.includes('400')) {
                 return res.status(400).json({ error: "Permintaan ditolak Google (Cek input/gambar)." });
            }

            // Jika error Limit (429) atau Server (503), LANJUT KE KUNCI BERIKUTNYA.
            continue;
        }
    }

    // --- 4. JIKA 10 KUNCI KO ---
    if (!resultStream) {
        console.error("ALL 10 KEYS FAILED.");
        let cleanMsg = "Server sibuk.";
        const errTxt = lastError?.message || "";
        
        if (errTxt.includes('429') || errTxt.includes('quota')) {
            cleanMsg = "⚠️ Semua 10 Akun Sedang Sibuk! Mohon tunggu 1 menit agar kuota reset.";
        } else {
            cleanMsg = `Gagal menghubungkan: ${errTxt.slice(0, 80)}`;
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