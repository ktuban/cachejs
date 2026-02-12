const rootConfig = require('../../jest.config.cjs');

module.exports = {
  ...rootConfig,
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  moduleNameMapper: {
    '^@ktuban/cachejs$': '<rootDir>/dist/esm',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
