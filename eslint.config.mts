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
      'scripts/**',
      'tests/**',
    ],
  },
  {
    files: ['src/**/*.ts', 'packages/**/*.ts'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      obsidian.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
