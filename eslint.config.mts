import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import obsidian from 'eslint-plugin-obsidianmd';

export default tseslint.config(
  {
    ignores: [
      'main.js',
      'eslint.config.mts',
      'eslint.config.mjs',
      '**/*.mjs',
      '**/*.cjs',
      '**/*.js',
      'scripts/**',
      'tests/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  obsidian.configs.recommended,
);
