import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages: /fire-extinguisher-register/ 配下にデプロイ
  base: '/fire-extinguisher-register/',
});
