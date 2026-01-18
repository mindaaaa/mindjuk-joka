const baseConfig = require('../../jest.config.base');

module.exports = {
    ...baseConfig,
    displayName: 'core',
    rootDir: '.',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};