import globals from 'globals';
import obsidianmd from 'eslint-plugin-obsidianmd';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
  globalIgnores([
    'node_modules/**',
    'dist/**',
    'main.js',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'versions.json',

    // Build/tooling/config files are not plugin source and should not be
    // processed by typed TypeScript rules.
    'eslint.config.mts',
    '**/eslint.config.mts',
    '**/*.mjs',
    '**/*.cjs',
    '**/*.js',

    'scripts/**',
    'tests/**',
  ]),
  {
    files: ['src/**/*.ts', 'packages/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...obsidianmd.configs.recommended,
);
