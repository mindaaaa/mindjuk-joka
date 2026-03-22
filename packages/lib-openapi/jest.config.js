const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'lib-openapi',
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
