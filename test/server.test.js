// test/server.test.js
const expect = require('chai').expect;
//const sinon = require('sinon');
const ioClient = require('socket.io-client');

const server = require('../src/index.js');
const config = require('./config.json');

describe('Socket.io Server Tests', function() {
    let socket;

    before(function(done) {
        this.timeout(10000);
        if (config.beQuiet) server.beQuiet();
        server.setToTesting();
        server.start().then(() => {
            done();
        });
    });

    beforeEach((done) => {
        // Prepear a Socket.io client before running any tests
        socket = ioClient.connect(`${config.server.connection}://${config.server.host}:${config.server.port}`);
        socket.on('connect', () => {
            done();
        });
    });

    afterEach(() => {
        // Disconnect the Socket.io client after each test
        socket.disconnect();
    });

    after((done) => {
        // Stop the Socket.io server after all tests have run
        server.exitServer().then(() => {
            done();
        });
    });

    it('Should be able to connect', () => {
        // Check if the Socket.io client is connected
        expect(socket.connected).to.be.true;
    });

    it('Should be able to disconnect', () => {
        // Check if the Socket.io client is disconnected
        socket.disconnect();
        expect(socket.connected).to.be.false;
    });

    
});
