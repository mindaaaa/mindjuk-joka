const baseConfig = require('../../jest.config.base');

module.exports = {
  ...baseConfig,
  displayName: 'nail-artist',
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
