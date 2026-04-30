const baseConfig = require('../../jest.config.base');

module.exports = {
    ...baseConfig,
    displayName: 'infra-thumbnail',
    rootDir: '.',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};