const expect = require('chai').expect;
//const sinon = require('sinon');
const ioClient = require('socket.io-client');

const server = require('../src/index.js');
const config = require('./config.json');

describe('Lobby Logic Tests', function() {
    let socket;
    let socket2;
    let socket3;
    let socket4;

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

    describe('Lobby Creation', () => {
        it('Should throw an error if user is not logged in', (done) => {
            socket.emit('createLobby', (data) => {
                expect(data.error).to.equal('not_logged_in');
                done();
            });
        });

        it('Should create a lobby', (done) => {
            socket.emit('setData', {username: 'test', userId: 'test'}, () => {
                socket.emit('createLobby', (data) => {
                    expect(data.success).to.be.true;
                    expect(data.lobby_id).to.be.a('string');
                    done();
                });
            });
        });
    });

    describe('Lobby Fussing', () => {

        beforeEach((done) => {
            socket2 = ioClient.connect(`${config.server.connection}://${config.server.host}:${config.server.port}`);
            socket3 = ioClient.connect(`${config.server.connection}://${config.server.host}:${config.server.port}`);
            socket4 = ioClient.connect(`${config.server.connection}://${config.server.host}:${config.server.port}`);
            let promises = [];
            promises.push(new Promise((resolve) => {
                socket2.on('connect', () => {
                    resolve();
                });
            }));
            promises.push(new Promise((resolve) => {
                socket3.on('connect', () => {
                    resolve();
                });
            }
            ));
            promises.push(new Promise((resolve) => {
                socket4.on('connect', () => {
                    resolve();
                });
            }
            ));
            Promise.all(promises).then(() => {
                done();
            });
        });

        afterEach(() => {
            socket2.disconnect();
            socket3.disconnect();
            socket4.disconnect();
        });

        describe('Lobby Joining', () => {

            it('Should throw an error if user is not logged in', (done) => {
                socket.emit('joinLobby', {lobby_id: 'test'}, (data) => {
                    expect(data.error).to.equal('not_logged_in');
                    done();
                });
            });

            it('Should throw an error if lobby does not exist', (done) => {
                socket.emit('setData', {username: 'test', userId: 'test'}, () => {
                    socket.emit('joinLobby', {lobby_id: 'test'}, (data) => {
                        expect(data.error).to.equal('lobby_not_found');
                        done();
                    });
                });
            });

            it('Should join a lobby', (done) => {
                socket.emit('setData', {username: 'test', userId: 'test'}, () => {
                    socket.emit('createLobby', (result) => {
                        socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                            socket2.emit('joinLobby', {lobby_id: result.lobby_id}, (data) => {
                                expect(data.success).to.be.true;
                                done();
                            });
                        });
                    });
                });
            });

            it ('Should be able to join a lobby with multiple players', (done) => {
                socket.emit('setData', {username: 'test', userId: 'test'}, () => {
                    socket.emit('createLobby', (result) => {
                        socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                            socket2.emit('joinLobby', {lobby_id: result.lobby_id}, (data) => {
                                expect(data.success).to.be.true;
                                socket3.emit('setData', {username: 'test3', userId: 'test3'}, () => {
                                    socket3.emit('joinLobby', {lobby_id: result.lobby_id}, (data) => {
                                        expect(data.success).to.be.true;
                                        socket4.emit('setData', {username: 'test4', userId: 'test4'}, () => {
                                            socket4.emit('joinLobby', {lobby_id: result.lobby_id}, (data) => {
                                                expect(data.success).to.be.true;
                                                done();
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });

        describe('Lobby Leaving', () => {

            it('Should throw an error if user is not logged in', (done) => {
                socket.emit('leaveLobby', (data) => {
                    expect(data.error).to.equal('not_logged_in');
                    done();
                });
            });

            it('Should throw an error if user is not in a lobby', (done) => {
                socket.emit('setData', {username: 'test', userId: 'test'}, () => {
                    socket.emit('leaveLobby', (data) => {
                        expect(data.error).to.equal('not_in_lobby');
                        done();
                    });
                });
            });

            it('Should be able to leave a lobby', (done) => {
                socket.emit('setData', {username: 'test', userId: 'test'}, () => {
                    socket.emit('createLobby', () => {
                        socket.emit('leaveLobby', (data) => {
                            expect(data.success).to.be.true;
                            done();
                        });
                    });
                });
            });
        });

        describe('Lobby Joining and Leaving', () => {

            function login(socket, username, userId) {
                return new Promise((resolve) => {
                    socket.emit('setData', {username: username, userId: userId}, () => {
                        resolve();
                    });
                });
            }

            function joinLobby(socket, lobbyId) {
                return new Promise((resolve) => {
                    socket.emit('joinLobby', {lobby_id: lobbyId}, (data) => {
                        resolve(data);
                    });
                });
            }

            function leaveLobby(socket) {
                return new Promise((resolve) => {
                    socket.emit('leaveLobby', (data) => {
                        resolve(data);
                    });
                });
            }

            it('Should be able to join and leave a lobby', (done) => {
                login(socket, 'test', 'test').then(() => {
                    socket.emit('createLobby', (result) => {
                        login(socket2, 'test2', 'test2').then(() => {
                            joinLobby(socket2, result.lobby_id).then((data) => {
                                expect(data.success).to.be.true;
                                leaveLobby(socket2).then((data) => {
                                    expect(data.success).to.be.true;
                                    done();
                                });
                            });
                        });
                    });
                });
            });

            it('Should be able to join and leave a lobby with multiple players', function(done) {
                this.timeout(10000);
                let seedrandom = require('seedrandom');
                let rng = seedrandom('420');
                let i2, i3, i4;
                i2 = i3 = i4 = true;
                let i1 = false;
                login(socket, 'test', 'test').then(() => {
                    login(socket2, 'test2', 'test2').then(() => {
                        login(socket3, 'test3', 'test3').then(() => {
                            login(socket4, 'test4', 'test4').then(() => {
                                socket.emit('createLobby', (result) => {
                                    // let player random join and leave
                                    let promises = [];
                                    let iterations = 10;
                                    for (let i = 0; i < iterations; i++) {
                                        let rand = rng();
                                        if (rand < 0.25*1/2) {
                                            promises.push(new Promise((resolve) => {
                                                joinLobby(socket, result.lobby_id).then((data) => {
                                                    if(i1)
                                                        expect(data.success).to.be.true;
                                                    else
                                                        expect(data.error).to.equal('already_in_lobby');
                                                    i1 = false;
                                                    resolve();
                                                }).catch((err) => {
                                                    console.error(err);
                                                    resolve();
                                                });
                                            }));
                                        } else if (rand < 0.25*1/1) {
                                            promises.push(new Promise((resolve) => {
                                                joinLobby(socket2, result.lobby_id).then((data) => {
                                                    if(i2)
                                                        expect(data.success).to.be.true;
                                                    else
                                                        expect(data.error).to.equal('already_in_lobby');
                                                    i2 = false;
                                                    resolve();
                                                }).catch((err) => {
                                                    console.error(err);
                                                    resolve();
                                                });
                                            }));
                                        } else if (rand < 0.25*3/2) {
                                            promises.push(new Promise((resolve) => {
                                                joinLobby(socket3, result.lobby_id).then((data) => {
                                                    if(i3)
                                                        expect(data.success).to.be.true;
                                                    else
                                                        expect(data.error).to.equal('already_in_lobby');
                                                    i3 = false;
                                                    resolve();
                                                }).catch((err) => {
                                                    console.error(err);
                                                    resolve();
                                                });
                                            }));
                                        } else if (rand < 0.25*4/2) {
                                            promises.push(new Promise((resolve) => {
                                                joinLobby(socket4, result.lobby_id).then((data) => {
                                                    if(i4)
                                                        expect(data.success).to.be.true;
                                                    else
                                                        expect(data.error).to.equal('already_in_lobby');
                                                    i4 = false;
                                                    resolve();
                                                }).catch((err) => {
                                                    console.error(err);
                                                    resolve();
                                                });
                                            }));
                                        } else if (rand < 0.25*5/2) {
                                            promises.push(new Promise((resolve) => {
                                                leaveLobby(socket).then((data) => {
                                                    if(!i1)
                                                        expect(data.success).to.be.true;
                                                    else
                                                        expect(data.error).to.equal('not_in_lobby');
                                                    i1 = true;
                                                    resolve();
                                                }).catch((err) => {
                                                    console.error(err);
                                                    resolve();
                                                });
                                            }));
                                        } else if (rand < 0.25*6/2) {
                                            promises.push(new Promise((resolve) => {
                                                leaveLobby(socket2).then((data) => {
                                                    if(!i2)
                                                        expect(data.success).to.be.true;
                                                    else
                                                        expect(data.error).to.equal('not_in_lobby');
                                                    i2 = true;
                                                    resolve();
                                                }).catch((err) => {
                                                    console.error(err);
                                                    resolve();
                                                });
                                            }));
                                        } else if (rand < 0.25*7/2) {
                                            promises.push(new Promise((resolve) => {
                                                leaveLobby(socket3).then((data) => {
                                                    if(!i3)
                                                        expect(data.success).to.be.true;
                                                    else
                                                        expect(data.error).to.equal('not_in_lobby');
                                                    i3 = true;
                                                    resolve();
                                                }).catch((err) => {
                                                    console.error(err);
                                                    resolve();
                                                });
                                            }));
                                        } else if (rand < 0.25*8/2) {
                                            promises.push(new Promise((resolve) => {
                                                leaveLobby(socket4).then((data) => {
                                                    if(!i4)
                                                        expect(data.success).to.be.true;
                                                    else
                                                        expect(data.error).to.equal('not_in_lobby');
                                                    i4 = true;
                                                    resolve();
                                                }).catch((err) => {
                                                    console.error(err);
                                                    resolve();
                                                });
                                            }));
                                        } else {
                                            throw 'error';
                                        }
                                    }
                                    Promise.all(promises).then(() => {
                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });

        });

        describe('Lobby update infos',function() {
            this.timeout(10000);

            it('Should update lobby info at enter', (done) => {
                socket.emit('setData', {username: 'test', userId: 'test'}, () => {
                    socket.emit('createLobby', (result) => {
                        socket.on('lobbyInfo', (data) => {
                            expect(data.type).to.equal('playerList');
                            expect(data.data).to.be.an('array');
                            expect(data.data.length).to.equal(2);
                            expect(data.data[0].username).to.be.oneOf(['test', 'test2']);
                            expect(data.data[1].username).to.be.oneOf(['test', 'test2']);
                            done();
                        });

                        socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                            socket2.emit('joinLobby', {lobby_id: result.lobby_id}, (data) => {
                                expect(data.success).to.be.true;
                            });
                        });

                        
                    });
                });
            });

            it('Should update lobby info at leave', (done) => {
                socket.emit('setData', {username: 'test', userId: 'test'}, () => {
                    socket.emit('createLobby', (result) => {
                        socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                            socket2.emit('joinLobby', {lobby_id: result.lobby_id}, (data) => {
                                expect(data.success).to.be.true;
                                
                                socket.on('lobbyInfo', (data) => {
                                    expect(data.type).to.equal('playerList');
                                    expect(data.data).to.be.an('array');
                                    expect(data.data.length).to.equal(1);
                                    expect(data.data[0].username).to.equal('test');
                                    done();
                                });

                                socket2.emit('leaveLobby', (data) => {
                                    expect(data.success).to.be.true;
                                });
                            });
                        });
                    });
                });
            });

        });

        describe('Lobby ready', () => {
                
            it('Should throw an error if user is not logged in', (done) => {
                socket.emit('ready', {ready: true}, (data) => {
                    expect(data.error).to.equal('not_logged_in');
                    done();
                });
            });

            it('Should throw an error if user is not in a lobby', (done) => {
                socket.emit('setData', {username: 'test', userId: 'test'}, () => {
                    socket.emit('ready', {ready: true}, (data) => {
                        expect(data.error).to.equal('not_in_lobby');
                        done();
                    });
                });
            });

            it('Should set ready', (done) => {
                socket.emit('setData', {username: 'test', userId: 'test'}, () => {
                    socket.emit('createLobby', () => {
                        socket.emit('ready', {ready: true}, (data) => {
                            expect(data.success).to.be.true;
                            expect(data.status).to.equal('not_enough_players');
                            done();
                        });
                    });
                });
            });

            it('Should start the game if all players are ready', (done) => {
                socket.emit('setData', {username: 'test', userId: 'test'}, () => {
                    socket.emit('createLobby', (data) => {
                        socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                            socket2.emit('joinLobby', {lobby_id: data.lobby_id}, (data) => {
                                expect(data.success).to.be.true;
                                socket.emit('ready', {ready: true}, (data) => {
                                    expect(data.success).to.be.true;
                                    let i = true;
                                    socket.on('lobbyInfo', (data) => {
                                        if (i) {
                                            expect(data.data).to.be.an('array');
                                            expect(data.data.length).to.equal(2);
                                            expect(data.data[0].username).to.be.oneOf(['test', 'test2']);
                                            expect(data.data[1].username).to.be.oneOf(['test', 'test2']);
                                            i = false;
                                        } else {
                                            expect(data.type).to.equal('gameStart');
                                            done();
                                        }
                                    });
                                    socket2.emit('ready', {ready: true}, (data) => {
                                        expect(data.success).to.be.true;
                                    });
                                });
                            });
                        });
                    });
                });
            });

            it('Should not start game if not all players are ready', (done) => {
                socket.emit('setData', {username: 'test', userId: 'test'}, () => {
                    socket.emit('createLobby', (data) => {
                        socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                            socket2.emit('joinLobby', {lobby_id: data.lobby_id}, (data) => {
                                expect(data.success).to.be.true;
                                socket2.on('lobbyInfo', (data) => {
                                    expect(data.type).to.equal('playerList');
                                    expect(data.data).to.be.an('array');
                                    expect(data.data.length).to.equal(2);
                                    done();
                                });
                                socket.emit('ready', {ready: true}, (data) => {
                                    expect(data.success).to.be.true;
                                    
                                });
                            });
                        });
                    });
                });
            });

            it('Should refresh the players if a Player changes state', (done) => {
                socket.emit('setData', {username: 'test', userId: 'test'}, () => {
                    socket.emit('createLobby', (data) => {
                        socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                            socket2.emit('joinLobby', {lobby_id: data.lobby_id}, (data) => {
                                expect(data.success).to.be.true;
                                socket.on('lobbyInfo', (data) => {
                                    expect(data.type).to.equal('playerList');
                                    expect(data.data).to.be.an('array');
                                    expect(data.data.length).to.equal(2);
                                    expect(data.data[0].username).to.be.oneOf(['test', 'test2']);
                                    expect(data.data[1].username).to.be.oneOf(['test', 'test2']);
                                    done();
                                });
                                socket2.emit('ready', {ready: true}, (data) => {
                                    expect(data.success).to.be.true;
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
