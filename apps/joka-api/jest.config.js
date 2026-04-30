const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'joka-api',
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^uuid$': '<rootDir>/test/__mocks__/uuid.ts',
  },
};
