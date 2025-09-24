import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

const repository = process.env.GITHUB_REPOSITORY?.split('/').slice(-1)[0];
const isGithubPages = process.env.GITHUB_ACTIONS === 'true' && repository;

export default defineConfig({
  // When building inside GitHub Actions (deployment to GitHub Pages), force the
  // base path to the repository subdirectory so that the generated module
  // scripts are resolved correctly even when the trailing slash is missing
  // (e.g. https://<user>.github.io/CheckBadges). For local builds we keep
  // relative URLs to preserve the previous behaviour.
  base: isGithubPages ? `/${repository}/` : './',
  plugins: [react()],
  build: {
    // Target a broadly supported ECMAScript version to avoid syntax errors (blank page)
    // on older browsers that do not yet understand features like optional chaining.
    target: 'es2019'
  }
});
