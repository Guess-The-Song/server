const GameMode = require('./gameMode.js');
const ClassicRules = require('../rules/classicRules.js');
const BasicGuessing = require('../../guessing/basicGuessing.js');
const TimedScoring = require('../../scoring/timedScoring.js');

class OneRoom extends GameMode{
    static name = 'OneRoom';
    static description = 'One device that plays music (lobby owner), everyone guesses';
    static rules = ClassicRules;

    static canStart(/*lobby*/) {
        true;
    }

    constructor(lobby) {
        super(lobby);
        this.name = OneRoom.name;
        this.description = OneRoom.description;

        this.guessingLogic = new BasicGuessing(this);
        this.pointLogic = new TimedScoring(this);
    }

    nextTurn() {
        this.players.forEach(player => {
            if (player.socket.tmpUser !== null && player.socket.tmpUser) {
                player.hadTurn = true;
            }
        });
        super.nextTurn();
    }

    roundInfo(player) {
        if (this.activePlayer.isEquals(player)) {
            return super.roundInfo(player);
        } else {
            return {};
        }
    }

}

module.exports = OneRoom;