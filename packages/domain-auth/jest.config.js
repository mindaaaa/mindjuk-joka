const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'domain-auth',
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
