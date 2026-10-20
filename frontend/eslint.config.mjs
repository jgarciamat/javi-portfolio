import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    // Tooling scripts (case bank, tax-form extractors, validators) are not part of the app project.
    ignores: ['**/*.js', '**/*.mjs', '**/*.cjs', 'scripts/**', 'dist/**', 'coverage/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  prettier,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true }, project: './tsconfig.json' },
      globals: { ...globals.browser, ...globals.es2021, ...globals.jest },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // Principio de Responsabilidad Única (SRP)
      'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 10],

      // Buenas prácticas de React
      'react/react-in-jsx-scope': 'off', // No necesario en React 17+
      'react/prop-types': 'off', // Usamos TypeScript
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // TypeScript
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-unused-vars': 'off', // delegado a @typescript-eslint/no-unused-vars

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Test files and other files outside tsconfig.json: no typed linting.
    files: [
      'src/__tests__/**/*.{ts,tsx}',
      'e2e/**/*.ts',
      'playwright.config.ts',
      'capacitor.config.ts',
      'vite.config.ts',
    ],
    languageOptions: { parserOptions: { project: null } },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'max-lines-per-function': 'off',
      complexity: 'off',
    },
  }
);
