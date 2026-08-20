import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import obsidian from 'eslint-plugin-obsidianmd';

export default tseslint.config(
  {
    ignores: [
      'main.js',
      '**/*.mjs',
      'scripts/**/*.mjs',
      'tests/**/*.mjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  obsidian.configs.recommended,
);
