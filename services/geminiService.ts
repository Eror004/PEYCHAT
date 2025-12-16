import { MessageObject, Attachment } from "../types";

export const streamChatResponse = async (
  currentHistory: MessageObject[],
  userMessage: string,
  attachments: Attachment[] | undefined,
  systemInstruction: string,
  onChunk: (chunkText: string) => void,
  customApiKey?: string,
  signal?: AbortSignal // Tambahkan parameter signal
): Promise<void> => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Filter pesan yang valid saja untuk history
        history: currentHistory.filter(msg => !msg.isStreaming && msg.text && msg.text.trim().length > 0),
        message: userMessage,
        attachments: attachments,
        systemInstruction: systemInstruction,
        customApiKey: customApiKey // Kirim custom key jika ada
      }),
      signal: signal // Pasang signal ke fetch
    });

    if (!response.ok) {
      // Coba baca error details dari body response
      let errorDetails = response.statusText;
      try {
        const errorText = await response.text();
        // Cek apakah response berupa JSON
        try {
            const jsonError = JSON.parse(errorText);
            errorDetails = jsonError.error || errorText;
        } catch {
            // Kalau bukan JSON (misal HTML error dari Vercel), ambil text-nya (dipotong biar gak kepanjangan)
            errorDetails = errorText.slice(0, 100); 
        }
      } catch (e) {
        // Ignore parsing error
      }
      
      throw new Error(`Server Error (${response.status}): ${errorDetails}`);
    }

    if (!response.body) {
      throw new Error("Tidak ada respon dari server.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      onChunk(chunk);
    }

  } catch (error: any) {
    if (error.name === 'AbortError') {
        console.log('Stream dihentikan oleh user (Stop Bacot).');
        return; // Jangan lempar error jika di-abort sengaja
    }
    console.error("Chat Service Error:", error);
    // Lempar error asli agar user tau apa yang salah (misal: API Key kurang)
    throw new Error(error.message || "Gagal menghubungkan ke PEYCHAT brain.");
  }
};

export const generateImage = async (prompt: string, customApiKey?: string): Promise<string> => {
    try {
        const response = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, customApiKey }), // Kirim custom key jika ada
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Gagal membuat gambar.");
        }

        const data = await response.json();
        if (!data.image) throw new Error("Server tidak mengembalikan data gambar.");
        
        return data.image; // Base64 string
    } catch (error: any) {
        console.error("Image Gen Error:", error);
        throw new Error(error.message || "Gagal generate gambar.");
    }
};