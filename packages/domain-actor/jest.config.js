const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'domain-actor',
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
