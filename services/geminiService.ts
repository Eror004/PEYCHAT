import { MessageObject, Attachment } from "../types";

export const streamChatResponse = async (
  currentHistory: MessageObject[],
  userMessage: string,
  attachments: Attachment[] | undefined,
  systemInstruction: string,
  onChunk: (chunkText: string) => void,
  customApiKey?: string,
  signal?: AbortSignal
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
        customApiKey: customApiKey
      }),
      signal: signal
    });

    if (!response.ok) {
      let errorDetails = "Terjadi kesalahan server.";
      try {
        const errorText = await response.text();
        // Coba parse JSON, jika berhasil ambil property .error
        try {
            const jsonError = JSON.parse(errorText);
            // Handle struktur error Google yang bersarang
            if (jsonError.error?.message) {
                // Hapus detail teknis berlebih jika ada
                errorDetails = jsonError.error.message;
            } else if (jsonError.error) {
                errorDetails = typeof jsonError.error === 'string' ? jsonError.error : JSON.stringify(jsonError.error);
            } else {
                errorDetails = errorText;
            }
        } catch {
            // Jika bukan JSON, pakai text mentah tapi batasi panjangnya
            errorDetails = errorText.slice(0, 150);
        }
      } catch (e) {
        errorDetails = response.statusText;
      }
      
      throw new Error(errorDetails); // Lempar string bersih
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
        console.log('Stream dihentikan oleh user.');
        return; 
    }
    console.error("Chat Service Error:", error);
    
    // Pastikan error message bersih dari karakter aneh JSON
    let cleanMsg = error.message || "Gagal menghubungkan ke PEYCHAT brain.";
    if (cleanMsg.includes('{')) {
        try {
            // Last ditch effort to clean JSON string from message
            const match = cleanMsg.match(/"message":\s*"([^"]+)"/);
            if (match && match[1]) cleanMsg = match[1];
        } catch(e) {}
    }

    throw new Error(cleanMsg);
  }
};

export const generateImage = async (prompt: string, customApiKey?: string): Promise<string> => {
    try {
        const response = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, customApiKey }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let cleanError = errorText;
            try {
                const json = JSON.parse(errorText);
                cleanError = json.error || errorText;
            } catch {}
            throw new Error(cleanError);
        }

        const data = await response.json();
        if (!data.image) throw new Error("Server tidak mengembalikan data gambar.");
        
        return data.image; 
    } catch (error: any) {
        console.error("Image Gen Error:", error);
        throw new Error(error.message || "Gagal generate gambar.");
    }
};