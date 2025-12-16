import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, customApiKey } = req.body;

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
        targetKeys = rawKeys.filter(k => k && k.trim().length > 0).sort(() => 0.5 - Math.random());
    }

    if (targetKeys.length === 0) {
      return res.status(500).json({ error: "No API Keys found." });
    }

    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    let success = false;
    let imageData = null;
    let lastError = null;

    for (const currentKey of targetKeys) {
        try {
            const ai = new GoogleGenAI({ apiKey: currentKey });
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [{ text: prompt }]
                },
                config: {},
            });

            const parts = response.candidates?.[0]?.content?.parts;
            if (parts) {
                for (const part of parts) {
                    if (part.inlineData) {
                        imageData = part.inlineData.data;
                        success = true;
                        break;
                    }
                }
            }

            if (success) break;

        } catch (err) {
            lastError = err;
            if (customApiKey) throw new Error(err.message);
            continue; 
        }
    }

    if (!success || !imageData) {
        return res.status(503).json({ error: "Gagal membuat gambar: " + (lastError?.message || "Model error") });
    }

    res.status(200).json({ image: imageData });

  } catch (globalError) {
    console.error("Image API Fatal Error:", globalError);
    res.status(500).json({ error: globalError.message });
  }
}