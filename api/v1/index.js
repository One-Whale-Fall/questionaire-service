'use strict';

const Joi = require('@hapi/joi');
const Pack = require('../../package.json');

const { sendValidationFailResponse } = require('../handlers/utils.js');
const questionaireSchema = require('../schemas/questionaireSchema.js');
const { commonHeaders } = require('../schemas/common.js');
const { getQuestionaire, submitQuestionaire } = require('../handlers/questionaireController.js');

const v1 = {
    name: 'v1',
    version: Pack.version,
    register: function (server, options) {

        server.route({
            method: 'GET',
            path: '/questionaires/{conferenceId}',
            options: {
                description: 'Retrieve questionaire for conference.',
                tags: ['api'],
                validate: {
                    headers: commonHeaders,
                    failAction: sendValidationFailResponse
                },
                response: questionaireSchema.getQuestionaireResponse,
                handler: getQuestionaire
            }
        });

        server.route({
            method: 'POST',
            path: '/questionaires/{conferenceId}',
            options: {
                description: 'Submit questionaire',
                tags: ['api'],
                validate: {
                    payload: questionaireSchema.submitQuestionaireRequest,
                    headers: commonHeaders,
                    failAction: sendValidationFailResponse
                },
                response: questionaireSchema.submitQuestionaireReponse,
                handler: submitQuestionaire
            }
        });

    }
};

module.exports = v1;
