const extra = require('../extra.js');

function initVariables(socket) {
    socket.user = {
        id: null,
        username: null,
        nickname: null
    };
}

function setVariables(socket, data) {
    socket.user.id = data.id || null;
    socket.user.username = data.username || null;
    socket.user.nickname = data.nickname || null;
    return {
        username: socket.user.username,
        nickname: socket.user.nickname
    };
}

function getName(username) {
    username = username || null;
    if (username !== null) {
        username = username.trim();
    }
    return username;
}


function registerWrapper(data, socket, r, callback) {
    // check if user is already trying to register
    if (socket.busy) {
        callback({
            error: 'already_busy'
        });
        return;
    }
    socket.busy = true;

    register(data, socket, r, callback);

    socket.busy = false;
}


function register(data, socket, r, callback) {
    
    // check if user is already logged in
    if (extra.isLoggedIn(socket)) { callback({ error: 'already_logged_in' }); return; }

    // check if user has a acount to link to
    let connectedService, connectedId, connectedClass;


    // TODO: modularize to automatically check for all services

    // set connected_service and connected_id to the service that authenticated the user
    /*if (extra.elementExisting(socket.spotify.id)) {
        connectedService = 'spotify';
        connectedId = socket.spotify.id;
    }*/

    for (let provider of socket.provider) {
        if (provider.isUsed(socket)) {
            if (provider.name === 'User') {
                console.error('User is already existing?');
                continue;
            }
            connectedService = provider.primaryTabel;
            connectedId = provider.getId(socket);
            connectedClass = provider.constructor;
            break;
        }
    }

    if (connectedService === undefined) {
        callback({
            error: 'no_service_to_link_to'
        });
        return;
    }

    const username = getName(data.username);
    const nickname = getName(data.nickname);


    setUsername(username, nickname, socket, r).then(() => {
        // link user to service/provider
        r.table(connectedService).get(connectedId).update({
            user_id: socket.user.id
        }).run().then((/*result*/) => {
            socket.user.username = username;
            socket.user.nickname = nickname;
            let Auth = require('./auth.js');
            Auth.generateToken(socket, connectedClass, socket.spotify.id, r).then((token) => {
                callback({
                    success: true,
                    username: username,
                    nickname: nickname,
                    token: token
                });
                extra.extendedLogingLogic(socket, r);
                return;
            }).catch((err) => {
                console.error('Error while trying to generate token for user ' + socket.user.id + ': ' + err.trace);
                callback({
                    success: true,
                    username: username,
                    nickname: nickname
                });
                extra.extendedLogingLogic(socket, r);
                return;
            });
        }).catch((err) => {
            console.error('Error while trying link ' + connectedService + ' : ' + connectedId + ' to user ' + socket.user.id + ': ' + err.trace);
            callback({
                error: 'database_error'
            });
            return;
        });
    }).catch((err) => {
        callback({
            error: err
        });
        return;
    });
}

function changeUsername(data, socket, r, callback) {

    // check if user is logged in
    if (extra.isNotLoggedIn(socket)) { callback({ error: 'not_logged_in' }); return; }

    const username = getName(data.username);

    // check if username is valid
    try { checkUsername(username); } catch (err) { callback({ error: err }); return; }

    if (username === socket.user.username) {
        callback({
            success: true
        });
        return;
    }

    // check if username is already in database
    getUserData(username, r).then((result) => {
        if (result !== null) {
            callback({
                error: 'username_already_exists'
            });
            return;
        }

        // change username in database
        changeUserData({
            username: username
        }, socket, r).then(() => {
            socket.user.username = username;
            callback({
                success: true
            });
            return;
        }).catch((err) => {
            console.error('Error while trying to change username: ' + err.trace);
            callback({
                error: err
            });
            return;
        });

    }).catch((err) => {
        callback({
            error: err
        });
        return;
    });
}

function changeNickname(data, socket, r, callback) {  
    // check if user is logged in
    if (extra.isNotLoggedIn(socket)) { callback({ error: 'not_logged_in' }); return; }

    const nickname = data.nickname === '' ? null : getName(data.nickname);

    // check if nickname is valid
    try { checkNickname(nickname); } catch (err) { callback({ error: err }); return; }

    if (nickname === socket.user.nickname) {
        callback({
            success: true
        });
        return;
    }

    // change nickname in database
    changeUserData({
        nickname: nickname
    }, socket, r).then(() => {
        socket.user.nickname = nickname;
        callback({
            success: true
        });
        return;
    }).catch((err) => {
        callback({
            error: err
        });
        return;
    });
}

function removeAccount(socket, callback) {
    // wip function

    // check if user is logged in
    if (extra.isNotLoggedIn(socket)) { callback({ error: 'not_logged_in' }); return; }

    let promises = [];

    // remove user from all services
    for (let provider of socket.provider) {
        if (provider.isUsed(socket)) {
            promises.push(provider.delete(socket));
        }
    }

    Promise.all(promises).then(() => {
        console.log('User ' + socket.user.id + ' removed account');
        callback({
            success: true
        });
        return;
    }).catch((err) => {
        callback({
            error: err
        });
        return;
    });
}


function changeUserData(data, socket, r) {

    return new Promise((resolve, reject) => {

        r.table('users').get(socket.user.id).update(data).run().then((/*result*/) => {
            console.log('User ' + socket.user.id + ' changed data: ');
            console.log(data);
            resolve();
        }).catch((err) => {
            console.error('Error while trying to change user data: ' + err.trace);
            reject('database_error');
        });

    });
}

function setUsername(username, nickname, socket, r) {
    return new Promise((resolve, reject) => {
        // check if names are valid
        try {
            checkUsername(username);
            checkNickname(nickname);
        } catch (err) {
            reject(err);
            return;
        }

        // check if username is already in database 
        getUserData(username, r).then((result) => {
            if (result !== null) {
                reject('username_already_exists');
            } else {
                // save user in database
                r.table('users').insert({
                    // primary key is random number generated by rethinkdb
                    username: username,
                    nickname: nickname,
                    created: new Date()
                }).run().then((result) => {
                    socket.user.id = result.generated_keys[0];
                    console.log('User ' + username + ' registered with id ' + socket.user.id);
                    resolve();
                }).catch((err) => {
                    console.error('Error while trying to save user in database: ' + err.trace);
                    reject('database_error');
                });
            }
        }).catch((err) => {
            reject(err.trace);
        });
    });
}

function getUserData(username, r) {
    return new Promise((resolve, reject) => {
        // get username from db // username has secondary index
        r.table('users').getAll(username, {index: 'username'}).limit(1).run().then((result) => {
            if (result.length === 0) {
                resolve(null);
            } else {
                resolve(result[0]);
            }
            
        }).catch((err) => {
            console.error('Error while trying to get user data from database: ' + err.trace);
            reject('database_error');
        });
    });
}


function checkUsername(username) {
    // check if username is valid
    if (extra.elementNotExisting(username)) {
        throw 'no_username_given';
    }

    try {
        return checkNameLength(username);
    } catch (err) {
        throw 'username' + err;
    }
}

function checkNickname(nickname) {
    // check if nickname is valid

    if (extra.elementNotExisting(nickname)) {
        return true;
    }
    
    try {
        return checkNameLength(nickname);
    } catch (err) {
        throw 'nickname' + err;
    }
}

function checkNameLength(name) {
    // check if name is within length limits
    if (name.length < 3) {
        throw '_too_short';
    }

    if (name.length > 20) {
        throw '_too_long';
    }

    return true;
}

// ------------------------------------------------------------------------------------------------------------
const Provider = require('./provider.js');

class User extends Provider {
    constructor(r) {
        super('User', r, 'users');
    }

    static requiredTables = [{name: 'users', secondaryIndexes: ['username']}];

    init(socket) {
        // init variables
        initVariables(socket);

        socket.on('register', (data, callback) => {
            if(extra.typeCheck(data, 'object', callback, 'function')) {
                registerWrapper(data, socket, this._r, callback);
            }
        });

        socket.on('changeUsername', (data, callback) => {
            if(extra.typeCheck(data, 'object', callback, 'function')) {
                changeUsername(data, socket, this._r, callback);
            }
        });

        socket.on('changeNickname', (data, callback) => {
            if(extra.typeCheck(data, 'object', callback, 'function')) {
                changeNickname(data, socket, this._r, callback);
            }
        });

        socket.on('removeAccount', (callback) => {
            if(extra.typeCheck(callback, 'function')) {
                removeAccount(socket, callback);
            }
        });
    }

    delete(socket) {
        return new Promise((resolve, reject) => {
            this._r.table('users').get(socket.user.id).delete().run().then((result) => {
                if (result.deleted === 0) {
                    console.error('Error while trying to remove user ' + socket.user.id + ': user not found');
                    reject('user_not_found');
                } else {
                    resolve();
                }
            }).catch((err) => {
                console.error('Error while trying to remove user ' + socket.user.id + ': ' + err.trace);
                reject('database_error');
                return;
            });
        });
    }

    isUsed(socket) {
        return extra.elementExisting(socket.user.id);
    }

    getId(socket) {
        return socket.user.id;
    }

    setSocketVariables(socket, data, callback) {
        return setVariables(socket, data, callback);
    }
}

module.exports = User;