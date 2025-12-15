import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Kita tidak perlu lagi define process.env.API_KEY disini
  // karena frontend sekarang memanggil /api/chat (backend)
});