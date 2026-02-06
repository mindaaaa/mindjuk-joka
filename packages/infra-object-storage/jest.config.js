const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'infra-object-storage',
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
