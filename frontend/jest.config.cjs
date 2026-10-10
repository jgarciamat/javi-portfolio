module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    // CSS/asset files — must come before alias rules so aliased CSS paths are also mocked
    '\\.(css|less|scss|sass|png|jpg|jpeg|gif|svg|webp)$': '<rootDir>/src/__mocks__/fileMock.js',
    // import.meta is not available in Jest: the API base URL comes from a mock
    '^@core/config/api\\.config$': '<rootDir>/src/__mocks__/api.config.ts',
    '^@react-oauth/google$': '<rootDir>/src/__mocks__/@react-oauth/google.tsx',
    '^@revenuecat/purchases-capacitor$': '<rootDir>/src/__mocks__/purchases.ts',
    '^virtual:pwa-register/react$': '<rootDir>/src/__mocks__/pwaRegister.ts',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@locales/(.*)$': '<rootDir>/src/locales/$1',
    '^@test-utils/(.*)$': '<rootDir>/src/test-utils/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    // Bootstrapping only: renders <App /> into #root with the Google client id.
    '!src/main.tsx',
    // Reads import.meta.env (Vite only); replaced by a mock in tests.
    '!src/core/config/api.config.ts',
    '!src/**/*.d.ts',
    '!src/setupTests.ts',
    '!src/__mocks__/**',
    '!src/test-utils/**',
  ],
  coverageThreshold: {
    global: { statements: 100, branches: 100, functions: 100, lines: 100 },
  },
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};
