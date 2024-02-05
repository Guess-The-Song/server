const ScoringLogic = require('./scoringLogic.js');

class BasicScoring extends ScoringLogic {
    
    constructor(gamemode) {
        super(gamemode);
        this.players = gamemode.players;

        this.numberOfRightSongs = 0;
        this.numberOfRightArtists = 0;
    }
        
    guessedSong() {
        this.numberOfRightSongs++;
        return Math.max(this.players.length *2 - this.numberOfRightSongs, 2);
    }

    guessedArtist(player) {
        this.numberOfRightArtists++;
        if (player.guessedArtistList.size === 1) {
            return Math.max(this.players.length *2 - this.numberOfRightArtists, 2);
        } else {
            return Math.max(this.players.length - this.numberOfRightArtists, 1);
        }
    }

    pointsForAllRight() {
        return 10;
    }

    pointsForActivePlayer(/*player*/) {
        return this.numberOfRightSongs + this.numberOfRightArtists;
    }

    newTurn() {
        this.numberOfRightSongs = 0;
        this.numberOfRightArtists = 0;
    }
}

module.exports = BasicScoring;