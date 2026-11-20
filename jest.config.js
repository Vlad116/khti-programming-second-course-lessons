export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/jest/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/jest/integration-db/'],
  verbose: true,
  collectCoverageFrom: ['middleware/**/*.js', 'controllers/**/*.js', 'repositories/tasks.js'],
  coverageDirectory: 'coverage',
  clearMocks: true
};
