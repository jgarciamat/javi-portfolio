module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  env: {
    browser: true,
    es2022: true,
    jest: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // Principio de Responsabilidad Única (SRP)
    'max-lines-per-function': ['warn', { max: 150, skipBlankLines: true, skipComments: true }],
    'complexity': ['warn', 10],

    // Buenas prácticas de React
    'react/react-in-jsx-scope': 'off', // No necesario en React 17+
    'react/prop-types': 'off', // Usamos TypeScript
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // TypeScript
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-unused-vars': 'off', // delegado a @typescript-eslint/no-unused-vars

    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      // Test files and other files outside tsconfig.json
      // project: null disables typed linting (no type-aware rules needed here)
      files: [
        'src/__tests__/**/*.ts',
        'src/__tests__/**/*.tsx',
        'cypress/**/*.ts',
        'cypress.config.ts',
        'vite.config.ts',
        'setupTests.ts',
        'core/**/*.ts',
        'shared/**/*.ts',
      ],
      parserOptions: {
        project: null,
      },
      rules: {
        'react/react-in-jsx-scope': 'off',
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        'no-unused-vars': 'off',
      },
    },
  ],
};
