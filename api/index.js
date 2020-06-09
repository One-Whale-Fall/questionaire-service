'use strict';

const Hapi = require('@hapi/hapi');
const Inert = require('@hapi/inert');
const Vision = require('@hapi/vision');
const HapiSwagger = require('hapi-swagger');
const Config = require('../config.js');
const Pack = require('../package.json');

const init = async (isTestingMode = false) => {

    const server = Hapi.server({
        port: Config.port,
        host: Config.host
    });

    const swaggerOptions = {
        host: Config.swaggerHost, // outside of K8S, it's ok that this is undefined.
        jsonPath: '/swagger.json',
        swaggerUIPath: '/swaggerui/',
        documentationPath: '/documentation',
        pathPrefixSize: 2,
        info: {
            title: 'Questionaire API Documentation',
            description: `
## Ocean system Questionaire API

TODO
`,
            version: Pack.version,
        }
    };

    await server.register([
        Inert,
        Vision,
        {
            plugin: HapiSwagger,
            options: swaggerOptions
        }
    ]);

    await server.register(require('./v1/index.js'), {
        routes: {
            prefix: '/v1'
        }
    });

    // This route is needed to perform health checks on k8s
    server.route({
        method: 'GET',
        path: '/health',
        options: {
            handler: (request, h) => {

                const response = h.response({ status: 'ok' });
                return response;
            }
        }
    });

    // Register server methods
    await server.register(require('./serverMethods/mongoMethods.js'));

    if (isTestingMode) {
        await server.initialize(); // This code is only for unit test.
    }
    else {

        await server.register({
            plugin: require('hapi-pino'),
            options: {
                hapiPino: {
                    prettyPrint: false,
                    redact: ['req.headers.authorization'],
                    level: Config.loggingLevel
                }
            }
        });

        await server.start();
    }

    return server;
};

module.exports.initialize = init;
