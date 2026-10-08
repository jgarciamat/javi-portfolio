module.exports = {
  ignorePatterns: ['dist/', 'coverage/', 'node_modules/', 'scripts/'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier'],
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    jest: true,
    es2022: true,
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
  overrides: [
    {
      // Inferred types are clearer here than repeating them by hand.
      files: [
        'src/tests/**/*.ts',
        'src/infrastructure/http/**/*.ts',
        'src/infrastructure/container.ts',
        'src/infrastructure/sqlite/migrator.ts',
      ],
      rules: { '@typescript-eslint/explicit-function-return-type': 'off' },
    },
  ],
};
