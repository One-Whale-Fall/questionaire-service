'use strict';

class systemConfig {

    get host() {

        return '0.0.0.0';
    }
    get swaggerHost() {

        //TODO should return the realy URL deployed to cloud
        return `0.0.0.0:${this.port}`;
    }
    get port() {

        return   3004;
    }
    get loggingLevel() {

        return process.env.ENV_LOGGING_LEVEL || 'error';
    }
    get dbUrl() {

        return process.env.ENV_DB_URL || 'mongodb://localhost:27017';
    }
    get dbName() {

        return process.env.ENV_DB_NAME || 'questionaire';
    }
    get conferenceApiBaseUrl() {

        return process.env.ENV_CONFERENCE_BASE_URL || 'http://localhost:3003/v1';
    }
    get responseFailValidationAction() {

        return process.env.ENV_RESPONSE_FAIL_VALIDATION_ACTION || 'log';
    }
}

module.exports = new systemConfig();
