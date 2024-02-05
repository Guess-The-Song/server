const extra = require('../extra.js');
let Crypto = require('crypto');
let config = require('../../config/auth.json');

function wrappAuth(socket, data, callback, r) {
    if (socket.busy) {
        callback({ error: 'busy' });
        return;
    } else {
        socket.busy = true;
        auth(socket, data, callback, r).then(() => {
            socket.busy = false;
        });
    }
}

function auth(socket, data, callback, r) {
    return new Promise((resolve) => {
        // check if user is already logged in
        if (extra.isLoggedIn(socket)) {
            callback({ error: 'already_logged_in' });
            resolve();
            return;
        }
        getAuth(data, r).then((authData) => {
            getUser(authData.user_id, r).then((user) => {
                socket.user.id = user.id;
                socket.user.username = user.username;
                socket.user.nickname = user.nickname;
                
                getProvider(authData.provider_table, authData.provider_user_id, r).then((provider) => {
                    for (let value of socket.provider) {
                        if (value.primaryTabel === authData.provider_table) {
                            let providerData = value.setSocketVariables(socket, provider);
                            providerData.provider = value.name;
                            providerData.username = socket.user.username;
                            providerData.nickname = socket.user.nickname;
                            extra.extendedLogingLogic(socket, r);
                            callback(providerData);
                            resolve();
                            return;
                        }
                    }
                    callback({ error: 'Provider not found' });
                    socket.user = {};
                    resolve();
                    return;
                }).catch((err) => {
                    callback({ error: err });
                    socket.user = {};
                    resolve();
                    return;
                });
            }).catch((err) => {
                callback({ error: err });
                socket.user = {};
                resolve();
                return;
            });
        }).catch((err) => {
            socket.user = {};
            callback({ error: err });
        }).finally(() => {
            resolve();
            return;
        });
    });
}

function getAuth(data, r) {
    return new Promise((resolve, reject) => {
        if (extra.elementExisting(data.token)) {
            let hash = Crypto.createHash('sha256').update(data.token).digest('hex');
            r.table('auth').get(hash).run().then((result) => {
                if (result !== null) {
                    let expireDate = result.expire_date;
                    if (expireDate === undefined || expireDate < Date.now()) {
                        // token expired -> remove token
                        r.table('auth').get(hash).delete().run().then(() => {
                            reject('Token_expired');
                            return;
                        }).catch((err) => {
                            console.error('Error_while_trying_to_delete_auth:_' + err.stack);
                            reject('Error_while_trying_to_delete_expired_token_from_db');
                            return;
                        });
                    } else {
                        resolve(result);
                        return;
                    }
                } else {
                    reject('Token_not_found');
                    return;
                }
            }).catch((err) => {
                console.error('Error while trying to get auth: ' + err.stack);
                reject('Error_while_trying_to_get_auth_from_db');
                return;
            });
        } else {
            reject('No_token_provided');
            return;
        }
    });
}

function getUser(userId, r) {
    return new Promise((resolve, reject) => {
        r.table('users').get(userId).run().then((result) => {
            if (result !== null) {
                resolve(result);
                return;
            } else {
                reject('User_not_found');
                return;
            }
        }).catch((err) => {
            console.error('Error while trying to get user: ' + err.stack);
            reject('Error_while_trying_to_get_user_from_db');
            return;
        });
    });
}

function getProvider(provider, providerId, r) {
    return new Promise((resolve, reject) => {
        r.table(provider).get(providerId).run().then((result) => {
            if (result !== null) {
                resolve(result);
                return;
            } else {
                reject('Provider_not_found');
                return;
            }
        }).catch((err) => {
            console.error('Error while trying to get provider: ' + err.stack);
            reject('Error_while_trying_to_get_provider_from_db');
            return;
        });
    });
}

function generateToken(userId, providerTable, provideruserId, r) {
    return new Promise((resolve, reject) => {
        // test if user already has a token
        r.table('auth').getAll(userId, { index: 'user_id' }).run().then((result) => {
            if (result.length > 0) {
                // user already has a token -> delete it
                r.table('auth').getAll(userId, { index: 'user_id' }).delete().run().then(() => {
                    // create new token
                    _createToken(userId, providerTable, provideruserId, r).then((token) => {
                        resolve(token);
                        return;
                    }).catch((err) => {
                        reject(err);
                        return;
                    });
                }).catch((err) => {
                    console.error('Error while trying to delete auth: ' + err.stack);
                    reject('Error_while_trying_to_delete_auth_from_db');
                    return;
                });
            } else {
                // create new token
                _createToken(userId, providerTable, provideruserId, r).then((token) => {
                    resolve(token);
                    return;
                }).catch((err) => {
                    reject(err);
                    return;
                });
            }
        }).catch((err) => {
            console.error('Error while trying to get auth: ' + err.stack);
            reject('Error_while_trying_to_get_auth_from_db');
            return;
        });
        
    });
}

function _createToken(userId, providerTable, provideruserId, r) {
    return new Promise((resolve, reject) => {
        let token = Crypto.randomBytes(128).toString('hex');
        let expireDate = Date.now() +  config.expires_in_days * 24 * 60 * 60 * 1000;
        r.table('auth').insert({
            token_hash: Crypto.createHash('sha256').update(token).digest('hex'),
            user_id: userId,
            provider_table: providerTable,
            provider_user_id: provideruserId,
            expire_date: expireDate
        }).run().then(() => {
            resolve(token);
            return;
        }).catch((err) => {
            console.error('Error while trying to insert auth: ' + err.stack);
            reject('Error_while_trying_to_insert_auth_into_db');
            return;
        });
    });
}

// ------------------------------------------------------------------------------------------------------------
const Provider = require('./provider.js');

class Auth extends Provider {
    constructor(r) {
        super('Auth', r, 'auth');
    }

    static requiredTables = [{name: 'auth', primaryKey: 'token_hash', secondaryIndexes: ['user_id']}];

    /**
     * Generates a new token for the user in combination with a provider
     * @param {*} socket - The socket object
        * @param {Provider} provider - The provider Class
     * @returns {string} - The generated token
     */
    static generateToken(socket, providerClass, id, r) {
        let userId = socket.user.id;
        let providerTable = providerClass.requiredTables[0].name;
        return generateToken(userId, providerTable, id, r);
    }

    init(socket) {

        socket.on('auth', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                wrappAuth(socket, data, callback, this._r);
            }
        });
    }

    delete(socket) {
        return new Promise((resolve) => {
            this._r.table('auth').get(socket.user.id, {index: 'user_id'}).delete().run().then(() => {
                resolve();
                return;
            }).catch((err) => {
                console.error('Error while trying to delete auth: ' + err);
                resolve();
                return;
            });
        });
    }
}

module.exports = Auth;