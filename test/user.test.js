// test/user.test.js
const expect = require('chai').expect;
//const sinon = require('sinon' });
const ioClient = require('socket.io-client');

const server = require('../src/index.js');
const config = require('./config.json');


describe('User Provider Integration Tests', function() {
    let socket;
    let socket2;

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

    // test user provider integration

    // test register
    describe('register Tests', () => {

        it('Should return an error if no provider is given', (done) => {
            socket.emit('register', { username: 'test' }, (result) => {
                expect(result).to.deep.equal({ error: 'no_service_to_link_to' });
                expect(result).to.deep.equal({ error: 'no_service_to_link_to' });
                done();
            });
        });
        
        it('Should return an error if provided with no data', (done) => {
            socket.emit('setData', { spotifyId: 'test'}, (result) => {
                expect(result.success).to.be.true;
                socket.emit('register', {}, (result) => {
                    expect(result).to.deep.equal({ error: 'no_username_given' });
                    done();
                });
            });
        });

        it('Should return an error if provided with empty username', (done) => {
            socket.emit('setData', { spotifyId: 'test'}, (result) => {
                expect(result.success).to.be.true;
                socket.emit('register', { username: '' }, (result) => {
                    expect(result).to.deep.equal({ error: 'no_username_given' });
                    done();
                });
            });
        });

        it('Should return an error if provided with a too short username', (done) => {
            socket.emit('setData', { spotifyId: 'test'}, (result) => {
                expect(result.success).to.be.true;
                socket.emit('register', { username: 'te' }, (result) => {
                    expect(result).to.deep.equal({ error: 'username_too_short' });
                    done();
                });
            });
        });

        it('Should return an error if provided with a too long username', (done) => {
            socket.emit('setData', { spotifyId: 'test'}, (result) => {
                expect(result.success).to.be.true;
                socket.emit('register', { username: 'te'.repeat(11) }, (result) => {
                    expect(result).to.deep.equal({ error: 'username_too_long' });
                    done();
                });
            });
        });

        it('Should return success if provided with a valid username', (done) => {
            register('test',socket).then(() => {
                // purge test user
                socket.emit('setData', {spotifyId: ''}, (result) => {
                    expect(result.success).to.be.true;
                    socket.emit('removeAccount', (result) => {
                        expect(result.success).to.be.true;
                        done();
                    });
                });
            }).catch((err) => {
                console.error(err);
                done();
            });
        });

        it('Should return an error if username already exists', (done) => {
            socket.emit('setData', {spotifyId: 'test'}, (result) => {
                expect(result.success).to.be.true;
                socket.emit('register', { username: 'usedTest' }, () => {
                    socket.emit('setData', {spotifyId: 'test', userId: ''}, (result) => {
                        expect(result.success).to.be.true;
                        socket.emit('register', { username: 'usedTest' }, (result) => {
                            expect(result).to.deep.equal({ error: 'username_already_exists' });
                            done();
                        });
                    });
                });
            });


        });

        it('Should return an error if already logged in', (done) => {
            socket.emit('setData', { userId: 'test' }, (result) => {
                expect(result.success).to.be.true;
                socket.emit('register', {}, (result) => {
                    expect(result).to.deep.equal({ error: 'already_logged_in' });
                    done();
                });
            });
        });
    });

    describe('removeAccount Tests', () => {

        it('Should return an error if not logged in', (done) => {
            socket.emit('removeAccount', (result) => {
                expect(result).to.deep.equal({ error: 'not_logged_in' });
                done();
            });
        });

        it('Should return success if logged in', (done) => {
            register('test', socket).then(() => {
                socket.emit('setData', {spotifyId: ''}, (result) => {
                    expect(result.success).to.be.true;
                    socket.emit('removeAccount', (result) => {
                        expect(result.success).to.be.true;
                        done();
                    });
                });
            }).catch((err) => {
                console.error(err);
                done();
            });
        });

    });


    describe('change user-Data Tests', () => {

        before((done) => {
            socket2 = ioClient.connect(`${config.server.connection}://${config.server.host}:${config.server.port}`);
            socket2.on('connect', () => {
                done();
            });  
        });

        after(() => {
            socket2.disconnect();
        });

        beforeEach((done) => {
            // Prepear a Socket.io client before running any tests
            register('test', socket).then(() => {
                done();
            }).catch((err) => {
                console.error(err);
                done();
            });
        });

        afterEach((done) => {
            socket.emit('setData', {spotifyId: ''}, (result) => {
                expect(result.success).to.be.true;
                socket.emit('removeAccount', (result) => {
                    expect(result.success).to.be.true;
                    done();
                });
            });
        });


        describe('changeUsername Tests', () => {

            it('Should return an error if not logged in', (done) => {
                socket2.emit('changeUsername', { username: 'testNew' }, (result) => {
                    expect(result).to.deep.equal({ error: 'not_logged_in' });
                    done();
                });
            });

            it('Should return an error if no username is given', (done) => {
                socket.emit('changeUsername', {}, (result) => {
                    expect(result).to.deep.equal({ error: 'no_username_given' });
                    done();
                });
            });

            it('Should return an error if username is empty', (done) => {
                socket.emit('changeUsername', { username: '' }, (result) => {
                    expect(result).to.deep.equal({ error: 'no_username_given' });
                    done();
                });
            });

            it('Should return an error if username is too short', (done) => {
                socket.emit('changeUsername', { username: 'te' }, (result) => {
                    expect(result).to.deep.equal({ error: 'username_too_short' });
                    done();
                });
            });

            it('Should return an error if username is too long', (done) => {
                socket.emit('changeUsername', { username: 'te'.repeat(11) }, (result) => {
                    expect(result).to.deep.equal({ error: 'username_too_long' });
                    done();
                });
            });

            it('Should return success if username is valid', (done) => {
                socket.emit('changeUsername', { username: 'testNew' }, (result) => {
                    expect(result.success).to.be.true;
                    done();
                });
            });

            it('Should return an error if username already exists', (done) => {
                socket.emit('changeUsername', { username: 'test' }, (result) => {
                    expect(result).to.deep.equal({ error: 'username_already_exists' });
                    done();
                });
            });

        });


        describe('changeNickname Tests', () => {

            it('Should return an error if not logged in', (done) => {
                socket2.emit('changeNickname', { nickname: 'testNew' }, (result) => {
                    expect(result).to.deep.equal({ error: 'not_logged_in' });
                    done();
                });
            });

            it('Should return success if no nickname is given (= deleting nickname)', (done) => {
                socket.emit('changeNickname', {}, (result) => {
                    expect(result.success).to.be.true;
                    done();
                });
            });

            it('Should return an success if nickname is empty', (done) => {
                socket.emit('changeNickname', { nickname: '' }, (result) => {
                    expect(result.success).to.be.true;
                    done();
                });
            });

            it('Should return an error if nickname is too short', (done) => {
                socket.emit('changeNickname', { nickname: 'te' }, (result) => {
                    expect(result).to.deep.equal({ error: 'nickname_too_short' });
                    done();
                });
            });

            it('Should return an error if nickname is too long', (done) => {
                socket.emit('changeNickname', { nickname: 'te'.repeat(11) }, (result) => {
                    expect(result).to.deep.equal({ error: 'nickname_too_long' });
                    done();
                });
            });

            it('Should return success if nickname is valid', (done) => {
                socket.emit('changeNickname', { nickname: 'testNew' }, (result) => {
                    expect(result.success).to.be.true;
                    done();
                });
            });

        });


    });


});


function register(username, socket) {
    return new Promise((resolve) => {
        socket.emit('setData', { spotifyId: 'test'}, (result) => {
            expect(result.success).to.be.true;
            socket.emit('register', { username: username}, (result) => {
                expect(result.success).to.be.true;
                resolve();
            });                    
        });
    });
}