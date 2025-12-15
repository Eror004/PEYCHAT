import { MessageObject, Attachment } from "../types";

export const streamChatResponse = async (
  currentHistory: MessageObject[],
  userMessage: string,
  attachments: Attachment[] | undefined,
  systemInstruction: string,
  onChunk: (chunkText: string) => void
): Promise<void> => {
  try {
    // Kita panggil endpoint serverless sendiri, bukan langsung ke Google
    // Ini lebih aman dan API Key dijamin terbaca di sisi server
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Kirim data yang diperlukan saja
        history: currentHistory.filter(msg => !msg.isStreaming && msg.text),
        message: userMessage,
        attachments: attachments,
        systemInstruction: systemInstruction
      }),
    });

    if (!response.ok) {
      let errorMsg = "Terjadi kesalahan pada server.";
      try {
        const errData = await response.json();
        errorMsg = errData.error || response.statusText;
      } catch (e) {
        errorMsg = response.statusText;
      }
      throw new Error(errorMsg);
    }

    if (!response.body) {
      throw new Error("Tidak ada respon dari server.");
    }

    // Baca stream dari server
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
    // Lempar error agar ditangkap oleh UI (App.tsx)
    throw new Error(error.message || "Gagal menghubungkan ke PEYCHAT brain.");
  }
};