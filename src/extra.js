// Functions that are used by multiple files

function elementExisting(obj) {
    return obj !== undefined && obj !== null && obj !== '';
}

function elementNotExisting(obj) {
    return !elementExisting(obj);
}

function isLoggedIn(socket) {
    // check if user is logged in
    if (elementNotExisting(socket.user.id)) {
        return false;
    }
    return true;
}

function isLoggedOut(socket) {
    // check if user is not logged in
    return !isLoggedIn(socket);
}

function typeCheck(...s){
    if (s.length % 2 !== 0) {
        return false;
    }
    for (let i = 0; i < s.length; i+= 2) {
        if (typeof s[i] !== s[i+1]) {
            return false;
        }
    }
    return true;
}

function extendedLogingLogic(socket, r){
    if(r); // to avoid eslint error, maybe I need r later
    socket.eventEntry.forEach(element => {
        element();
    });

}

function sanitizeString(str) {
    return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function rateLimitReached(rateArray, timeFrame, maxRate) {
    const now = Date.now();
    for (let i = rateArray.length - 1; i >= 0; i--) {
        if (now - rateArray[i] > timeFrame) {
            rateArray.splice(i, 1);
        }
    }
    
    if (rateArray.length >= maxRate) {
        return true;
    }

    rateArray.push(now);

    return false;
}


module.exports = {
    elementNotExisting: elementNotExisting,
    elementExisting: elementExisting,
    isLoggedIn: isLoggedIn,
    isNotLoggedIn: isLoggedOut,
    isLoggedOut: isLoggedOut,
    isNotLoggedOut: isLoggedIn,
    typeCheck: typeCheck,
    sanitizeString: sanitizeString,
    extendedLogingLogic: extendedLogingLogic,
    rateLimitReached: rateLimitReached
};