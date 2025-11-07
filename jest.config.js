module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/api'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'api/**/*.js',
    '!api/__tests__/**',
    '!api/server.js',
    '!api/index.js.backup',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
};
