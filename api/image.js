import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // --- KEY ROTATION ---
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
      return res.status(500).json({ error: "No API Keys found." });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    const shuffledKeys = availableKeys.sort(() => 0.5 - Math.random());
    let success = false;
    let imageData = null;
    let lastError = null;

    // --- TRY GENERATE IMAGE ---
    for (const currentKey of shuffledKeys) {
        try {
            const ai = new GoogleGenAI({ apiKey: currentKey });
            
            // Using gemini-2.5-flash-image for image generation
            // According to docs: "The output response may contain both image and text parts"
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [{ text: prompt }]
                },
                config: {
                    // responseMimeType is NOT supported for nano banana
                    // responseSchema is NOT supported
                },
            });

            // Iterate through parts to find the image
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
            console.warn(`Image Gen Error (${currentKey.slice(-4)}):`, err.message);
            // 429 = Rate Limit, 503 = Overload. Try next key.
            continue; 
        }
    }

    if (!success || !imageData) {
        return res.status(503).json({ error: "Gagal membuat gambar: " + (lastError?.message || "Model tidak mengembalikan gambar.") });
    }

    // Return JSON with base64 image
    res.status(200).json({ image: imageData });

  } catch (globalError) {
    console.error("Image API Fatal Error:", globalError);
    res.status(500).json({ error: globalError.message });
  }
}