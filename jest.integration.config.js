/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage/integration',
  coveragePathIgnorePatterns: ['test/*', 'src/db/migrations/*'],
  roots: ['<rootDir>/test'],
  testMatch: ['<rootDir>/test/integration/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  // globalSetup: '<rootDir>/test/integration/db/init.ts',
}
