const BasicScoring = require('./basicScoring.js');

class TimedScoring extends BasicScoring {

    constructor(gamemode) {
        super(gamemode);
        this.rules = gamemode.rules;
        this.gamemode = gamemode;
    }
        
    guessedSong() {
        return super.guessedSong() * this.getTimeScallingFactor();
    }

    guessedArtist(player) {
        return super.guessedArtist(player) * this.getTimeScallingFactor();
    }

    pointsForAllRight() {
        return super.pointsForAllRight() * this.getTimeScallingFactor();
    }

    pointsForActivePlayer(/*player*/) {
        return super.pointsForActivePlayer() * 10;
    }

    getTimeDiff() {
        return Math.max(1, Math.round((new Date().getTime() - this.gamemode.guessTimeStartDate.getTime()) / 1000));   
    }

    getTimeScallingFactor() {
        let maxTime = this.rules.guessing_time;
        if (maxTime !== undefined) {
            return Math.max(1, Math.round((maxTime - this.getTimeDiff()) / (maxTime / 30)));
        }
        return Math.max(1, Math.round((60 - this.getTimeDiff()) / 2));
    }
}

module.exports = TimedScoring;