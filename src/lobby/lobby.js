// hadels the logic for lobby creation and joining
const extra = require('../extra');
const Player = require('./player');


class Lobby {
    constructor(id, owner, availableGamemodes, lobbys) {
        this.players = new Array(); // Array of all players in the lobby
        this.allLobbys = lobbys; // Map of all lobbys
        this.GameMode = null; // Class of the gamemode
        this.availableGameModes = availableGamemodes;
        this.id = id;
        this.rules = null; // Rules object
        this.countdown = null;
        this.owner = owner; // Player object

        // game running logic
        this.gameRunning = false;
        this.gameModeObjekt = null;

        // set default gamemode 
        this._changeGamemode(availableGamemodes[0]);

        // add Lobby to lobbys
        lobbys.set(id, this);

        // check if owner is a player
        if (owner instanceof Player) {
            this.players.push(owner);
            owner.role = 'owner';

            // send player list to owner
            this.sendPlayersToAll();

            // send rules to owner
            this.sendRulesToPlayer(owner);
        } else {
            console.log('Lobby owner is not a Player object');
            throw 'owner_is_not_a_Player_object';
        }

        console.log('Lobby created: ' + id);
        console.log('Lobbys: ' + JSON.stringify([...lobbys.keys()]));
    }

    // add player to lobby
    addPlayer(player) {
        if (player instanceof Player) {
            console.log('trying to add player ' + player.username + ' to lobby ' + this.id);
            if (this.players.length >= this.rules.max_players) {
                throw 'lobby_is_full';
            }
            // check if player is already in lobby
            if (this.players.find((p) => p.id == player.id) !== undefined) {
                throw 'player_already_in_lobby';
            }

            this._setToOwnerIfNecessary(player);
           
            this.players.push(player);

            // send new player to all players
            this.sendPlayersToAll();

            this._bringPlayerUpToDate(player);

        } else {
            throw 'player_is_not_a_Player_object';
        }
    }

    setInactive(player) {
        // player is id
        let playerObj = this.players.find((p) => p.id == player);
        if (playerObj === undefined) {
            throw 'player_not_found';
        } else {
            playerObj.isActive = false;
        }
        console.log(playerObj.username + ' is inactive now');

        this._setNewOwnerIfNecessary(playerObj);

        this.gameModeObjekt.playerInactive(playerObj);

        if (this.players.some((p) => p.isActive)) {
            this.sendPlayersToAll();
        }
           
    }

    setActive(player) {
        console.log(player.username + ' is active again');
        player.isActive = true;

        // send all players refreshed player list
        this.sendPlayersToAll();

        this._bringPlayerUpToDate(player);

        if (this.gameRunning) {
            // if game is paused, resume game
            this.gameModeObjekt.resumeGame();
        }
    }

    setReady(player, data) {
        // check if lobby has started
        if (this.gameRunning) {
            // assuming website shows wrong screen
            this._emitRelevantGameInfo(player);
            // send all players refreshed player list
            this.sendPlayersToAll();
            throw 'game_already_started';
        }

        //console.log('setReady of ' + player.username + ' to ' + data);
        player.isReady = data === true;

        // send all players refreshed player list
        this.sendPlayersToAll();

        // check if all players are ready
        if (data) {
            console.log('looking if all players are ready');
            this.ifAllPlayersAreReadyStartGame();
        }
    }

    // remove player from lobby
    removePlayer(player) {
        // player is id
        let index = this.players.findIndex((p) => p.id == player);
        let playerObj = this.players[index];
        if (playerObj === undefined) {
            throw 'player_not_found';
        } else {

            this._setNewOwnerIfNecessary(playerObj);

            // remove player
            let lengthBefore = this.players.length;
            this.players.splice(index, 1);
            if (lengthBefore == this.players.length) {
                throw 'error_while_removing_player';
            }

            if (this.gameRunning) {
                // if in active game, remove game handler
                this.gameModeObjekt.deInit(playerObj.socket);
            }

            // check if lobby is empty or inactive
            if (this.players.length == 0 || this.players.every((p) => !p.isActive)) {
                if (!this.gameRunning) {
                    // delete lobby after 5 minutes
                    this.countdown = setTimeout(() => { this.delete(); }, 5 * 60 * 1000);
                } else {
                    if (this.players.length == 0) {
                        // delete lobby immediately
                        this.delete();
                    } else {
                        // pause game
                        this.gameModeObjekt.pauseGame();
                        if (this.players.every((p) => !p.isActive)) {
                            // delete lobby after 5 minutes
                            this.countdown = setTimeout(() => { this.delete(); }, 5 * 60 * 1000);
                        }
                    }
                }
            } else {
                // send new player list to all players
                this.sendPlayersToAll();

                if (!this.gameRunning) {
                    // check if all players are ready
                    this.ifAllPlayersAreReadyStartGame();
                } else {
                    // notify gamemode
                    this.gameModeObjekt.playerLeft(playerObj);
                }
            }

            playerObj.lobbyLogic.lobby = null; // to prevent error, because player is no longer in lobby
            if (!playerObj.isEquals(this.owner)) {
                if (playerObj.lobbyLogic.oldLobby !== null) {
                    console.log('player is not owner, but has old lobby??');
                } else {
                    playerObj.delete();
                }
            }
        }
    }

    ifAllPlayersAreReadyStartGame() {
        if (this.players.every((p) => p.isReady)) {
            // start game
            console.log('all players are ready, trying to starting game');
            this.startGame();
        }
    }

    chanceRules(playerObj, data) {
        let key = data.key;
        let value = data.value;

        // check if player is owner
        if (!playerObj.isEquals(this.owner)) {
            throw 'changing_rules_only_allowed_for_owner';
        }


        if(extra.elementExisting(key) && extra.elementExisting(value)) {
            if (this.rules.changeRule(key, value)) {
                // send new rules to all players
                this.players.forEach((p) => {
                    this.sendRulesToPlayer(p);
                });
            } else {
                throw 'rule_not_found';
            }
        } else {
            throw 'data_not_valid';
        }
    }

    kickPlayer(initiator, player) {
        let initiatorObj = this.players.find((p) => p.id == initiator);
        if (!initiatorObj.isEquals(this.owner)) {
            throw 'kicking_only_allowed_for_owner';
        }
        //player is name
        let playerObj = this.players.find((p) => p.username == player);

        if (playerObj === undefined) {
            throw 'player_not_found';
        } else {
            if (playerObj.isEquals(this.owner)) {
                throw 'owner_cant_kick_himself';
            } else {
                let socket = playerObj.socket; // save socket, because playerObj will be deleted
                this.removePlayer(playerObj.id);

                // notify player
                socket.emit('lobbyInfo', { //TODO: change to own event
                    type: 'kicked',
                    data: {
                        username: initiatorObj.username,
                        nickname: initiatorObj.nickname
                    }
                });
                console.log('kicked ' + playerObj.username + ' from lobby ' + this.id);
            }
        }
    }

    setGamemode(playerObj, gameMode) {
        // check if player is owner
        if (!playerObj.isEquals(this.owner)) {
            throw 'changing_gamemode_only_allowed_for_owner';
        }

        if (this.gameRunning) {
            throw 'cant_change_gamemode_while_game_is_running';
        }        

        this._changeGamemode(gameMode);
    }


    // set the gamemode
    _changeGamemode(gameMode) {
        console.log('set gamemode to ' + gameMode + ' available: ' + this.availableGameModes);
        if (this.availableGameModes.includes(gameMode)) {
            this.GameMode =  require(__dirname + '/gamemodes/' + gameMode);
            this.rules = new this.GameMode.rules;

            console.log('changed gamemode to: ');
            console.log(this.GameMode.baseInfo());

            // send new gamemode and rules to all players
            this.players.forEach((p) => {
                p.updateLobbyInfo( {
                    type: 'gamemode',
                    data: this.GameMode.baseInfo()
                });
                this.sendRulesToPlayer(p);
            });
        } else {
            throw 'gamemode_not_available';
        }
    }

    // start the game
    startGame() {
        if (this.players.length < this.rules.min_players) {
            throw 'not_enough_players';
        } else if (this.GameMode === null) {
            throw 'no_gamemode_set';
        } else if (this.gameRunning) {
            throw 'game_already_running';
        } else {
            this.GameMode.canStart(this); // throws error if not possible

            this.gameRunning = true;
            this.gameModeObjekt = new this.GameMode(this);
            console.log('Lobby ' + this.id + ' started game with gamemode ' + this.GameMode.name);
            this.players.forEach((p) => {
                // init gamemode for player
                this.gameModeObjekt.init(p.socket);

                // send gamemode to player
                p.updateLobbyInfo( {
                    type: 'gameStart'
                });
                console.log('send gamemode to ' + p.username);
            });
            // start first round
            this.gameModeObjekt.startGame();
        }
    }


    endGame() {
        if (this.gameRunning) {
            this.gameRunning = false;
            this.gameModeObjekt.delete();
            this.gameModeObjekt = null;
            const playerSortedScore = this.players.sort((a, b) => b.points - a.points);
            this.players.forEach((p) => {
                p.socket.emit('gameEnd', {
                    data: {
                        place_1: playerSortedScore[0] ? playerSortedScore[0].getScoreInfo() : null,
                        place_2: playerSortedScore[1] ? playerSortedScore[1].getScoreInfo() : null,
                        place_3: playerSortedScore[2] ? playerSortedScore[2].getScoreInfo() : null
                    }
                });
            });
            this.players.forEach((p) => {
                p.resetGame();
            });
            console.log('Lobby ' + this.id + ' ended game');
            this.sendPlayersToAll();
        }
    }

    _bringPlayerUpToDate(player) {
        console.log('bring player up to date: ' + player.username);
        // assertion: player need lobby info
        // send rules to new player
        this.sendRulesToPlayer(player);

        // send gamemode to new player
        player.updateLobbyInfo( {
            type: 'gamemode',
            data: this.GameMode.baseInfo()
        });

        if (this.gameRunning) {
            // init gamemode for new player
            this.gameModeObjekt.init(player.socket);

            this._emitRelevantGameInfo(player);

            console.log('bring player up to date: ' + player.username);
        }
    }

    sendRulesToPlayer(player) {
        player.updateLobbyInfo( {
            type: 'rules',
            data: this.rules.getInfo()
        });
    }

    _emitRelevantGameInfo(player) {
        // assertion: game is running
        player.updateLobbyInfo( {
            type: 'gameStart'
        });

        player.socket.emit('lobbyInfo', {
            type: 'round',
            data: {
                round: this.gameModeObjekt.round
            }
        });

        this.gameModeObjekt.bringPlayerUpToDate(player);
    }

    _setNewOwnerIfNecessary(playerObj) {
        // set player inactive, just to be sure
        playerObj.isActive = false;
        
        // check if player is owner
        if (playerObj.isEquals(this.owner)) {
            // check if there are other active players
            if (this.players.some((p) => p.isActive)) {
            // set new owner
                let newOwner;
                let i = 0;
                do {
                    newOwner = this.players[i++];
                } while ((newOwner.isEquals(playerObj) || newOwner.isActive) && i < this.players.length);

                // sanity check
                if (newOwner === undefined) {
                    throw 'error_while_setting_new_owner';
                }

                this.owner.role = 'player';
                this.makeOwner(newOwner);
            } else {
            // check if there are other players
                if (this.players.length > 1) {
                    this.owner.role = 'player';
                    this.owner = undefined;
                } else {
                    playerObj.lobbyLogic.oldLobby = this;
                }
            }
            //playerObj.lobbyLogic.lobby = null;
        }
    }

    _setToOwnerIfNecessary(player) {
        // check if lobby is empty
        if (this.players.length == 0) {
            // clear old lobby from old owner
            this.owner.lobbyLogic.oldLobby = null;
            this.owner.role = 'player';

            // set new owner
            this.makeOwner(player);
        }
        // check if lobby has no owner
        if (this.owner === undefined) {
            this.makeOwner(player);
        }

        // check if lobby is on a countdown
        if (this.countdown !== null) {
            clearTimeout(this.countdown);
            this.countdown = null;
        }
    }

    makeOwner(player) {
        this.owner = player;
        this.owner.role = 'owner';
    }

    sendPlayersToAll() {
        this.players.forEach((p) => {
            if (p.isActive) {
                p.updateLobbyInfo( {
                    type: 'playerList',
                    data: this.players.map((m) => m.toSend())
                });
            }
        });
    }


    delete() {
        try {
            this.players.forEach((p) => {
                p.lobbyLogic.lobby = null;
                p.lobbyLogic.oldLobby = null;

                if (this.gameRunning) {
                    // if in active game, remove game handler
                    this.gameModeObjekt.deInit(p.socket);
                }
            });
            this.owner.lobbyLogic.oldLobby = null;
        } catch (err) {
            console.error('Error while deleting lobby: ' + err);
        }
        this.players = null;
        this.owner = null;
        this.rules = null;

        if (this.gameRunning) {
            this.gameRunning = false; // to prevent error in gameModeObjekt
            this.gameModeObjekt.delete();
            this.gameModeObjekt = null;
        }

        // stop countdown
        if (this.countdown !== null) {
            clearTimeout(this.countdown);
            this.countdown = null;
        }
        
        // delete lobby from lobbys
        this.allLobbys.delete(this.id);

        console.log('Lobby deleted: ' + this.id);
    }
}

module.exports = Lobby;