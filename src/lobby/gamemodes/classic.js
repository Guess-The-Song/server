const GameMode = require('./gameMode.js');
const ClassicRules = require('../rules/classicRules.js');
const BasicGuessing = require('../../guessing/basicGuessing.js');
const TimedScoring = require('../../scoring/timedScoring.js');

class Classic extends GameMode{
    static name = 'Classic';
    static description = 'No description available';
    static rules = ClassicRules;

    static canStart(lobby) {
        if(lobby.players.some(player => player.socket.tmpUser)){
            throw 'can\'t_start_with_temp_users';
        }
    }

    constructor(lobby) {
        super(lobby);
        this.name = Classic.name;
        this.description = Classic.description;

        this.guessingLogic = new BasicGuessing(this);
        this.pointLogic = new TimedScoring(this);
    }
}

module.exports = Classic;