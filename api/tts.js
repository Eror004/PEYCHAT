import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // --- 1. KEY ROTATION SYSTEM (Sama seperti chat.js) ---
    const rawKeys = [
      process.env.PEYY_KEY,
      process.env.PEYY_KEY_2,
      process.env.PEYY_KEY_3,
      process.env.PEYY_KEY_4,
      process.env.PEYY_KEY_5,
      process.env.PEYY_KEY_6,
      process.env.PEYY_KEY_7,
      process.env.API_KEY
    ];

    const availableKeys = rawKeys.filter(k => k && k.trim().length > 0);

    if (availableKeys.length === 0) {
      return res.status(500).json({ error: "Server Misconfig: No API Keys." });
    }

    const { text, voiceName } = req.body;

    if (!text) {
        return res.status(400).json({ error: "Text is required" });
    }

    // --- 2. EXECUTE TTS ---
    const shuffledKeys = availableKeys.sort(() => 0.5 - Math.random());
    let success = false;
    let audioData = null;
    let lastError = null;

    for (const currentKey of shuffledKeys) {
        try {
            const ai = new GoogleGenAI({ apiKey: currentKey });
            
            // Menggunakan model khusus TTS
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: {
                    parts: [{ text: text }]
                },
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            // ENFORCE FENRIR AS DEFAULT
                            prebuiltVoiceConfig: { 
                                voiceName: voiceName || 'Fenrir' 
                            },
                        },
                    },
                },
            });

            // Ambil binary audio dari response
            const candidate = response.candidates?.[0];
            const part = candidate?.content?.parts?.[0];
            
            if (part?.inlineData?.data) {
                audioData = part.inlineData.data;
                success = true;
                break;
            } else {
                throw new Error("No audio data received from model.");
            }

        } catch (err) {
            lastError = err;
            console.warn(`TTS Key Error (${currentKey.slice(-4)}):`, err.message);
            // Lanjut ke key berikutnya jika error
            continue;
        }
    }

    if (!success || !audioData) {
        return res.status(503).json({ error: "Gagal generate suara: " + (lastError?.message || "Unknown error") });
    }

    // Return base64 string directly
    res.status(200).json({ audio: audioData });

  } catch (globalError) {
    console.error("TTS Fatal Error:", globalError);
    res.status(500).json({ error: globalError.message });
  }
}