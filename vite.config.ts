import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: isGitHubPages ? '/CheckBadges/' : './',
  plugins: [react()],
  build: {
    target: 'esnext'
  }
});
