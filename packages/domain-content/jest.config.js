const baseConfig = require('../../jest.config.base');

module.exports = {
    ...baseConfig,
    displayName: 'domain-content',
    rootDir: '.',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
