'use strict';

const Joi = require('@hapi/joi');
const Hoek = require('@hapi/hoek');

// const questionCategory = Joi.object({
//     name: Joi.string().required().description('指标名称'),
//     parentId: Joi.string().optional().description('上一级指标id')
// });

// const questionItem = Joi.object({
//     name: Joi.string().required().description('指标名称'),
//     categoryId: Joi.string().required().description('指标id'),
//     weight: Joi.number().required().description('权重')
// });

// const questionaireTemplateSchema = Joi.object({
//     name: Joi.string().required().description('问卷名称'),
//     questionItems: Joi.object({
//         id: Joi.string().required().description('ID of question item.'),
//         order: Joi.number().integer().required(),
//         ...questionItem
//     })
// });

////////////////////////////////////////////////////////////////////////////////

const questionAnswerOptionItem = Joi.object({
    order: Joi.number().integer().required(),
    name: Joi.string().required().description('选项名称'),
    selected: Joi.boolean().optional().default(false).description('问卷名称'),
}).unknown(true);

const questionaireItemSchema = Joi.object({
    id: Joi.string().required(),
    order: Joi.number().integer().required(),
    name: Joi.string().required().description('问题'),
    options: Joi.array().items(questionAnswerOptionItem).description('问题选项')
}).unknown(true);

const questionaireUserView = Joi.object({
    name: Joi.string().required().description('问卷名称'),
    questionItems: Joi.array().items(questionaireItemSchema)
}).unknown(true);

const submitQuestionaireRequest = Joi.object({
    name: Joi.string().required().description('问卷名称'),
    questionItems: Joi.array().items(questionaireItemSchema)
});

const getQuestionaireResponse = {
    status: {
        200: questionaireUserView,
        400: Joi.any()
    }
};

const submitQuestionaireReponse = {

    status: {
        201: Joi.any(),
        404: Joi.any(),
        409: Joi.any()
    }
};

const generateQuestionaireResponse = {

    status: {
        201: Joi.any(),
        400: Joi.any()
    }
};

module.exports = {

    submitQuestionaireRequest,
    getQuestionaireResponse,
    submitQuestionaireReponse,
    generateQuestionaireResponse
};
