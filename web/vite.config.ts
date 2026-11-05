import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Tudo que começar com /api é repassado para o backend.
    // Assim o frontend não precisa saber em qual porta a API está.
    proxy: { '/api': 'http://localhost:3333' },
  },
});
