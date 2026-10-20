import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/*.js', '**/*.mjs', '**/*.cjs', 'dist/', 'coverage/', 'node_modules/', 'scripts/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { project: './tsconfig.json' },
      globals: { ...globals.node, ...globals.jest, ...globals.es2021 },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    },
  },
  {
    // Inferred types are clearer here than repeating them by hand.
    files: [
      'src/tests/**/*.ts',
      'src/infrastructure/http/**/*.ts',
      'src/infrastructure/container.ts',
      'src/infrastructure/sqlite/migrator.ts',
    ],
    rules: { '@typescript-eslint/explicit-function-return-type': 'off' },
  }
);
