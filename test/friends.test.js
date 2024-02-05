const expect = require('chai').expect;
//const sinon = require('sinon');
const ioClient = require('socket.io-client');

const server = require('../src/index.js');
const config = require('./config.json');

let r;

describe('Friends Tests', () => {
    let socket1;
    let socket2;

    before(function(done) {
        this.timeout(10000);

        let promises = [];

        if (config.beQuiet) server.beQuiet();
        server.setToTesting();
        server.start().then(() => {
            r = server.getR();

            promises.push(r.table('users').get('test1').run().then((result) => {
                if (result === null) {
                    promises.push(r.table('users').insert({ id: 'test1', username: 'test1'}).run());
                }
            }));
            promises.push(r.table('users').get('test2').run().then((result) => {
                if (result === null) {
                    promises.push(r.table('users').insert({ id: 'test2', username: 'test2'}).run());
                }
            }));
            
            Promise.all(promises).then(() => {
                done();
            });
        });
    });

    beforeEach((done) => {
        // Prepear a Socket.io client before running any tests
        socket1 = ioClient.connect(`${config.server.connection}://${config.server.host}:${config.server.port}`);
        socket2 = ioClient.connect(`${config.server.connection}://${config.server.host}:${config.server.port}`);
        let promises = [];
        promises.push(new Promise((resolve) => {
            socket1.on('connect', () => {
                resolve();
            });
        }));

        promises.push(new Promise((resolve) => {
            socket2.on('connect', () => {
                resolve();
            });
        }));

        Promise.all(promises).then(() => {
            done();
        });
    });

    afterEach(() => {
        // Disconnect the Socket.io client after each test
        socket1.disconnect();
        socket2.disconnect();
    });

    after(function(done) {
        //this.timeout(10000);

        // Stop the Socket.io server after all tests have run
        let promises = [];
        promises.push(r.table('users').get('test1').delete().run());
        promises.push(r.table('users').get('test2').delete().run());
        Promise.all(promises).catch((err) => {
            console.error('Error while cleaning up: ' + err);
        }).finally(() => {
            server.exitServer().then(() => {
                done();
            });
        });
    });

    describe('Add Friend', () => {
        it('should fail if the user is not logged in', (done) => {
            socket1.emit('addFriend', { user_id: 'test' }, (result) => {
                expect(result).to.deep.equal({ error: 'not_logged_in' });
                done();
            });
        });
        
        it('should fail if the user is not found', (done) => {
            socket1.emit('setData', {username: 'test', userId: 'test'}, () => {
                socket1.emit('addFriend', { user_id: 'no_test' }, (result) => {
                    expect(result).to.deep.equal({ error: 'user_not_found' });
                    done();
                });
            });
        });

        it('should succeed if the user is valid', (done) => {
            socket1.emit('setData', {username: 'test1', userId: 'test1'}, () => {
                socket1.emit('addFriend', { user_id: 'test2' }, (result) => {
                    expect(result).to.deep.equal({ success: true });
                    socket1.emit('removeFriend', { user_id: 'test2' }, () => {
                        done();
                    });
                });
            });
        });

        it('should fail if the user is already send a friend request', (done) => {
            socket1.emit('setData', {username: 'test1', userId: 'test1'}, () => {
                socket1.emit('addFriend', { user_id: 'test2' }, () => {
                    socket1.emit('addFriend', { user_id: 'test2' }, (result) => {
                        expect(result).to.deep.equal({ error: 'already_sent_request' });
                        socket1.emit('removeFriend', { user_id: 'test2' }, () => {
                            done();
                        });
                    });
                });
            });
        });

    });

    describe('Revoke Friend Request', () => {
        it('should fail if the user is not logged in', (done) => {
            socket1.emit('removeFriend', { user_id: 'test' }, (result) => {
                expect(result).to.deep.equal({ error: 'not_logged_in' });
                done();
            });
        });
        
        it('should fail if the user is not found', (done) => {
            socket1.emit('setData', {username: 'test', userId: 'test'}, () => {
                socket1.emit('removeFriend', { user_id: 'no_test' }, (result) => {
                    expect(result).to.deep.equal({ error: 'user_not_found' });
                    done();
                });
            });
        });

        it('should succeed if the user is valid', (done) => {
            socket1.emit('setData', {username: 'test1', userId: 'test1'}, () => {
                socket1.emit('addFriend', { user_id: 'test2' }, () => {
                    socket1.emit('removeFriend', { user_id: 'test2' }, (result) => {
                        expect(result).to.deep.equal({ success: true });
                        done();
                    });
                });
            });
        });

        it('should fail if the user is not a friend', (done) => {
            socket1.emit('setData', {username: 'test1', userId: 'test1'}, () => {
                socket1.emit('removeFriend', { user_id: 'test2' }, (result) => {
                    expect(result).to.deep.equal({ error: 'not_friends' });
                    done();
                });
            });
        });
    });

    describe('Accept Friend Request', () => {
        it('should fail if the user is not logged in', (done) => {
            socket1.emit('acceptFriend', { user_id: 'test' }, (result) => {
                expect(result).to.deep.equal({ error: 'not_logged_in' });
                done();
            });
        });
        
        it('should fail if the user is not found', (done) => {
            socket1.emit('setData', {username: 'test', userId: 'test'}, () => {
                socket1.emit('acceptFriend', { user_id: 'no_test' }, (result) => {
                    expect(result).to.deep.equal({ error: 'user_not_found' });
                    done();
                });
            });
        });

        it('should succeed if the user is valid', (done) => {
            socket1.emit('setData', {username: 'test1', userId: 'test1'}, () => {
                socket1.emit('addFriend', { user_id: 'test2' }, () => {
                    socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                        socket2.emit('acceptFriend', { user_id: 'test1' }, (result) => {
                            expect(result).to.deep.equal({ success: true });
                            socket1.emit('removeFriend', { user_id: 'test2' }, () => {
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('should fail if the user is not a friend', (done) => {
            socket1.emit('setData', {username: 'test1', userId: 'test1'}, () => {
                socket1.emit('acceptFriend', { user_id: 'test2' }, (result) => {
                    expect(result).to.deep.equal({ error: 'no_request' });
                    done();
                });
            });
        });
    });

    describe('Reject Friend Request', () => {
        it('should succeed if the user is valid', (done) => {
            socket1.emit('setData', {username: 'test1', userId: 'test1'}, () => {
                socket1.emit('addFriend', { user_id: 'test2' }, () => {
                    socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                        socket2.emit('removeFriend', { user_id: 'test1' }, (result) => {
                            expect(result).to.deep.equal({ success: true });
                            done();
                        });
                    });
                });
            });
        });
    });

    describe('Remove Friend', () => {
        it('should succeed if the user is valid', (done) => {
            socket1.emit('setData', {username: 'test1', userId: 'test1'}, () => {
                socket1.emit('addFriend', { user_id: 'test2' }, () => {
                    socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                        socket2.emit('acceptFriend', { user_id: 'test1' }, () => {
                            socket1.emit('removeFriend', { user_id: 'test2' }, (result) => {
                                expect(result).to.deep.equal({ success: true });
                                done();
                            });
                        });
                    });
                });
            });
        });
    });


    describe('Notifications', () => {
        
        beforeEach((done) => {
            let promises = [];
            promises.push(r.table('friends').getAll('test1', { index: 'friend1' }).delete().run());
            promises.push(r.table('friends').getAll('test2', { index: 'friend1' }).delete().run());
            Promise.all(promises).then(() => {
                done();
            });
        });

        after((done) => {
            let promises = [];
            promises.push(r.table('friends').getAll('test1', { index: 'friend1' }).delete().run());
            promises.push(r.table('friends').getAll('test2', { index: 'friend1' }).delete().run());
            Promise.all(promises).then(() => {
                done();
            });
        });

        it('should send a notification to the user if a friend request is send', (done) => {
            socket1.emit('setData', {username: 'test1', userId: 'test1'}, () => {
                socket1.on('friendUpdate', (data) => {
                    expect(data).to.deep.include({ type: 'request' });
                    expect(data.user).to.deep.include({ username: 'test2' });
                    done();
                });
                socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                    socket2.emit('addFriend', { user_id: 'test1' }, (result) => {
                        expect(result).to.deep.equal({ success: true });
                        socket1.emit('removeFriend', { user_id: 'test2' }, () => {
                        });
                    });
                });
            });
        });

        it('should send a notification to the user if a friend request is accepted', (done) => {
            socket1.emit('setData', {username: 'test1', userId: 'test1'}, () => {
                socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                    socket2.emit('addFriend', { user_id: 'test1' }, (result) => {
                        expect(result).to.deep.equal({ success: true });
                        socket2.on('friendUpdate', (data) => {
                            if (data.type === 'request') {
                                // dam it why is the server so slow sometimes
                                return;
                            }
                            expect(data).to.deep.include({ type: 'accept' });
                            expect(data.user).to.deep.include({ username: 'test1' });
                            done();
                        });
                        socket1.emit('acceptFriend', { user_id: 'test2' }, () => {
                            socket1.emit('removeFriend', { user_id: 'test2' }, () => {
                            });
                        });
                    });
                });
            });
        });

        it('should send a notification to the user if a friend request is withdrawn', (done) => {
            socket1.emit('setData', {username: 'test1', userId: 'test1'}, () => {
                socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                    socket2.emit('addFriend', { user_id: 'test1' }, (result) => {
                        expect(result).to.deep.equal({ success: true });
                        socket1.on('friendUpdate', (data) => {
                            if (data.type === 'request') {
                                // dam it why is the server so slow sometimes
                                return;
                            }
                            expect(data).to.deep.include({ type: 'withdraw' });
                            expect(data.user).to.deep.include({ username: 'test2' });
                            done();
                        });
                        socket2.emit('removeFriend', { user_id: 'test1' }, () => {
                        });
                    });
                });
            });
        });

        it('should send a notification to the user if a friendship is ended', (done) => {
            socket1.emit('setData', {username: 'test1', userId: 'test1'}, () => {
                socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                    socket2.emit('addFriend', { user_id: 'test1' }, (result) => {
                        expect(result).to.deep.equal({ success: true });
                        socket1.emit('acceptFriend', { user_id: 'test2' }, () => {
                            socket1.on('friendUpdate', (data) => {
                                if (data.type === 'request') {
                                    // dam it why is the server so slow sometimes
                                    return;
                                }
                                expect(data).to.deep.include({ type: 'remove' });
                                expect(data.user).to.deep.include({ username: 'test2' });
                                done();
                            });
                            socket2.emit('removeFriend', { user_id: 'test1' }, () => {
                            });
                        });
                    });
                });
            });
        });

        it('should send a notification to the user if a friend request is rejected', (done) => {
            socket1.emit('setData', {username: 'test1', userId: 'test1'}, () => {
                socket2.emit('setData', {username: 'test2', userId: 'test2'}, () => {
                    socket2.emit('addFriend', { user_id: 'test1' }, (result) => {
                        expect(result).to.deep.equal({ success: true });
                        socket2.on('friendUpdate', (data) => {
                            if (data.type === 'request') {
                                // dam it why is the server so slow sometimes
                                return;
                            }
                            expect(data).to.deep.include({ type: 'reject' });
                            expect(data.user).to.deep.include({ username: 'test1' });
                            done();
                        });
                        socket1.emit('removeFriend', { user_id: 'test2' }, () => {
                        });
                    });
                });
            });
        });
    });

});