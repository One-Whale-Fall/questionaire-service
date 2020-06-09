'use strict';

const ServiceEntry = require('./api/index.js');

let hapiServer = null;
// Graceful shutdown
process.on('SIGTERM', () => {

    hapiServer.stop();
    process.exit(0);
});

process.on('unhandledRejection', (error, file, num) => {

    console.error('UnhandledRejection', error.message, file, num);
    hapiServer.stop();
    process.exit(2);
});
process.on('uncaughtException', (error, file, num) => {

    console.error('UncaughtException', error.message, file, num);
    hapiServer.stop();
    process.exit(1);
});

ServiceEntry.initialize().then((server) => {

    hapiServer = server;
});
