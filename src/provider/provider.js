/**
 * This class is the base class for all providers
 * @class provider
 * @param {string} name - The name of the provider
 * @param {object} r - The rethinkdb object
 * @property {string} name - The name of the provider
 * @method toString - Returns the name of the provider
 * @method init - Initializes the provider. Must be overwritten by the child class
 */
class Provider {
    constructor(name, r = null, primaryTabel = null) {
        this.name = name;
        this._r = r;
        this.primaryTabel = primaryTabel;
    }

    static requiredTables = [];

    toString() {
        return this.name;
    }

    /**
     * Initializes the provider. Must be overwritten by the child class
     * @method init - Must initialize all local variables and calls tied to the socket object
     * @param {object} socket - The socket object
     * @returns {object} - Returns an object with the error property set to 'not_implemented'
     */
    init(/* socket */) {
        return { error: 'not_implemented' };
    }

    /**
     * Deletes the data of the use from all acociated tables
     */
    delete(/* socket */) {
        return { error: 'not_implemented' };
    }

    /**
     * @returns If the given Provider is beeing Used by the User
     */
    isUsed(){
        return false;
    }

    getId(){
        return null;
    }

    setSocketVariables(/*socket, data*/){
        return;
    }

    getSongInfo(/*songId*/){
        return {
            songName: null,
            songId: null,
            artistsName: null,
            artistsId: null,
            songDuration: null
        };
    }

}

module.exports = Provider;