module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // E2E tests run in Node environment
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/e2e/**/*.e2e.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testTimeout: 60000, // 60 seconds for E2E tests
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
};
