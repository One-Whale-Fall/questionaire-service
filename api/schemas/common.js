'use strict';

const Joi = require('@hapi/joi');

const commonHeaders = Joi.object({
    'acting-organization': Joi.string().optional().description('Calling user organization ID.'),
    'acting-user': Joi.string().optional().description('Calling user name.'),
    'acting-user-roles': Joi.string().optional().description('Calling user roles')
}).unknown(true);

module.exports = {
    commonHeaders
};
