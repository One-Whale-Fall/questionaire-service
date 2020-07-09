'use strict';

const Joi = require('@hapi/joi');
const Pack = require('../../package.json');

const { sendValidationFailResponse } = require('../handlers/utils.js');
const questionaireSchema = require('../schemas/questionaireSchema.js');
const { commonHeaders } = require('../schemas/common.js');
const {
    getQuestionaire, submitQuestionaire, generateQuestionaire, getQuestionaireResult, getQuestionairesSummary
} = require('../handlers/questionaireController.js');

const v1 = {
    name: 'v1',
    version: Pack.version,
    register: function (server, options) {

        server.route({
            method: 'POST',
            path: '/internal/questionaires/{conferenceId}',
            options: {
                description: 'To generate questionaire for conference. By design only used by internal process/job.Not to be exposed through API gateway.',
                tags: ['api'],
                validate: {
                    params: Joi.object({
                        conferenceId: Joi.string().required()
                    }),
                    failAction: sendValidationFailResponse
                },
                response: questionaireSchema.generateQuestionaireResponse,
                handler: generateQuestionaire
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

        server.route({
            method: 'GET',
            path: '/questionaires/{conferenceId}/result',
            options: {
                description: 'Get total and detailed scores for given conference id',
                tags: ['api'],
                validate: {
                    headers: commonHeaders,
                    params: Joi.object({
                        conferenceId: Joi.string().required()
                    }),
                    failAction: sendValidationFailResponse
                },
                response: questionaireSchema.questionaireResultResponse,
                handler: getQuestionaireResult
            }
        });

        server.route({
            method: 'GET',
            path: '/questionaires/summary',
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
    }
};

module.exports = v1;
