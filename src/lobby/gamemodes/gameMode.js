// Parent Class for all GameModes
const extra = require('../../extra.js');
const BasicGuessing = require('../../guessing/basicGuessing.js');
//const BasicScoring = require('../../scoring/basicScoring.js');
const TimedScoring = require('../../scoring/timedScoring.js');

class GameMode {
    static name = 'GameMode';
    static description = 'No description available';
    static rules = null;

    static baseInfo() {
        return {
            name: this.name,
            description: this.description
        };
    }

    static canStart(/*lobby*/) {
        throw 'can_start_not_implemented';
    }

    constructor(lobby) {
        const Lobby = require('../lobby.js');
        if ((lobby instanceof Lobby) === false) {
            throw 'cant_create_gamemode_without_lobby';
        }
        this.lobby = lobby;
        this.players = lobby.players;
        this.rules = lobby.rules;
        
        this.guessingLogic = new BasicGuessing(this);
        this.pointLogic = new TimedScoring(this);

        // name and description of the GameMode (for User)
        this.name = GameMode.name;
        this.description = GameMode.description;

        // round specific variables
        this.round = 1;

        this.activePlayer = null; // his turn

        this.song_id = null;
        this.songName = null;
        this.artistsId = null;
        this.artistNames = null;
        this.playBackStart = null;
        this.songStart = null;
        this.albumCover = null;

        this.guessingTimer = null;  // is setTimeout object 
        this.timerRunTime = 0;
        this.guessTimeStartDate = null; // only set when song is running

        this.gameRunning = false;
    }

    // methods that can be overwritten by child classes but only with super()

    init(socket) {
        this.deInit(socket); // to be sure that there are no double listeners

        socket.on('songGuess', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                this.sendSongMessage(socket, data, callback);
            }
        });

        socket.on('artistGuess', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                this.sendArtistMessage(socket, data, callback);
            }
        });

        socket.on('selectedSong', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                this.selectedSong(socket, data, callback);
            }
        });
    }

    deInit(socket) {
        socket.removeAllListeners('songGuess');
        socket.removeAllListeners('artistGuess');
        socket.removeAllListeners('selectedSong');
    }

    delete() {
        if (this.guessingTimer !== null) {
            clearTimeout(this.guessingTimer);
            this.guessingTimer = null;
        }
        this.gameRunning = false;
        this.players = null;
        this.lobby = null;
        this.activePlayer = null;
    }

    // general methods for all GameModes

    sendMessage(socket, data, callback, type, player) {
        if (extra.elementNotExisting(data.guess)) {
            callback({error: 'no_guess'});
            return;
        } else if (data.guess.trim() === '') {
            callback({error: 'no_guess'});
            return;
        } else if (data.guess.length > 100) {
            callback({error: 'guess_too_long'});
            return;
        }
        if (this.guessTimeStartDate === null) {
            callback({error: 'inbetween_rounds'});
            return;
        }

        if(!player.canGuess()) {
            callback({error: 'do_not_spam'});
            return;
        }

        let optimal = '';
        
        let guess, close;
        if (type === 'song') {
            [guess, optimal] = this.guessingLogic.guessSong(data.guess);
            close = this.guessingLogic.isSongClose(data.guess);
        } else if ( type === 'artist') {
            [guess, optimal] = this.guessingLogic.guessArtist(data.guess);
            close = this.guessingLogic.isArtistClose(data.guess);

            // check if artist was already guessed
            if (guess && player.guessedArtistList.has(optimal)) {
                callback({error: 'already_got_artist'});
                return;
            }
        }

        if (guess) {
            // user guessed right
            this.players.forEachActive((player) => {
                player.socket.emit(type + 'Message', {
                    username:  null, 
                    nickname: null,
                    message: 'User ' + getUserString(socket) + ' guessed the ' + type + '!',
                    info: 'guessed'
                });
            });

            if (type === 'song') {
                player.guessedSong = true;
                player.points += this.pointLogic.guessedSong(player);
            } else if (type === 'artist') {
                // check if artist was already guessed
                
                player.guessedArtist = true;
                player.guessedArtistList.add(optimal);
                if (player.guessedArtistList.size === this.artistNames.length) {
                    player.guessedAllArtists = true;
                }
                player.points += this.pointLogic.guessedArtist(player);
            }

            if (player.guessedSong && player.guessedAllArtists) { // TODO: Decide if all artists or only one artist is needed
                // user guessed both
                player.points += this.pointLogic.pointsForAllRight();

                callback({
                    correct: true,
                    optimal: optimal,
                    song_id: this.song_id,
                    song_name: this.songName,
                    artists_names: this.artistNames,
                    album_cover: this.albumCover
                });

                // check if all players have guessed both
                if(this.players.every((player) => { return player.guessedSong && player.guessedAllArtists; })) {
                    // all players have guessed both
                    this.turnEnd();
                    return;
                }

            } else {
                callback({
                    correct: true,
                    optimal: optimal
                });
            }

            // send new player info to all players
            this.lobby.sendPlayersToAll();

        } else if (close) {
            // user guessed close
            this.players.forEachActive((player) => {
                if ((type === 'song' && player.guessedSong) || (type === 'artist' && player.guessedAllArtists)) {
                    player.socket.emit(type + 'Message', {
                        username: socket.user.username,
                        nickname: socket.user.nickname,
                        message: '\'' + data.guess + '\' is close!',
                        info: 'close'
                    });
                }
            });
            player.socket.emit(type + 'Message', {
                username: null,
                nickname: null,
                message: '\'' + data.guess + '\' is close!',
                info: 'close'
            });

            callback({
                correct: false,
                close: true
            });
        } else {
            this.players.forEachActive((player) => {
                player.socket.emit(type + 'Message', {
                    username: socket.user.username,
                    nickname: socket.user.nickname,
                    message: data.guess
                });
            });

            callback({
                correct: false,
                close: false
            });
        }
    }

    sendArtistMessage(socket, data, callback){
        let player;
        try {
            player = this.baseCheckAndGetPlayer(data, socket);
        } catch (err) {
            if (err instanceof Error) {
                console.error(err);
                callback({error: 'unknown_error'});
                return;
            } else {
                callback({error: err});
                return;
            }
        }
        if (player.guessedAllArtists) {
            this.players.forEachActive((player) => {
                if (player.guessedAllArtists) {
                    player.socket.emit('artistMessage', {
                        username: socket.user.username,
                        nickname: socket.user.nickname,
                        message: data.guess,
                        info: 'already_guessed'
                    });
                }
            });
            callback({error: 'already_guessed'});
            return;
        }
        return this.sendMessage(socket, data, callback, 'artist', player);
    }

    sendSongMessage(socket, data, callback){
        let player;
        try {
            player = this.baseCheckAndGetPlayer(data, socket);
        } catch (err) {
            if (err instanceof Error) {
                console.error(err);
                callback({error: 'unknown_error'});
                return;
            } else {
                callback({error: err});
                return;
            }
        }
        if (player.guessedSong) {
            this.players.forEachActive((player) => {
                if (player.guessedSong) {
                    player.socket.emit('songMessage', {
                        username: socket.user.username,
                        nickname: socket.user.nickname,
                        message: data.guess,
                        info: 'already_guessed'
                    });
                }
            });
            callback({error: 'already_guessed'});
            return;
        }
        return this.sendMessage(socket, data, callback, 'song', player);
    }

    baseCheckAndGetPlayer(data, socket) {
        // sanitize input
        if (extra.elementNotExisting(data.guess) || data.guess.trim() === '') {
            throw 'no_guess';
        }
        data.guess = extra.sanitizeString(data.guess);

        let player = this.players.find((player) => player.socket.user.id === socket.user.id);
        if (player === undefined) {
            console.error('player not found');
            throw 'player_not_found';
        }
        if (this.activePlayer.isEquals(player)) {
            throw 'you_selected_song_you_cant_guess';
        }
        return player;
    }


    baseInfo(){
        return {
            name: this.name,
            description: this.description,
        };
    }

    roundInfo(){
        return {
            song_id: this.song_id,
            playback_start: this.playBackStart,
            song_start: this.songStart
        };
    }

    playerLeft(player) {

        this.playerInactive(player);

        console.log('player left: ' + player.username);
        console.log(this.players.map((player) => player.username));

    }

    playerInactive(player) {
        // check if player is active player
        if (this.activePlayer.isEquals(player)) {
            // to prevent the game form being stuck until the player reconnects
            this.nextRound();
        }

        // check if enough players are left
        if (this.players.filter((player) => player.isActive).length < this.rules.min_players) {
            // not enough players to continue
            this.pauseGame();
        }

        console.log('player inactive: ' + player.username);
        console.log(this.players.map((player) => player.username));
    }

    bringPlayerUpToDate(player) {
        // send round info to new player
        // user Timerto decide if lobby is selecting song or guessing
        if (this.guessingTimer !== null) {
            // send guessing info
            player.socket.emit('selectedSong', this.roundInfo(player));
        } else {
            // send selecting info
            if (this.activePlayer.isEquals(player)) {
                player.socket.emit('yourTurn');
            }
            player.socket.emit('isSelecting', {
                username: this.activePlayer.username,
                nickname: this.activePlayer.nickname
            });
        }
    }

    startGame() {
        // reset all players
        this.players.forEach((player) => {
            player.resetGame();
        });
        // start game
        this.round = 1;

        // start first round
        this.nextTurn();

        this.gameRunning = true;
    }


    // methods that can be overwritten by child classes

    nextRound() {
        if (!(this.players.every((player) => player.hadTurn || !player.isActive))) {
            this.nextTurn();
        } else {
            // next round
            this.round++;
            if (this.round > this.rules.rounds) {
                // game is over
                this.lobby.endGame();
            } else {
                // sent round info to all players
                this.players.forEach((player) => {
                    if (player.isActive) {
                        player.socket.emit('lobbyInfo', {
                            type: 'round',
                            data: {
                                round: this.round
                            }
                        });
                    }

                    player.resetRound();
                });
                // start next round

                this.nextTurn();
            }
        }

    }

    nextTurn() {
        // check what players are avaible
        const avaiblePlayerList = this.players.filter((player) => player.isActive && !player.hadTurn);
        if (avaiblePlayerList.length === 0) {
            // check if all players are inactive
            if (this.players.every((player) => !player.isActive)) {
                // all players are inactive
                this.pauseGame();
            } else {
                // all active players had their turn
                this.turnEnd();
            }
            return;
        }
        if (this.players.filter((player) => player.isActive).length < this.rules.min_players) {
            // not enough players to continue
            this.pauseGame();
            return;
        }

        this.activePlayer = this.getNextActivePlayer(avaiblePlayerList, this.activePlayer);
        this.activePlayer.hadTurn = true;

        // notify active player
        this.activePlayer.socket.emit('yourTurn');
        console.log('active player: ' + this.activePlayer.username);

        // notify other players
        this.players.forEach((player) => {
            if (player !== this.activePlayer && player.isActive) {
                player.socket.emit('isSelecting', {
                    username: this.activePlayer.username,
                    nickname: this.activePlayer.nickname
                });
            }

            // reset player
            player.resetTurn();
        });

        // Prevents the Active Player from guessing
        this.activePlayer.guessedArtist = true;
        this.activePlayer.guessedAllArtists = true;
        this.activePlayer.guessedSong = true;
    }

    getNextActivePlayer(avaiblePlayerList, activePlayer) {
        let newActivePlayer;
        if (avaiblePlayerList.length === 1) {
            // only one player left
            return avaiblePlayerList[0];
        }
        do {
            // get random player
            newActivePlayer = avaiblePlayerList[Math.floor(Math.random() * avaiblePlayerList.length)];
        } while (newActivePlayer.isEquals(activePlayer));
        return newActivePlayer;
    }

    selectedSong(socket, data, callback) {
        console.log('selectedSong');
        // test if user is active player
        if (this.activePlayer.socket !== socket) {
            callback({error: 'not_your_turn'});
            return;
        }

        // test if song is valid
        if (extra.elementNotExisting(data.song_id)) {
            callback({error: 'no_song'});
            return;
        }
        // test if song_start is valid
        if (extra.elementNotExisting(data.song_start)) {
            callback({error: 'no_song_start'});
            return;
        }
        if (data.song_start < 0) {
            callback({error: 'song_start_too_small'});
            return;
        }


        // get uses provider and test if song is valid
        for (let provider of socket.provider) {
            if (provider.name == 'Spotify') {
                console.log('provider found', provider.name);
                provider.getSongInfo(data.song_id).then((songInfo) => {
                    if (songInfo.song_id === data.song_id) {
                        console.log('song valid');
                        // song is valid

                        if (songInfo.songDuration < data.song_start) {
                            callback({error: 'song_start_too_big'});
                            return;
                        }

                        this.song_id = songInfo.song_id;
                        this.songName = songInfo.songName;
                        this.artistsId = songInfo.artistsId;
                        this.artistNames = songInfo.artistNames;
                        this.albumCover = songInfo.albumCover;

                        // update guessing logic
                        this.guessingLogic.setNewRound(this.songName, this.artistNames);

                        // set playback start
                        const offset = this.rules.offset * 1000;
                        this.playBackStart = Date.now() + offset;
                        this.songStart = data.song_start;

                        // notify all players
                        this.players.forEachActive((player) => {
                            console.log('send selectedSong to ' + player.username);
                            player.socket.emit('selectedSong', this.roundInfo(player));
                        });

                        // start round timer
                        this.guessingTimer = setTimeout(() => {
                            console.log('round timer ended');
                            this.guessingTimer = null;
                            this.turnEnd();
                        }, this.rules.guessing_time * 1000 + offset);
                        this.guessTimeStartDate = new Date();

                        callback({success: true});
                        return;
                    } else {
                        callback({error: 'song_not_found'});
                        return;
                    }
                }).catch((err) => {
                    console.error(err);
                    callback({error: err});
                    return;
                });

                break;
            }   
        }         
        /*callback({
            error:'no_provider'
        });*/
    }

    turnEnd() {
        console.log('turnEnd for ' + this.activePlayer.username);
        // stop round timer
        clearTimeout(this.guessingTimer);
        this.guessingTimer = null;
        this.guessTimeStartDate = null;

        this.timerRunTime = 0;

        this.activePlayer.points += this.pointLogic.pointsForActivePlayer(this.activePlayer);
        this.lobby.sendPlayersToAll();

        this.pointLogic.newTurn();

        // notify all players
        this.players.forEachActive((player) => {
            player.socket.emit('turnEnd', {
                song_id: this.song_id,
                song_name: this.songName,
                artists_names: this.artistNames.join(', '),
                album_cover: this.albumCover
            });
        });

        // start next round in 10 seconds
        this.guessingTimer = setTimeout(() => {
            this.guessingTimer = null;
            this.nextRound();
        }, 10 * 1000);
    }

    pauseGame() {
        console.log('pause game');
        this.players.forEachActive((player) => {
            player.socket.emit('songMessage', {
                username: null,
                nickname: null,
                message: 'Not enough players to continue. Game paused.'
            });
            player.socket.emit('artistMessage', {
                username: null,
                nickname: null,
                message: 'Not enough players to continue. Game paused.'
            });
        });
        // stop round timer
        this.timerRunTime += (new Date() - this.guessTimeStartDate);
        this.guessTimeStartDate = null;
        clearTimeout(this.guessingTimer);
        this.guessingTimer = null;
        this.gameRunning = false;
    }

    resumeGame() {
        if (this.gameRunning) {
            // game is already running
            return;
        }
        let activePlayerCount = this.players.filter((player) => player.isActive).length;
        if (activePlayerCount < this.rules.min_players) {
            // not enough players to continue
            this.players.forEachActive((player) => {
                player.socket.emit('songMessage', {
                    username: null,
                    nickname: null,
                    message: 'Still not enough players to continue. Game paused.'
                });
                player.socket.emit('artistMessage', {
                    username: null,
                    nickname: null,
                    message: 'Still not enough players to continue. Game paused.'
                });
            });
            return;
        }

        this.players.forEachActive((player) => {
            player.socket.emit('songMessage', {
                username: null,
                nickname: null,
                message: 'Game resumed.'
            });
            player.socket.emit('artistMessage', {
                username: null,
                nickname: null,
                message: 'Game resumed.'
            });
        });

        console.log('unpause game');
        // start round timer
        this.guessingTimer = setTimeout(() => {
            console.log('round timer ended');
            this.turnEnd();
        }, this.timerRunTime);
        this.guessTimeStartDate = new Date();

        this.gameRunning = true;
    }

    // methods that need to be overwritten by child classes


}

Array.prototype.forEachActive = function(callback) {
    //this.filter(player => player.isActive).forEach(callback);
    this.forEach(player => {
        if (player.isActive) {
            callback(player);
        }
    });
};

function getUserString(socket) {
    if (socket.user.nickname !== null) {
        return socket.user.nickname + ' (@' + socket.user.username + ')';
    } else {
        return socket.user.username;
    }
}

module.exports = GameMode;