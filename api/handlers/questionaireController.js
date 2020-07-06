'use strict'

const Path = require('path');
const Wreck = require('@hapi/wreck');
const Hoek = require('@hapi/hoek');
const Boom = require('@hapi/boom');
const Config = require('../../config.js');
const constants = require('../constants.js');
const Utils = require('../handlers/utils.js');

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
                userId: userId
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

const onGenerateQuestionaire = async function (request, h) {

    const mongoDbClient = await request.server.methods.getDbClient();
    const db = mongoDbClient.db(Config.dbName);
    const collection = db.collection(constants.QUESTIONAIRE_COLLECTION);
    const existingQuestionaire = await collection.findOne({
        conferenceId: request.params.conferenceId
    });
    if (existingQuestionaire)
        return h.response('The questionaire has been created!').code(400);
    const questionaire = await Utils.GetQuestionaire(request.params.conferenceId);
    await collection.insertOne({
        conferenceId: request.params.conferenceId,
        ...questionaire
    });
    return h.response('Questionaire created!').code(201);
};

const onGetQuestionaireResult = async function (request, h) {

    const mongoDbClient = await request.server.methods.getDbClient();
    const db = mongoDbClient.db(Config.dbName);
    const collection = db.collection(constants.QUESTIONAIRE_COLLECTION);
    const existingQuestionaire = await collection.findOne({
        conferenceId: request.params.conferenceId
    });
    if (existingQuestionaire) {
        const { questionItems } = existingQuestionaire;
        const questionaireResult = questionItems.reduce((acc, item) => {
            const { options, weight, order } = item;
            const excludeOrders = [9, 20, 21];
            let result;
            let weightedResult;
            if (excludeOrders.includes(order)) {
                weightedResult = null;
                result = null;
            } else {
                const itemTotal = options.reduce((acc, option) => {
                    const { num } = option;
                    acc.userCount += num || 0;
                    let value;
                    switch (option.name) {
                      case '完全不同意': 
                        value = 0;
                        break;
                      case '比较不同意':
                        value = 25;
                        break;
                      case '一般同意':
                        value = 50;
                        break;
                      case '比较同意':
                        value = 75;
                        break;
                      case '完全同意':
                        value = 100;
                        break;
                    }
                    acc.score += value * num || 0;
                    return acc;
                }, { userCount: 0, score: 0 });
                result = Math.round(itemTotal.score / itemTotal.userCount * 100) / 100;
                weightedResult = Math.round(result * weight * 100) / 100;
            }
            acc.push({
                id: item.id,
                order,
                name: item.name,
                options,
                weight,
                result,
                weightedResult
            });
            return acc;
        }, []);
        existingQuestionaire.questionItems = questionaireResult
        delete existingQuestionaire._id;
        return existingQuestionaire
    };
    return h.response('Questionaire not found!').code(404);
};

const submitQuestionaire = async function (request, h) {

    try {
        return await onSubmitQuestionaire(request, h);
    } catch (error) {
        if (error.output.payload.statusCode === 404) {
          return h.response('User registration not found!').code(404);
        } else {
          const userId = request.headers['acting-user'];
          return h.response(userId).code(400)
        }
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

const generateQuestionaire = async function (request, h) {

    try {
        return await onGenerateQuestionaire(request, h);
    } catch (error) {
        throw Boom.internal();
    }
};

const getQuestionaireResult = async function (request, h) {

    try {
        return await onGetQuestionaireResult(request, h)
    } catch(error) {
        throw Boom.internal();
    }
}

module.exports = {
    getQuestionaire,
    submitQuestionaire,
    generateQuestionaire,
    getQuestionaireResult
};
