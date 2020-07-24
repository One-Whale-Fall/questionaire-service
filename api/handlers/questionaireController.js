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
const Util = require('util');
const CsvGenerate = Util.promisify(require('csv-stringify'));

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
    if (existingQuestionaire)
        return h.response('The questionaire has been created!').code(400);
    
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
        request.log('error', error);
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

const onGetQuestionaireSummaryByConferenceId = async function (request, h) {
  
    const mongoDbClient = await request.server.methods.getDbClient();
    const db = mongoDbClient.db(Config.dbName);
    const collection = db.collection(constants.QUESTIONAIRE_COLLECTION);
    const existingQuestionaire = await collection.findOne({
        conferenceId: request.params.conferenceId
    });
    if (existingQuestionaire) {
        const { questionItems } = existingQuestionaire;
        const primaryScore = {
            academic: {
              questions: [],
              fullScore: 0,
              score: 0
            },
            achivement: {
              questions: [],
              fullScore: 0,
              score: 0
            },
            organization: {
              questions: [],
              fullScore: 0,
              score: 0
            }
        }
        const secondaryScore = {
            topic: {
              questions: [],
              fullScore: 0,
              score: 0
            },
            reporter: {
              questions: [],
              fullScore: 0,
              score: 0
            },
            interaction: {
              questions: [],
              fullScore: 0,
              score: 0
            },
            thesis: {
              questions: [],
              fullScore: 0,
              score: 0
            },
            other: {
              questions: [],
              fullScore: 0,
              score: 0
            },
            preConference: {
              questions: [],
              fullScore: 0,
              score: 0
            },
            duringConference: {
              questions: [],
              fullScore: 0,
              score: 0
            }
        }
        const tertiaryScore = []
        for (const questionItem of questionItems) {
            const { options, weight, order } = questionItem;
            const fullScore = weight ? Math.round(weight * 100 * 10) / 10 : 0;
            let weightedResult = 0;
            if (weight) {
                const { totalVotes, itemTotal } = options.reduce((acc, option) => {
                    const { num } = option;
                    acc.totalVotes += num || 0;
                    acc.itemTotal += (option.num || 0) * 25 * (option.order - 1);
                    return acc;
                }, { totalVotes: 0, itemTotal: 0 });
                weightedResult = Math.round(itemTotal / totalVotes * weight * 100) / 100;
            }
            if (questionItem.order < 10) {
                primaryScore.academic.questions.push(questionItem.order);
                primaryScore.academic.score += weightedResult;
                primaryScore.academic.fullScore += fullScore;
                if (questionItem.order < 4) {
                    secondaryScore.topic.questions.push(questionItem.order);
                    secondaryScore.topic.score += weightedResult;
                    secondaryScore.topic.fullScore += fullScore;
                } else if (questionItem.order < 6) {
                    secondaryScore.reporter.questions.push(questionItem.order);
                    secondaryScore.reporter.score += weightedResult;
                    secondaryScore.reporter.fullScore += fullScore;
                } else {
                    secondaryScore.interaction.questions.push(questionItem.order);
                    secondaryScore.interaction.score += weightedResult;
                    secondaryScore.interaction.fullScore += fullScore;
                }
            } else if (questionItem.order < 14) {
                primaryScore.achivement.questions.push(questionItem.order);
                primaryScore.achivement.score += weightedResult;
                primaryScore.achivement.fullScore += fullScore;
                if (questionItem.order < 12) {
                    secondaryScore.thesis.questions.push(questionItem.order);
                    secondaryScore.thesis.score += weightedResult;
                    secondaryScore.thesis.fullScore += fullScore;
                } else {
                    secondaryScore.other.questions.push(questionItem.order);
                    secondaryScore.other.score += weightedResult;
                    secondaryScore.other.fullScore += fullScore;
                }
            } else {
                primaryScore.organization.questions.push(questionItem.order);
                primaryScore.organization.score += weightedResult;
                primaryScore.organization.fullScore += fullScore;
                if (questionItem.order < 17) {
                    secondaryScore.preConference.questions.push(questionItem.order);
                    secondaryScore.preConference.score += weightedResult;
                    secondaryScore.preConference.fullScore += fullScore;
                } else {
                    secondaryScore.duringConference.questions.push(questionItem.order);
                    secondaryScore.duringConference.score += weightedResult;
                    secondaryScore.duringConference.fullScore += fullScore;
                }
            }
            tertiaryScore.push({
                id: questionItem.id,
                order,
                name: questionItem.name,
                fullScore,
                score: weightedResult
            });
        }
        return {
            primaryScore,
            secondaryScore,
            tertiaryScore
        }
    } else {
        return h.response('questionaire not found ').code(404);
    }
}

const getQuestionaireSummaryByConferenceId = async function (request, h) {

    try {
        return await onGetQuestionaireSummaryByConferenceId(request, h);
    } catch(error) {
        request.log('error', error);
        throw Boom.internal();
    }
};

const onExportQuestionaireSummaryByConferenceId = async function (request, h) {
    const { primaryScore, secondaryScore, tertiaryScore } = await onGetQuestionaireSummaryByConferenceId(request, h);
    for (const item in secondaryScore) {
      const { questions, score } = secondaryScore[item];
      const filteredTertiaryItems = tertiaryScore.filter(item => questions.includes(item.order));
      secondaryScore[item].tertiaryItems = filteredTertiaryItems;
      secondaryScore[item].name = targetMap[item];
      secondaryScore[item].score = Math.round(score * 100) / 100;
    }
    for (const item in primaryScore) {
      const { questions, score } = primaryScore[item];
      primaryScore[item].secondaryItems = [];
      primaryScore[item].score = Math.round(score * 100) / 100;
      primaryScore[item].name = targetMap[item];
      for (const secondaryItem in secondaryScore) {
        const secondaryQuestions = secondaryScore[secondaryItem].questions;
        const isPrimarySubset = secondaryQuestions.every(questionId => questions.includes(questionId));
        if (isPrimarySubset) {
          primaryScore[item].secondaryItems.push(secondaryScore[secondaryItem]);
        }
      }
    }
    const rows = [];
    rows.push(['一级指标', '二级指标', '三级指标', '满分', '得分']);
    for (const key in primaryScore) {
      let includePrimary = true;
      const primaryName = primaryScore[key].name;
      const { secondaryItems } = primaryScore[key];
      for (const secondaryItem of secondaryItems) {
        let includeSecondary = true;
        const { tertiaryItems } = secondaryItem;
        tertiaryItems.forEach(item => {
          const primaryScoreDisplay = `${primaryName} (${primaryScore[key].score}分/ ${primaryScore[key].fullScore}分)`;
          const secondaryScoreDisplay = `${secondaryItem.name} (${secondaryItem.score}分/ ${secondaryItem.fullScore}分)`;
          const row = [`${item.order}.${item.name}`, item.fullScore, item.score];
          row.unshift(includeSecondary ? secondaryScoreDisplay : '');
          row.unshift(includePrimary ? primaryScoreDisplay : '');
          rows.push(row);
          includeSecondary = false;
          includePrimary = false;
        })
      }
    }
    const csv = await CsvGenerate(rows);
    return h.response(csv).header('content-type', 'text/csv').code(200);
}

const targetMap = {
  academic: '学术吸引力',
  achivement: '学术成果',
  organization: '会务组织',
  topic: '主题/\报告',
  reporter: '报告人',
  interaction: '交流互动',
  thesis: '论文',
  other: '其他',
  preConference: '会前',
  duringConference: '会中'
}


const exportQuestionaireSummaryByConferenceId = async function (request, h) {

    try {
        return await onExportQuestionaireSummaryByConferenceId(request, h);
    } catch(error) {
        request.log('error', error);
        throw Boom.internal()
    }
}

module.exports = {
    getQuestionaire,
    submitQuestionaire,
    generateQuestionaire,
    getQuestionairesSummary,
    getQuestionaireSummaryByConferenceId,
    exportQuestionaireSummaryByConferenceId
};
