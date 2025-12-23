import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
      firebase: path.resolve(__dirname, '../../node_modules/firebase'),
      'firebase/app': path.resolve(__dirname, '../../node_modules/firebase/app'),
      'firebase/auth': path.resolve(__dirname, '../../node_modules/firebase/auth'),
      'firebase/firestore': path.resolve(__dirname, '../../node_modules/firebase/firestore'),
    },
    dedupe: ['firebase', 'firebase/app', 'firebase/auth', 'firebase/firestore'],
  },
  build: {
    outDir: 'dist',
  },
});
