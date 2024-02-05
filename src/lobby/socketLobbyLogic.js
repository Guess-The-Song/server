const Lobby = require('./lobby');
const Player = require('./player');
const extra = require('../extra');

let operationStatus = {};

async function wrapBusy(name, func, callback) {
    if (!operationStatus[name]) {
        operationStatus[name] = true;
        await func();
        operationStatus[name] = false;
    } else if (extra.typeCheck(callback, 'function')) {
        callback({ error: 'busy' });
    }
}

function createLobby(socket, callback) {
    const lobbyLogic = socket.lobbyLogic;

    // check if user is logged in
    if (extra.isLoggedOut(socket)) {
        callback({ error: 'not_logged_in' });
        return;
    }

    if (socket.tmpUser !== null && socket.tmpUser) {
        callback({ error: 'tmp_user_can_not_create_lobby' });
        return;
    }

    let lobbys = lobbyLogic.lobbys;
    let availableGamemodes = lobbys.availableGamemodes;
    if (lobbyLogic.lobby !== null) {
        callback({ error: 'already_in_lobby' });
        return;
    } else {
        if (lobbyLogic.oldLobby !== null) {
            // delete old lobby
            lobbyLogic.oldLobby.delete();
        }

        let id;
        do {
            id = Math.random().toString(36).substring(2, 5);
        } while (lobbys.has(id));
        let player = new Player({
            id: socket.user.id,
            username: socket.user.username,
            nickname: socket.user.nickname,
            socket: socket,
            lobbyLogic: lobbyLogic,
        });
        let lobby = new Lobby(id, player, availableGamemodes, lobbys);
        lobbyLogic.lobby = lobby;
        callback({ success: true, lobby_id: id });
    }
}

function joinLobby(socket, data, callback) {
    console.log('join lobby');
    const lobbyLogic = socket.lobbyLogic;

    // check if user is logged in
    if (extra.isNotLoggedIn(socket)) {
        callback({ error: 'not_logged_in' });
        return;
    }

    let lobbys = lobbyLogic.lobbys;
    let lobby = lobbys.get(data.lobby_id);
    if (lobby === undefined) {
        callback({ error: 'lobby_not_found' });
        return;
    } else if (lobbyLogic.lobby !== null && lobbyLogic.lobby !== lobby) {
        callback({ error: 'already_in_lobby' });
        return;
    } else {
    // join lobby

        // delete old lobby 
        if (lobbyLogic.oldLobby !== null && lobbyLogic.oldLobby !== lobby) {
            lobbyLogic.oldLobby.delete();
        } else if (lobbyLogic.oldLobby === lobby) {
            lobbyLogic.oldLobby = null;
        }
        
        lobbyLogic.lobby = lobby;

        // try to find old player
        let player = lobby.players.find((p) => p.id == socket.user.id);
        if (player === undefined) {
            // create new player
            player = new Player({
                id: socket.user.id,
                username: socket.user.username,
                nickname: socket.user.nickname,
                socket: socket,
                lobbyLogic: lobbyLogic,
            });
            try {
                lobby.addPlayer(player);
            } catch (err) {
                lobbyLogic.lobby = null;
                if (err instanceof Error) {
                    console.error(err);
                    callback({ error: 'unknown_error' });
                    return;
                }
                callback({ error: err });
                return;
            }
        } else {
            // update player
            player.socket = socket;
            player.lobbyLogic = lobbyLogic;
            player.username = socket.user.username;
            player.nickname = socket.user.nickname;

            if(player.isActive) {
                console.log('found old player that was active?');
            }
            // set player active
            lobby.setActive(player);
        }
        callback({ success: true });
    }
}

/**
 * Checks if user is logged in and in a lobby, then executes func
 * @param {*} socket // socket of the user
 * @param {*} callback // callback to send the result to, will be called with {success: true} if successful, else with {error: error}
 * @param {*} func // function to execute
 * @returns // nothing
 */
function needLoginAndLobbyThenDoSth(socket, callback, func) {
    // check if user is logged in
    if (extra.isLoggedOut(socket)) { callback({ error: 'not_logged_in' }); return; }

    // check if user is in lobby
    let lobby = socket.lobbyLogic.lobby;
    if (lobby === null) { callback({ error: 'not_in_lobby' }); return; }

    // execute func
    try {
        func(lobby);
        callback({ success: true });
    } catch (err) {
        if (err instanceof Error) {
            console.error(err);
            callback({ error: 'unknown_error' });
            return;
        }
        callback({ error: err });
        return;
    }
}

function kickPlayer(socket, data, callback) {
    needLoginAndLobbyThenDoSth(socket, callback, (lobby) => lobby.kickPlayer(socket.user.id, data.player_name));
}

function leaveLobby(socket, callback) {
    needLoginAndLobbyThenDoSth(socket, callback, (lobby) => lobby.removePlayer(socket.user.id));
}

function changeRules(socket, data, callback) {
    needLoginAndLobbyThenDoSth(socket, callback, (lobby) => {
        let playerObj = lobby.players.find((p) => p.id == socket.user.id);

        // if you change rules, you are not ready anymore
        if (playerObj.isReady) {
            playerObj.isReady = false;
            lobby.sendPlayersToAll();
            callback({ status: 'not_ready' });
        }
        try {
            lobby.chanceRules(playerObj, data);
        } catch (err) {
            lobby.sendRulesToPlayer(playerObj);
            throw err;
        }
    });
}

function setInactive(socket, callback) {
    needLoginAndLobbyThenDoSth(socket, callback, (lobby) => {
        // check if game is running
        if (!lobby.gameRunning) {
            // if not running, leave lobby // May be changed in the future
            //leaveLobby(socket, callback);
            lobby.removePlayer(socket.user.id);
        } else {
            // set player inactive
            lobby.setInactive(socket.user.id);
        }
    });
}

function setReady(socket, data, callback) {
    const lobbyLogic = socket.lobbyLogic;

    // check if user is logged in
    if (extra.isLoggedOut(socket)) {
        callback({ error: 'not_logged_in' });
        return;
    }

    let lobby = lobbyLogic.lobby;
    if (lobby === null) {
        callback({ error: 'not_in_lobby' });
        return;
    } else {
        let player = lobby.players.find((p) => p.id == socket.user.id);
        if (player === undefined) {
            callback({ error: 'player_not_found' });
            return;
        } else {
            try {
                lobby.setReady(player, data.ready);
                callback({
                    success: true,
                });
            } catch (err) {
                if (err instanceof Error) {
                    console.error(err);
                    callback({ error: 'unknown_error' });
                    return;
                }
                callback({
                    success: true,
                    status: err,
                });
            }
        }
    }
}

function setGameMode(socket, data, callback) {
    needLoginAndLobbyThenDoSth(socket, callback, (lobby) => {
        let playerObj = lobby.players.find((p) => p.id == socket.user.id);

        // if you change rules, you are not ready anymore
        if (playerObj.isReady) {
            playerObj.isReady = false;
            lobby.sendPlayersToAll();
            callback({ status: 'not_ready' });
        }
        lobby.setGamemode(playerObj, data.gameMode);
    });
}

class SocketLobbyLogic {
    // this class handles the logic for the lobby on a per socket(player) basis
    constructor(socket, lobbys) {
        socket.lobbyLogic = this; // lobby logic for the socket
        //this.socket = socket; // socket the player is connected to
        this.lobby = null; // lobby objekt the player is in
        this.lobbys = lobbys; // Map of all lobbys
        this.oldLobby = null; // lobby the player owned before leaving

        socket.on('createLobby', (callback) => {
            if (extra.typeCheck(callback, 'function')) {
                wrapBusy('lobby', () => {
                    createLobby(socket, callback);
                }, callback);
            }
        });

        socket.on('joinLobby', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                wrapBusy('lobby', () => {
                    joinLobby(socket, data, callback);
                }, callback);
            }
        });

        socket.on('kickPlayer', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                wrapBusy('kick', () => {
                    kickPlayer(socket, data, callback);
                }, callback);
            }
        });

        socket.on('leaveLobby', (callback) => {
            if (extra.typeCheck(callback, 'function')) {
                wrapBusy('lobby', () => {
                    leaveLobby(socket, callback);
                }, callback);
            }
        });

        socket.on('ready', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                wrapBusy('lobby', () => {
                    setReady(socket, data, callback);
                }, callback);
            }
        });

        socket.on('changeRules', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                wrapBusy('lobby', () => {
                    changeRules(socket, data, callback);
                }, callback);
            }
        });

        socket.on('lobbyExists', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                if (this.lobbys.has(data.lobby_id)) {
                    callback({ exists: true });
                } else {
                    callback({ exists: false });
                }
            }
        });

        socket.on('getGameModes', (callback) => {
            if (extra.typeCheck(callback, 'function')) {
                callback({ gameModes: this.lobbys.availableGamemodes });
            }
        });

        socket.on('setGameMode', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                wrapBusy('lobby', () => {
                    setGameMode(socket, data, callback);
                }, callback);
            }
        });

        socket.on('setInactive', (callback) => {
            if (extra.typeCheck(callback, 'function')) {
                wrapBusy('lobby', () => {
                    setInactive(socket, callback);
                }, callback);
            }
        });
    }

    onDisconnect(socket) {
    // leave lobby if in one
        if (this.lobby !== null) {
            // if in active game, be set to inactive
            if (this.lobby.gameRunning) {
                this.lobby.setInactive(socket.user.id);
            } else {
                try {
                    this.lobby.removePlayer(socket.user.id);
                } catch (err) {
                    console.error(err);
                }
            }
        }

        // delete old lobby if it exists
        if (this.oldLobby !== null) this.oldLobby.delete();
    }
}

module.exports = SocketLobbyLogic;
