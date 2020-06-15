'use strict';

class systemConfig {

    get host() {

        return '0.0.0.0';
    }
    get swaggerHost() {

        //TODO should return the realy URL deployed to cloud
        return 'localhost';
    }
    get port() {

        return   3004;
    }
    get loggingLevel() {

        return process.env.ENV_LOGGING_LEVEL || 'error';
    }
    get dbUrl() {

        return process.env.ENV_DB_URL || 'mongodb://root:1jingluo!@dds-2zea539d75bbb7f41338-pub.mongodb.rds.aliyuncs.com:3717,dds-2zea539d75bbb7f42971-pub.mongodb.rds.aliyuncs.com:3717/admin?replicaSet=mgset-29216971';
    }
    get dbName() {

        return 'questionaire';
    }
    get conferenceApiBaseUrl() {

        return process.env.ENV_ORGANIZATION_BASE_URL || 'http://conference-service';
    }
}

module.exports = new systemConfig();
