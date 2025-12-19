import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, message, attachments, systemInstruction, customApiKey } = req.body;

    // --- 1. KUMPULKAN AMUNISI (KEYS) ---
    let availableKeys = [];
    
    // Jika user punya key sendiri di settings, pakai itu HANYA satu-satunya.
    if (customApiKey && customApiKey.trim().length > 0) {
        availableKeys = [customApiKey.trim()];
    } else {
        // Kumpulkan semua kunci dari environment
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
        
        // Bersihkan yang kosong/undefined
        availableKeys = rawKeys.filter(k => k && k.trim().length > 0);
        
        // Acak urutan agar tidak selalu Kunci 1 yang kena limit duluan (Load Balancing)
        availableKeys = availableKeys.sort(() => 0.5 - Math.random());
    }

    if (availableKeys.length === 0) {
      console.error("CRITICAL: Tidak ada API KEY yang ditemukan di Environment Variables.");
      return res.status(500).json({ error: "Server Error: Konfigurasi API Key kosong. Hubungi admin." });
    }

    // --- 2. PERSIAPAN DATA ---
    const processedHistory = (history || [])
        .filter(h => h.text && h.text.trim().length > 0)
        .slice(-10) 
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

    // --- 3. EKSEKUSI: MACHINE GUN LOOP ---
    let resultStream = null;
    let lastError = null;
    let usedKeyIndex = -1;

    // Loop mencoba setiap kunci sampai ada yang berhasil
    for (let i = 0; i < availableKeys.length; i++) {
        const currentKey = availableKeys[i];
        
        try {
            // Coba inisialisasi dengan kunci saat ini
            const ai = new GoogleGenAI({ apiKey: currentKey });
            
            // Gunakan Flash + Thinking (Hemat tapi Pintar)
            const chat = ai.chats.create({
                model: 'gemini-3-flash-preview', 
                config: {
                    systemInstruction: systemInstruction,
                    thinkingConfig: { thinkingBudget: 1024 }, 
                    tools: [{ googleSearch: {} }],
                },
                history: processedHistory,
            });

            // Coba kirim pesan
            resultStream = await chat.sendMessageStream({ message: contents });
            
            // JIKA SAMPAI SINI, BERARTI BERHASIL!
            usedKeyIndex = i;
            console.log(`[Success] Request berhasil menggunakan Key index ke-${i} (dari total ${availableKeys.length} keys).`);
            break; // Keluar dari loop, kita sudah dapat streamnya.

        } catch (err) {
            // JIKA GAGAL, LOG DAN LANJUT KE KUNCI BERIKUTNYA
            const errMsg = err.message || "Unknown error";
            lastError = err;
            console.warn(`[Fail] Key index ke-${i} gagal. Reason: ${errMsg.slice(0, 100)}...`);

            // Pengecualian: Jika errornya adalah "INVALID_ARGUMENT" (biasanya salah input/gambar), 
            // ganti kunci pun percuma. Stop di sini.
            if (errMsg.includes('INVALID_ARGUMENT') || errMsg.includes('400')) {
                 return res.status(400).json({ error: "Google menolak request ini (Cek input/gambar kamu)." });
            }

            // Lanjut ke iterasi loop berikutnya (Kunci selanjutnya)...
            continue;
        }
    }

    // --- 4. JIKA SEMUA PELURU HABIS ---
    if (!resultStream) {
        console.error("FATAL: Semua API Key gagal digunakan.");
        let cleanMsg = "Server sibuk.";
        const errTxt = lastError?.message || "";
        
        if (errTxt.includes('429') || errTxt.includes('quota')) {
            cleanMsg = `⚠️ LIMIT PARAH. ${availableKeys.length} akun Google semuanya habis kuota. Coba 2 menit lagi.`;
        } else if (errTxt.includes('API_KEY')) {
            cleanMsg = "⚠️ Masalah Konfigurasi Key. Pastikan Env Var diisi.";
        } else {
            cleanMsg = `Gagal total: ${errTxt.slice(0, 80)}`;
        }
        return res.status(503).json({ error: cleanMsg });
    }

    // --- 5. STREAMING RESPONSE ---
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    });

    const groundingSources = new Map();

    try {
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
    } catch (streamError) {
        console.error("Error saat streaming (koneksi putus di tengah jalan):", streamError);
        res.write("\n\n[Koneksi terputus...]");
    }

    res.end();

  } catch (globalError) {
    console.error("Handler Crash Total:", globalError);
    if (!res.headersSent) {
        res.status(500).json({ error: globalError.message });
    }
  }
}