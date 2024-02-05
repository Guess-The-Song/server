// "abstract" class for guessing logic

class GuessingLogic {

    constructor() {
        this.masterSong = '';
        this.masterArtists = [];
        // masterArtist and masterSong are the correct values, they need not to be changed
    }

    guessSong(/*guess*/) {
        return [false, this.masterSong];
    }

    isSongClose(/*guess*/) {
        return false;
    }

    guessArtist(/*guess*/) {
        return [false, this.masterArtists[0]];
    }

    isArtistClose(/*guess*/) {
        return false;
    }

    setNewRound(song, artists) {
        this.masterSong = song;
        this.masterArtists = new Array(...new Set(artists));
    }
}

module.exports = GuessingLogic;