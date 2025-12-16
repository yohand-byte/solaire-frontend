import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Firebase Hosting serves at root
  base: '/',
  plugins: [react()],
});
