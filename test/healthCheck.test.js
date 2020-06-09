'use strict';

const Path = require('path');
const Pack = require(Path.join(__dirname, '..', 'package'));
const Lab = require('@hapi/lab');
const Code = require('@hapi/code');
const expect = Code.expect;

const { describe, it } = exports.lab = Lab.script();

describe('Health check endpoint', () => {

    it('should return "ok" and 200 when being called', async () => {

        const serverEntry = require('../api/index.js');
        const server = await serverEntry.initialize(true);
        const res = await server.inject({
            method: 'get',
            url: '/health'
        });
        expect(res.statusCode).to.be.equal(200);
        server.stop();
    });

});
