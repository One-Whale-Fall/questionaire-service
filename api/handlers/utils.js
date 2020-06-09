'use strict';

const util = require('util');
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
        const _questionaire = JSON.parse(configFileContent);
        const commonOptions = require("../../kvmnt/commonOptions.json");
        _questionaire.questionItems.forEach(item => {
            item.options = Hoek.clone(commonOptions);
        });
    }
    return _questionaire;
};

module.exports = {
    validate,
    sendValidationFailResponse,
    convertFieldsToString,
    GetQuestionaire
};
