const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'lib-mime',
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
