import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { UserConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }): UserConfig => {
  // Load env file based on `mode` in the current working directory.
  // Casting process to any to avoid TS error about 'cwd' missing on Process interface
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Expose process.env.API_KEY to the client-side code
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});