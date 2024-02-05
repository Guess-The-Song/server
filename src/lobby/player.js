const extra = require('../extra.js');
// class for lobby player

class Player {
    constructor(data) {
        this.id = data.id; // id of player
        this.username = data.username; // username of player
        this.nickname = data.nickname; // nickname of player
        this.socket = data.socket; // socket of player
        //this.lobby = data.lobby; // lobby of player
        this.lobbyLogic = data.lobbyLogic; // lobby logic of player (socketLobbyLogic instance)
        this.isActive = true; // indicates if player is active in lobby / game
        this.isReady = false; // indicates if player is ready to start the game
        this.role = 'player'; // role of player // my be a whole rigth class in the future 
        this.points = 0; // points of player
        this.guessedSong = false; // indicates if player has guessed the song
        this.guessedArtist = false; // indicates if player has guessed the artist
        this.guessedAllArtists = false; // indicates if player has guessed all artists
        this.guessedArtistList = new Set(); // list of guessed artists
        this.hadTurn = false; // indicates if player had a turn in the current round
        // rate limit
        this.guessTimestamps = [];
    }

    canGuess() {
        // max 5 guesses in 5 seconds
        const timeFrame = 5000; // 5 seconds
        const maxTries = 5; // 5 tries

        return !extra.rateLimitReached(this.guessTimestamps, timeFrame, maxTries);
    }

    resetTurn() {
        this.guessedSong = false;
        this.guessedArtist = false;
        this.guessedAllArtists = false;
        this.guessedArtistList = new Set();
    }

    resetRound() {
        this.resetTurn();
        this.hadTurn = false;
    }

    resetGame() {
        this.resetTurn();
        this.points = 0;
        this.isReady = false;
    }
        

    isEquals(player) {
        if (player instanceof Player) {
            return this.id == player.id;
        } else {
            return false;
        }
    }

    updateLobbyInfo(data) {
        if (this.isActive) {
            this.socket.emit('lobbyInfo', data);
        }
    }

    delete() {
        // delete player from lobby
        if (this.lobbyLogic !== null && this.lobbyLogic.lobby !== null) {
            this.lobbyLogic.lobby.removePlayer(this.id);
        }

        // to be sure
        this.lobbyLogic = null;
        this.socket = null;
    }

    toSend() {
        return new sendPlayer(this);
    }

    getScoreInfo() {
        return new ScoreInfo(this);
    }
}

class sendPlayer {
    constructor(data) {
        //this.id = data.id;
        this.username = data.username;
        this.nickname = data.nickname;
        this.isReady = data.isReady;
        this.isActive = data.isActive;
        this.role = data.role;
        this.points = data.points;
        this.guessedSong = data.guessedSong;
        this.guessedArtist = data.guessedArtist;
        this.guessedAllArtists = data.guessedAllArtists;
    }
}

class ScoreInfo {
    constructor(data) {
        //this.id = data.id;
        this.username = data.username;
        this.nickname = data.nickname;
        this.points = data.points;
    }
}

module.exports = Player;