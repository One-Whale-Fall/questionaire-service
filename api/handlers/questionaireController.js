'use strict'

const Path = require('path');
const Wreck = require('@hapi/wreck');
const Hoek = require('@hapi/hoek');
const Boom = require('@hapi/boom');
const Config = require('../../config.js');
const constants = require('../constants.js');
const Utils = require('../handlers/utils.js');
const QRCode = require('qrcode')
const { omit } = require('lodash')

const updateQuestionaireStats = function (questionaire, submission) {

    submission.questionItems.forEach(questionItem => {
        const selected = questionItem.options.find(x=>x.selected);
        const matchedItem = questionaire.questionItems.find(x=>x.id === questionItem.id);
        if (matchedItem) {
            matchedItem.options.forEach(x => {
                if (x.order === selected.order) {
                    if (x.num)
                        x.num++;
                    else
                        x.num = 1;
                }
            });
        }
    });
};

const onSubmitQuestionaire = async function (request, h) {
    const userId = request.headers['acting-user'];
    const getUserRegistrationUrl = Config.conferenceApiBaseUrl + `/conferences/${request.params.conferenceId}/registrations/${userId}`;
    const { payload } = await Wreck.get(getUserRegistrationUrl, {
        json: true,
        headers: {
            'acting-organization': request.headers['acting-organization'],
            'acting-user': request.headers['acting-user'],
            'acting-user-roles': request.headers['acting-user-roles'],
        }
    });
    if (payload) {
        const mongoDbClient = await request.server.methods.getDbClient();
        const db = mongoDbClient.db(Config.dbName);
        const userSubmissionCollection = db.collection(constants.USER_QUESTIONAIRE_COLLECTION);
        const existingSubmission = await userSubmissionCollection.findOne({
            conferenceId: request.params.conferenceId,
            userId: userId
        });
        if (existingSubmission) {
            return h.response('Questionaire already submitted!').code(409);
        }
        const questionaire = await getQuestionaireByConferenceId(db, request.params.conferenceId);
        if (questionaire) {
            updateQuestionaireStats(questionaire, request.payload);
            const collection = db.collection(constants.QUESTIONAIRE_COLLECTION);
            await collection.replaceOne({
                _id: questionaire._id
            }, questionaire);

            await userSubmissionCollection.insertOne({
                conferenceId: request.params.conferenceId,
                userId: userId,
                questionItems: request.payload.questionItems
            })
        } else {
            return h.response('Questionaire is not found!').code(404);
        }
        return h.response('Questionaire submitted.').code(201);
    } else {
        return h.response('User registration not found!').code(404);
    }
};

const getQuestionaireByConferenceId = async function(db, conferenceId) {

    const collection = db.collection(constants.QUESTIONAIRE_COLLECTION);
    const questionaire = await collection.findOne({
        conferenceId
    });

    return questionaire;
};

const onGetQuestionaire = async function (request, h) {

    const mongoDbClient = await request.server.methods.getDbClient();
    const db = mongoDbClient.db(Config.dbName);
    const questionaire = await getQuestionaireByConferenceId(db, request.params.conferenceId);
    if (questionaire) {
        delete questionaire._id;
        return h.response(questionaire).code(200);
    }

    return h.response('Questionaire not found!').code(404);
};

const generateQRCode = async function (conferenceId) {
  const url = `${Config.clientBaseUrl}/public/questionaires/${conferenceId}`;
  return QRCode.toDataURL(url)
}

const onGenerateQuestionaire = async function (request, h) {

    const mongoDbClient = await request.server.methods.getDbClient();
    const db = mongoDbClient.db(Config.dbName);
    const collection = db.collection(constants.QUESTIONAIRE_COLLECTION);
    const existingQuestionaire = await collection.findOne({
        conferenceId: request.params.id
    });
    // if (existingQuestionaire)
    //     return h.response('The questionaire has been created!').code(400);
    
    const getConferenceUrl = Config.conferenceApiBaseUrl + `/conferences/${request.params.id}`;
    const { payload } = await Wreck.get(getConferenceUrl, {
        json: true,
        headers: {
            'acting-organization': request.headers['acting-organization'],
            'acting-user': request.headers['acting-user'],
            'acting-user-roles': request.headers['acting-user-roles'],
        }
    });
    if (payload) {
        const questionaire = await Utils.GetQuestionaire(request.params.id);
        await collection.insertOne({
            conferenceId: request.params.id,
            ...questionaire
        });
        const qrCode = await generateQRCode(request.params.id);
        payload.questionaireQRCode = qrCode;
        payload.isQuestionaireGenerated = true;
        payload.organizationId = payload.organization.id;
        const omitProperties = ['_id', 'headOrganizationId', 'organization', 'numOfRegistrations'];
        const conference = omit(payload, omitProperties);
        const updateConferenceUrl = Config.conferenceApiBaseUrl + `/conferences/${request.params.id}`;
        await Wreck.put(updateConferenceUrl, {
            headers: {
                'acting-organization': request.headers['acting-organization'],
                'acting-user': request.headers['acting-user'],
                'acting-user-roles': request.headers['acting-user-roles'],
            },
            payload: conference
        });
        return h.response('Questionaire created!').code(201);
    } else {
        return h.response('Conference not found!').code(404);
    }
};


const submitQuestionaire = async function (request, h) {

    try {
        return await onSubmitQuestionaire(request, h);
    } catch (error) {
        if (error.output.payload.statusCode === 404) {
          return h.response('User registration not found!').code(404);
        }
        request.log('error', error);
        throw Boom.internal();
    }
};

const getQuestionaire = async function (request, h) {

    try {
        return await onGetQuestionaire(request, h);
    } catch (error) {
        request.log('error', error);
        throw Boom.internal();
    }
};

const generateQuestionaire = async function (request, h) {

    try {
        return await onGenerateQuestionaire(request, h);
    } catch (error) {
        console.log('>>>>', error)
        // request.log('error', error);
        throw Boom.internal();
    }
};

const onGetQuestionairesSummary = async function (request, h) {

    const mongoDbClient = await request.server.methods.getDbClient();
    const db = mongoDbClient.db(Config.dbName);
    const collection = db.collection(constants.QUESTIONAIRE_COLLECTION);
    const questionaires = await collection.find().toArray();
    const result = [];
    for (const questionaire of questionaires) {
        const scores = Utils.getQuestionaireResultSummary(questionaire);
        const summary = {
            conferenceId: questionaire.conferenceId,
            ...scores
        };
        result.push(summary);
    }
    return h.response(result).code(200);
};

const getQuestionairesSummary = async function (request, h) {

    try {
        return await onGetQuestionairesSummary(request, h)
    } catch(error) {
        request.log('error', error);
        throw Boom.internal();
    }
};

module.exports = {
    getQuestionaire,
    submitQuestionaire,
    generateQuestionaire,
    getQuestionairesSummary
};
