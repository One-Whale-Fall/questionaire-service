'use strict'

const Wreck = require('@hapi/wreck');
const Boom = require('@hapi/boom');
const Config = require('../../config.js');
const constants = require('../constants.js');
const Utils = require('../handlers/utils.js');

const onSubmitQuestionaire = async function (request, h) {

    const userId = request.headers['acting-user'];
    const getUserRegistrationUrl = new URL(Config.conferenceApiBaseUrl, `/conferences/${request.params.conferenceId}/registrations${userId}`);
    const { payload } = await Wreck.get(getUserRegistrationUrl.href, {
        json: true,
        headers: {
            'acting-organization': request.headers['acting-organization'],
            'acting-user': request.headers['acting-user'],
            'acting-user-roles': request.headers['acting-user-roles'],
        }
    });
    if (payload) {
        //TODO check whether the user has submitted questionaire

        const mongoDbClient = await request.server.methods.getDbClient();
        const db = mongoDbClient.db(Config.dbName);
        const collection = db.collection(constants.QUESTIONAIRE_COLLECTION);
        await collection.insertOne({
            conferenceId: request.params.conferenceId,
            userId: userId,
            ...request.payload
        });
    }
};

const onGetQuestionaire = async function (request, h) {

    const questionaire = await Utils.GetQuestionaire(request.params.conferenceId);
    if (questionaire) {
        return h.response(questionaire).code(200);
    }

    return h.response('Questionaire not found!').code(404);
};

const submitQuestionaire = async function (request, h) {

    try {
        return await onSubmitQuestionaire(request, h);
    } catch (error) {
        throw Boom.internal();
    }
};

const getQuestionaire = async function (request, h) {

    try {
        return await onGetQuestionaire(request, h);
    } catch (error) {
        throw Boom.internal();
    }
};

module.exports = {
    getQuestionaire,
    submitQuestionaire,
};
