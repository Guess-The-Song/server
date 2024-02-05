const extra = require('../../extra.js');
// all possible rules for the lobby

class Rules {

    constructor() {
        this.internal = {
            rateArray : [],
            max_changes: 10,
            timeFrame: 1 // in seconds
        };
    }

    getInfo() {
        const all = Object.keys(this);
        const ruleValues = all.filter(key => !key.endsWith('_descriptions') && !key.endsWith('_type') && !(key === 'internal'));
        return ruleValues.map(key => {
            return {
                key: key,
                value: this[key],
                description: this[key + '_descriptions'],
                type: this[key + '_type']
            };
        });
    }

    ruleCheck(/*key, value*/) {
        // assert: key and value are valid
    }

    rateLimitReached() {
        return extra.rateLimitReached(this.internal.rateArray, this.internal.timeFrame * 1000, this.internal.max_changes);
    }


    changeRule(key, value) {
        if (this.rateLimitReached()) {
            throw 'dont_spam';
        }
        if (this[key] !== undefined) {
            if (key.endsWith('_descriptions') || key.endsWith('_type')) {
                throw 'verry_funny';
            }
            // check if value is valid
            switch (this[key + '_type']) {
            case 'number':
                if (isNaN(value)) {
                    throw 'not_a_number';
                }
                value = Number(value);
                if (value < 1) {
                    throw 'value_too_low';
                }
                break;
            case 'boolean':
                if (typeof value !== 'boolean') {
                    value = value === 'true';
                }
                break;
            case 'string':
                if (typeof value !== 'string') {
                    throw 'not_a_string';
                }
                break;
            default:
                throw 'unknown_type';
            }

            this.ruleCheck(key, value);

            this[key] = value;
            return true;
        } else {
            return false;
        }
    }
}

module.exports = Rules;

let rules = new Rules();
console.log(Object.keys(rules));
console.log(rules.getInfo());