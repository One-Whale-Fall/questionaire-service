'use strict';

const Joi = require('@hapi/joi');
const Pack = require('../../package.json');

const { sendValidationFailResponse } = require('../handlers/utils.js');
const questionaireSchema = require('../schemas/questionaireSchema.js');
const { commonHeaders } = require('../schemas/common.js');
const {
    getQuestionaire, submitQuestionaire, generateQuestionaire, getQuestionairesSummary
} = require('../handlers/questionaireController.js');

const v1 = {
    name: 'v1',
    version: Pack.version,
    register: function (server, options) {

        server.route({
            method: 'POST',
            path: '/questionaires/conference/{id}',
            options: {
                description: 'To generate questionaire for conference. By design only used by internal process/job.Not to be exposed through API gateway.',
                tags: ['api'],
                validate: {
                    params: Joi.object({
                        id: Joi.string().required()
                    }),
                    failAction: sendValidationFailResponse
                },
                response: questionaireSchema.generateQuestionaireResponse,
                handler: generateQuestionaire
            }
        });

        server.route({
            method: 'GET',
            path: '/questionaires/conferences/score',
            options: {
                description: 'Get questionaires scores of all conferences',
                tags: ['api'],
                validate: {
                    headers: commonHeaders,
                    failAction: sendValidationFailResponse
                },
                response: questionaireSchema.questionairesSummaryResponse,
                handler: getQuestionairesSummary
            }
        });

        server.route({
            method: 'GET',
            path: '/questionaires/{conferenceId}',
            options: {
                description: 'Retrieve questionaire for conference.',
                tags: ['api'],
                validate: {
                    headers: commonHeaders,
                    params: Joi.object({
                        conferenceId: Joi.string().required()
                    }),
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
                    params: Joi.object({
                        conferenceId: Joi.string().required()
                    }),
                    failAction: sendValidationFailResponse
                },
                response: questionaireSchema.submitQuestionaireReponse,
                handler: submitQuestionaire
            }
        });
    }
};

module.exports = v1;
