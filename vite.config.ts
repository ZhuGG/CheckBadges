import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

export default defineConfig({
  base: isGitHubPages ? '/CheckBadges/' : './',
  plugins: [react()],
  build: {
    // Target a broadly supported ECMAScript version to avoid syntax errors (blank page)
    // on older browsers that do not yet understand features like optional chaining.
    target: 'es2019'
  }
});
