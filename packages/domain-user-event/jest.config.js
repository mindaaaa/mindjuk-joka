const baseConfig = require('../../jest.config.base');

module.exports = {
    ...baseConfig,
    displayName: 'domain-user-event',
    rootDir: '.',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
