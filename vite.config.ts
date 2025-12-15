import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { UserConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }): UserConfig => {
  // Load env file based on `mode` in the current working directory.
  // Casting process to any to avoid TS error
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Prioritize process.env (Vercel System Env) -> env file (.env)
  const apiKey = process.env.API_KEY || env.API_KEY;

  return {
    plugins: [react()],
    define: {
      // Stringify is crucial here. If apiKey is undefined, it becomes "undefined" string or null.
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
  };
});