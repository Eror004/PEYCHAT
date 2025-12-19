import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text, voiceName, customApiKey } = req.body;

    let availableKeys = [];
    if (customApiKey && customApiKey.trim().length > 0) {
        availableKeys = [customApiKey.trim()];
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
        availableKeys = rawKeys.filter(k => k && k.trim().length > 0).sort(() => 0.5 - Math.random());
    }

    if (availableKeys.length === 0) {
      return res.status(500).json({ error: "No API Keys available." });
    }

    if (!text) return res.status(400).json({ error: "Text is required" });

    let success = false;
    let audioData = null;
    let lastError = null;

    // LOOP SEMUA KUNCI
    for (let i = 0; i < availableKeys.length; i++) {
        const currentKey = availableKeys[i];
        try {
            const ai = new GoogleGenAI({ apiKey: currentKey });
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: { parts: [{ text: text }] },
                config: {
                    responseModalities: ['AUDIO'],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceName || 'Charon' },
                        },
                    },
                },
            });

            const part = response.candidates?.[0]?.content?.parts?.[0];
            if (part?.inlineData?.data) {
                audioData = part.inlineData.data;
                success = true;
                break; // Berhasil!
            }
        } catch (err) {
            lastError = err;
            console.warn(`TTS Key ${i} failed, trying next...`);
            continue;
        }
    }

    if (!success || !audioData) {
        return res.status(503).json({ error: "Gagal memproses suara. Semua server sibuk." });
    }

    res.status(200).json({ audio: audioData });

  } catch (globalError) {
    console.error("TTS Fatal Error:", globalError);
    res.status(500).json({ error: globalError.message });
  }
}