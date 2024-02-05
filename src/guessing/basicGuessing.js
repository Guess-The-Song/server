const GuessingLogic = require('./guessingLogic');
const {distance} = require('fastest-levenshtein');

const closeThreshold = 0.8;

class BasicGuessing extends GuessingLogic{
    
    guessSong(songGuess) {
        if (typeof songGuess !== 'string') {
            return false;
        }
        let guess = this.song === transformSong(songGuess);
        return [guess, this.masterSong];
    }

    guessArtist(artistGuess) {
        if (typeof artistGuess !== 'string') {
            return false;
        }
        let gues = this.artists.includes(artistGuess.toLowerCase());
        return [gues, this.masterArtists[this.artists.indexOf(artistGuess.toLowerCase())]];
    }

    isSongClose(songGuess) {
        if (typeof songGuess !== 'string') {
            return false;
        }
        return similarity(this.song, transformSong(songGuess)) > closeThreshold;
    }

    isArtistClose(artistGuess) {
        if (typeof artistGuess !== 'string') {
            return false;
        }
        const dist = closest(artistGuess.toLowerCase(), this.artists); 
        return dist > closeThreshold;
    }

    setNewRound(song, artists) {
        super.setNewRound(song, artists);
        this.song = transformSong(song);
        this.artists = new Array(...new Set(artists.map(artist => artist.toLowerCase())));
    }


}

function transformSong(song) {
    return regexTheHellOutOfIt(song).toLowerCase().trim();
}

function regexTheHellOutOfIt(string) {
    return string.replace(/\s*-.*|\(.*\)|feat.*/gi, '');
    // To explain the regex:
    // \s* - any amount of whitespace
    // -.* - dash followed by anything
    // \(.*\) - parenthesis followed by anything
    // feat.* - feat followed by anything
    // gi - global and case insensitive
    // so in conclusion, it removes anything after a dash or "feat" and inside parenthesis
}

function similarityWithDistance(s1, distance) {
    // s1 has not to be the user guess
    let length = s1.length;
    if (length == 0) {
        return 1.0;
    }
    return (length - distance) / parseFloat(length);
}

function similarity(s1, s2) {
    return similarityWithDistance(s1, distance(s1, s2));
}

function closest (stringToCompareTo, arrayToCompareAgainst) {
    let minDistance = Infinity;
    let minIndex = 0;
    for (let i = 0; i < arrayToCompareAgainst.length; i++) {
        const dist = distance(stringToCompareTo, arrayToCompareAgainst[i]);
        if (dist < minDistance) {
            minDistance = dist;
            minIndex = i;
        }
    }
    let closestElement = arrayToCompareAgainst[minIndex];
    let similarityToElement = similarityWithDistance(closestElement, minDistance);
    return similarityToElement;
}

module.exports = BasicGuessing;