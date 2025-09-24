import { execSync } from 'node:child_process';
import { basename } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

function inferRepositoryName(): string | undefined {
  const envRepository = process.env.GITHUB_REPOSITORY;
  if (envRepository) {
    const parts = envRepository.split('/');
    return parts[parts.length - 1];
  }

  try {
    const remoteUrl = execSync('git config --get remote.origin.url', {
      stdio: ['pipe', 'pipe', 'ignore']
    })
      .toString()
      .trim();
    if (remoteUrl) {
      const normalized = remoteUrl.replace(/\.git$/i, '').split('/');
      return normalized[normalized.length - 1];
    }
  } catch (error) {
    // ignore: no git remote configured locally
  }

  const folder = basename(process.cwd());
  return folder || undefined;
}

const repository = inferRepositoryName();
const repositoryBase = repository ? `/${repository}/` : './';

export default defineConfig(({ command }) => {
  const preferRelativeBase = process.env.CHECKBADGES_RELATIVE_BASE === 'true';
  const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
  const building = command === 'build';
  const shouldUseRepositoryBase = !preferRelativeBase && repository && (building || isGithubActions);

  return {
    // When producing the static site we must use the repository sub-path as base so that
    // GitHub Pages serves the JS bundle from the correct location even if the trailing slash
    // is missing (e.g. https://<user>.github.io/CheckBadges).
    base: shouldUseRepositoryBase ? repositoryBase : './',
    plugins: [react()],
    build: {
      // Target a broadly supported ECMAScript version to avoid syntax errors (blank page)
      // on older browsers that do not yet understand features like optional chaining.
      target: 'es2019',
      // Emit the production build in the "docs" folder so GitHub Pages can serve it directly
      // from the default project configuration without requiring a manual copy step.
      outDir: 'docs',
      emptyOutDir: true
    }
  };
});
