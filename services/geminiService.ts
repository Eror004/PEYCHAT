import { MessageObject, Attachment } from "../types";

export const streamChatResponse = async (
  currentHistory: MessageObject[],
  userMessage: string,
  attachments: Attachment[] | undefined,
  systemInstruction: string,
  onChunk: (chunkText: string) => void
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
        systemInstruction: systemInstruction
      }),
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
    console.error("Chat Service Error:", error);
    // Lempar error asli agar user tau apa yang salah (misal: API Key kurang)
    throw new Error(error.message || "Gagal menghubungkan ke PEYCHAT brain.");
  }
};