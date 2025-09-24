import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  base: '/CheckBadges/',
  plugins: [react()],
  build: {
    target: 'esnext'
  }
});
