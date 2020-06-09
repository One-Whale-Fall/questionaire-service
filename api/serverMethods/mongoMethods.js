'use strict';

const MongoClient = require('mongodb').MongoClient;
const Pack = require('../../package.json');
const Config = require('../../config.js');
let dbClient = null;

const getDbClient = async function () {

    if (dbClient === null) {
        dbClient = await MongoClient.connect(Config.dbUrl, { useNewUrlParser: true });
    }

    return dbClient;
};

const mongo = {
    name: 'mongoDbMethods',
    version: Pack.version,
    register: function (server, options) {

        server.method('getDbClient', getDbClient);
    }
};

module.exports = mongo;
