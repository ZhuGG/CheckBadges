import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  // Always use relative asset URLs so the app works whether it is served from
  // the repository subpath on GitHub Pages or from any other base URL.
  base: './',
  plugins: [react()],
  build: {
    // Target a broadly supported ECMAScript version to avoid syntax errors (blank page)
    // on older browsers that do not yet understand features like optional chaining.
    target: 'es2019'
  }
});
