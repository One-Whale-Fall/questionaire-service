'use strict';

const util = require('util');
const Path = require('path');
const FS = require('fs');
const Hoek = require('@hapi/hoek');

const sendValidationFailResponse = function (request, h, error) {

    const response = h.response({ error: error.message }).code(400);
    return response.takeover();
};

const validate = async function (request, validators) {
    const validationQueue = validators.map(validator => validator(request))
    const errors = await Promise.all(validationQueue)
    return errors.filter(error => error !== true)
}

const convertFieldsToString = function (obj, ...fields) {
    for (const field of fields) {
        obj[field] = obj[field].toString()
    }
    return obj
}

var _questionaire;

const GetQuestionaire = async function (conferenceId) {

    if (!_questionaire) {
        const readFileAsync = util.promisify(FS.readFile);
        const configFileContent = await readFileAsync(Path.join(__dirname, '../../kvmnt/questionaireTemplate.json'), 'utf-8');
        _questionaire = JSON.parse(configFileContent);
        const commonOptions = require("../../kvmnt/commonOptions.json");
        _questionaire.questionItems.forEach(item => {
            item.options = Hoek.clone(commonOptions);
        });
    }
    return _questionaire;
};

const getQuestionaireResultSummary = function (questionaire) {

    var totalScore = 0;
    var academicScore = 0;
    var achievementScore = 0;
    var organizationScore = 0;
    for (const questionItem of questionaire.questionItems) {
        const weight = questionItem.weight;
        if (!weight) {
            continue;
        }
        var totalVotes = 0;
        var itemTotal = 0;
        for (const option of questionItem.options) {
            totalVotes += option.num || 0;
            itemTotal += (option.num || 0) * 25 * (option.order - 1);
        }
        if (totalVotes > 0) {
            totalScore += weight * itemTotal / totalVotes;
            if (questionItem.order <=8) {
                academicScore += weight * itemTotal / totalVotes;
            } else if (questionItem.order >= 10 && questionItem.order <= 13) {
                achievementScore += weight * itemTotal / totalVotes;
            } else if (questionItem.order >= 14 && questionItem.order <= 19) {
                organizationScore += weight * itemTotal / totalVotes;
            }
        }
    }

    return {
        totalScore,
        academicScore,
        achievementScore,
        organizationScore
    };
};

module.exports = {
    validate,
    sendValidationFailResponse,
    convertFieldsToString,
    GetQuestionaire,
    getQuestionaireResultSummary
};
