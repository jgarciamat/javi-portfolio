module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleNameMapper: {
        // Specific override first — prevents import.meta in api.config.ts
        '^@core/config/api\\.config$': '<rootDir>/src/__mocks__/api.config.ts',
        '^@modules/(.*)$': '<rootDir>/src/modules/$1',
        '^@shared/(.*)$': '<rootDir>/src/shared/$1',
        '^@core/(.*)$': '<rootDir>/src/core/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        // Entry points & boilerplate
        '!src/main.tsx',
        '!src/vite-env.d.ts',
        '!src/App.tsx',
        '!src/index.css',
        // Type-only files (no executable branches)
        '!src/**/*.d.ts',
        '!src/**/*.types.ts',
        '!src/**/types.ts',
        '!src/**/types/index.ts',
        // Barrel re-export indexes
        '!src/**/index.ts',
        // Setup file
        '!src/setupTests.ts',
        // Config file replaced by mock — import.meta not transpilable
        '!src/core/config/api.config.ts',
        // Mock files are not production code
        '!src/__mocks__/**',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    verbose: true,
};
