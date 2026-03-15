const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'lib-drizzle',
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
