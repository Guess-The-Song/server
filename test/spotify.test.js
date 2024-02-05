// test/server.test.js
const expect = require('chai').expect;
//const sinon = require('sinon');
const ioClient = require('socket.io-client');

const server = require('../src/index.js');
const config = require('./config.json');


describe('Spotify Integration Tests', function() {
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

    // test spotify integration

    // test for authorizationCode

    describe('authorizationCode Tests', () => {

        describe('Basic Tests', () => {
            
            it('Should return an error if provided with no data', (done) => {
                socket.emit('authorizationCode', {}, (result) => {
                    expect(result.error).to.equal('state_mismatch');
                    done();
                });
            });

            it('Should return an error if provided with mismatching states', (done) => {
                socket.emit('authorizationCode', {
                    code: 'test',
                    state: 'wrong_state',
                    storedState: 'right_state'
                }, (result) => {
                    expect(result.error).to.equal('state_mismatch');
                    done();
                });
            });

            it('Should return an error if user is already logged in', (done) => {
                socket.emit('setData', {
                    userId: 'test'
                }, (result) => {
                    expect(result.success).to.equal(true);
                    socket.emit('authorizationCode', {
                        code: 'test',
                        state: 'right_state',
                        storedState: 'right_state'
                    }, (result) => {
                        expect(result.error).to.equal('already_logged_in');
                        done();
                    });
                });
            });
        });

        // more local tests for authorizationCode are at the moment not possible because of the way the spotify api works
        // the following tests only work on the server
        
        describe('Spotify API Tests. These tests only work on a server with set up spotify app credentials', () => {

            before(function() {
                // skip tests if no spotify credentials are provided
                const spotify = require('../config/spotify.json');
                if (spotify.id === 'YourClientID') {
                    this.skip();
                }
            });

            it('Should return an error if code is wrong', (done) => {
                socket.emit('authorizationCode', {
                    code: 'wrong_code',
                    state: 'right_state',
                    storedState: 'right_state'
                }, (result) => {
                    expect(result.error).to.equal('server_error');
                    done();
                });
            });


            it('Should not return an error if code is right', function() {
                // no way to get a right code without user interaction
                // so this test is not possible

                // skip test
                this.skip();
            });


        });
 
    });

});
