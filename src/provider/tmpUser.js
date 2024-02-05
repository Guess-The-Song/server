const extra = require('../extra.js');

function initVariables(socket) {
    socket.tmpUser = false;
}

function setVariables(socket/*, data*/) {
    socket.tmpUser = true;
    return {};
}

function createTmpUser(socket, data, callback) {

    // check if user is already logged in
    if (extra.isLoggedIn(socket)) { callback({ error: 'already_logged_in' }); return; }

    const nickname = getName(data.name);
    const username = 'tmpUser' + String(Math.floor(Math.random() * 100000)).padStart(5, '0');

    try {
        checkName(nickname);
    } catch (err) {
        if (err instanceof Error) {
            console.error(err);
            callback({ error: 'unknown_error' });
            return;
        } else {
            callback({ error: err });
            return;
        }
    }

    socket.tmpUser = true;
    socket.user.id = -1 * Math.floor(Math.random() * 100000000);
    socket.user.username = username;
    socket.user.nickname = nickname;

    callback({ success: true, username: username, nickname: nickname });
}

function getName(username) {
    username = username || null;
    if (username !== null) {
        username = username.trim();
    }
    return username;
}

function checkName(username) {
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

// ------------------------------------------------------------------------------
const Provider = require('./provider.js');

// Module class for spotify integration
class TmpUser extends Provider {
    constructor(r) {
        super('TempUser', r, '');
    }

    static requiredTables = [];

    init(socket) {

        socket.on('createTmpUser', (data, callback) => {
            if (socket.busy) {
                callback({ error: 'busy' });
                return;
            } else {
                socket.busy = true;
                if(extra.typeCheck(data, 'object', callback, 'function')){

                    createTmpUser(socket, data, callback);
                }
                socket.busy = false;
            }
        }); 

        // init variables
        initVariables(socket);
    }

    delete(socket) {
        socket.tmpUser = false;
    }

    isUsed(socket) {
        return socket.tmpUser;
    }

    getId(/*socket*/) {
        return -1;
    }

    setSocketVariables(socket, data) {
        return setVariables(socket, data);
    }

}

module.exports = TmpUser;