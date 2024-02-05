const Rules = require('./rules.js');

class ClassicRules extends Rules {
    constructor() {
        super();
        
        this.max_players = 4;
        this.max_players_descriptions = 'Number of players';
        this.max_players_type = 'number';
        this.min_players = 2;
        this.min_players_descriptions = 'Minimum number of players needed to start the game';
        this.min_players_type = 'number';
        this.rounds = 10;
        this.rounds_descriptions = 'Number of rounds';
        this.rounds_type = 'number';
        this.guessing_time = 60; // in seconds
        this.guessing_time_descriptions = 'Time to guess the song (in seconds)';
        this.guessing_time_type = 'number';
        this.offset = 3; // in seconds // time between song selection and song start // time to load/buffer song
        this.offset_descriptions = 'Time between song selection and song start (in seconds). Increase if player have bad internet connection';
        this.offset_type = 'number';
    }

    ruleCheck(key, value) {
        // assert: key and value are valid
        if (key === 'max_players') {
            if (value < this.min_players) {
                throw 'decrease_min_players_first';
            }
            if (value >= 100) {
                throw 'be_reasonable';
            }
        }
        if (key === 'min_players') {
            if (value > this.max_players) {
                throw 'increase_max_players_first';
            }
            if (value < 2) {
                throw 'minimum_2_players';
            }
        }
    }
}

module.exports = ClassicRules;