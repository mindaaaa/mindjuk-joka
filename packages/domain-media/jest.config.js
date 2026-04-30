const baseConfig = require('../../jest.config.base');

module.exports = {
    ...baseConfig,
    displayName: 'domain-media',
    rootDir: '.',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};