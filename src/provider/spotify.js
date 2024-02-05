const axios = require('axios');
const spotifyConf = require('../../config/spotify.json');
const extra = require('../extra.js');

const redirectUri = 'https://gts.thaemisch.com/auth'; // new: https://gts.thaemisch.com/auth, old: https://gts.thaemisch.com/ 
const clientId = spotifyConf.id;
const clientSecret = spotifyConf.secret;

// Will be used later
/*let stateKey = 'spotify_auth_state';

const generateRandomString = (length) => {
    return crypto
        .randomBytes(60)
        .toString('hex')
        .slice(0, length);
};*/

// Logic for Spotify Integration
function initVariables(socket) {
    socket.spotify = {
        id: null,
        access_token: null,
        refresh_token: null,
        expires_at: null,
        last_refresh: null
    };
}

function setVariables(socket, data) {
    socket.spotify.id = data.spotify_id || null;
    socket.spotify.access_token = data.access_token || null;
    socket.spotify.refresh_token = data.refresh_token || null;
    socket.spotify.expires_at = data.expires_at || null;
    socket.spotify.last_refresh = data.last_refresh || null;
    return {
        product: data.product || null
    };
}

function authorizationCode(socket, r, data, callback) {
    // check if user is already logged in
    if (extra.isLoggedIn(socket)) { callback({ error: 'already_logged_in' }); return; }

    // check if user is already trying to authorize
    if (extra.elementExisting(socket.spotify.id)) {
        callback({
            error: 'already_trying_to_authorize'
        });
        return;
    }

    // callback for authorization code to generate spotify access and refresh tokens
    let code = data.code || null;
    let state = data.state || null;
    let storedState = data.storedState || null; // or via cookies

    if (state === null || state !== storedState) {
        callback({
            error: 'state_mismatch'
        });
    } else {
        const postData = new URLSearchParams({
            code: code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code'
        }).toString();

        const authOptions = {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
                'Content-Length': postData.length
            }
        };

        axios.post('https://accounts.spotify.com/api/token', postData, authOptions).then((response) => {
            const data = response.data;
            socket.spotify.access_token = data.access_token;
            socket.spotify.refresh_token = data.refresh_token;
            const expiresIn = data.expires_in; // in seconds
            socket.spotify.expires_at = Date.now() + expiresIn * 1000;

            // get user data from spotify
            axios.get('https://api.spotify.com/v1/me', {
                headers: {
                    'Authorization': 'Bearer ' + socket.spotify.access_token
                }
            }).then((response) => {

                /*    // Example response for my spotify account
                {
                    display_name: 'Julian',
                    external_urls: {
                        spotify: 'https://open.spotify.com/user/uocdb6ix6x2pkeufizbh7s1oz'
                    },
                    href: 'https://api.spotify.com/v1/users/uocdb6ix6x2pkeufizbh7s1oz',
                    id: 'uocdb6ix6x2pkeufizbh7s1oz',
                    images: [],
                    type: 'user',
                    uri: 'spotify:user:uocdb6ix6x2pkeufizbh7s1oz',
                    followers: { href: null, total: 4 },
                    country: 'DE',
                    product: 'premium',
                    explicit_content: { filter_enabled: false, filter_locked: false },
                    email: 'julianoberhofer2@gmail.com'
                }
                */

                const data = response.data;
                socket.spotify.id = data.id; // spotify user id
                const displayName = data.display_name; // spotify user name
                const product = data.product; // spotify product (premium, free, ...)

                // spotify user exists -> activate endpoints
                activateSocketEndpoints(socket, r);

                // check if user is already in database
                r.table('spotify').get(socket.spotify.id).run().then((result) => {
                    if (result === null) {
                        // user is not in database -> add him

                        r.table('spotify').insert({
                            spotify_id: socket.spotify.id,
                            access_token: socket.spotify.access_token,
                            refresh_token: socket.spotify.refresh_token,
                            expires_at: socket.spotify.expires_at,
                            last_refresh: Date.now(),
                            product: product
                        }).run();

                        callback({
                            spotify_exists: false,
                            display_name: displayName,
                            product: product
                        });
                        return;
                    } else {
                        // user is already in database -> update data

                        r.table('spotify').get(socket.spotify.id).update({
                            access_token: socket.spotify.access_token,
                            refresh_token: socket.spotify.refresh_token,
                            expires_at: socket.spotify.expires_at,
                            last_refresh: Date.now(),
                            product: product
                        }).run();

                        // check if spotify is already linked to a user account
                        if (extra.elementExisting(result.user_id)) {
                            // spotify is already linked to a user account -> log in
                            socket.user.id = result.user_id;
                            // get user name from database
                            r.table('users').get(result.user_id).run().then((result) => {
                                // sanity check if some idiot nuked the database (again)
                                if (result === null) {
                                    callback({
                                        spotify_exists: false,
                                        display_name: displayName,
                                        product: product
                                    });
                                    return;
                                } else {
                                    socket.user.nickname = result.nickname;
                                    socket.user.username = result.username;

                                    let Auth = require('./auth.js');
                                    Auth.generateToken(socket, Spotify, socket.spotify.id, r).then((token) => {
                                        callback({
                                            spotify_exists: true,
                                            nickname: result.nickname,
                                            username: result.username,
                                            product: product,
                                            token: token
                                        });
                                        extra.extendedLogingLogic(socket, r);
                                        return;
                                    }).catch((err) => {
                                        console.error('Error while generating token: ' + err.stack);
                                        callback({
                                            spotify_exists: true,
                                            nickname: result.nickname,
                                            username: result.username,
                                            product: product
                                        });
                                        extra.extendedLogingLogic(socket, r);
                                        return;
                                    });
                                    
                                }
                            }).catch((err) => {
                                console.error('Error while getting user name from database: ' + err);
                                callback({
                                    error: 'database_error'
                                });
                                return;
                            });
                        } else {
                            // spotify is not linked to a user account -> register
                            // user probably exited last time before finishing registration
                            callback({
                                spotify_exists: false,
                                display_name: displayName,
                                product: product
                            });
                        }
                    }
                }).catch((err) => {
                    console.error('Error while checking if user is already in database: ' + err);
                    callback({
                        error: 'database_error'
                    });
                    return;
                });
            }).catch((err) => {
                console.error('Error while requesting user data from spotify: ' + err);
                callback({
                    error: 'server_error'
                });
                return;
            });
        }).catch((err) => {
            console.error('Error while requesting access token from spotify: ' + err);
            callback({
                error: 'server_error'
            });
            return;
        });
    }
}


function getAccessToken(socket, r, callback) {
    // check if user is already logged in
    if (extra.isNotLoggedIn(socket)) { callback({ error: 'not_logged_in' }); return; }

    // check if spotify is authorized
    if (extra.elementNotExisting(socket.spotify.id)) {
        callback({
            error: 'spotify_not_authorized'
        });
        return;
    }

    // check if access token is still valid
    if (socket.spotify.expires_at > Date.now()) {
        callback({
            access_token: socket.spotify.access_token
        });
        return;
    }

    // access token is not valid anymore -> refresh it
    const postData = new URLSearchParams({
        refresh_token: socket.spotify.refresh_token,
        grant_type: 'refresh_token'
    }).toString();

    const authOptions = {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
            'Content-Length': postData.length
        }
    };

    axios.post('https://accounts.spotify.com/api/token', postData, authOptions)
        .then((response) => {
            const data = response.data;
            socket.spotify.access_token = data.access_token;
            socket.spotify.refresh_token = data.refresh_token;
            const expiresIn = data.expires_in; // in seconds
            socket.spotify.expires_at = Date.now() + expiresIn * 1000; // in milliseconds

            // update data
            r.table('spotify').get(socket.spotify.id).update({
                access_token: socket.spotify.access_token,
                refresh_token: socket.spotify.refresh_token,
                expires_at: socket.spotify.expires_at,
                last_refresh: Date.now(),
            }).run();

            callback({
                access_token: socket.spotify.access_token
            });
        })
        .catch((error) => {
            console.error('Error while requesting access token from spotify: ' + error);
            callback({
                error: 'server_error'
            });
        });
}

function setPlaylistId(socket, data, callback, r) {
    // check if user is already logged in
    if (extra.isNotLoggedIn(socket)) { callback({ error: 'not_logged_in' }); return; }

    // check if spotify is authorized
    if (extra.elementNotExisting(socket.spotify.id)) {
        callback({
            error: 'spotify_not_authorized'
        });
        return;
    }

    // check if playlist id is valid
    if (extra.elementNotExisting(data.playlist_id)) {
        callback({
            error: 'invalid_playlist_id'
        });
        return;
    }

    // add Id to database
    r.table('spotify').get(socket.spotify.id).update({
        playlist_id: data.playlist_id
    }).run().then((result) => {
        if (result.replaced === 0) {
            console.error('Error while trying to set playlist ID ' + data.playlist_id +  'for spotify ID ' + socket.spotify.id + ': spotify not found');
            callback({
                error: 'spotify_not_found'
            });
            return;
        } else {
            callback({
                success: true
            });
            return;
        }
    }).catch((err) => {
        console.error('Error while trying to set playlist ID ' + data.playlist_id + ' for spotify ID ' + socket.spotify.id + ': ' + err);
        callback({
            error: 'database_error'
        });
        return;
    });
}

function getPlaylistId(socket, callback, r) {
    // check if user is already logged in
    if (extra.isNotLoggedIn(socket)) { callback({ error: 'not_logged_in' }); return; }

    // check if spotify is authorized
    if (extra.elementNotExisting(socket.spotify.id)) {
        callback({
            error: 'spotify_not_authorized'
        });
        return;
    }

    // get Id from database
    r.table('spotify').get(socket.spotify.id).run().then((result) => {
        if (result === null) {
            console.error('Error while trying to get playlist ID: spotify not found for spotify ID ' + socket.spotify.id);
            callback({
                error: 'spotify_not_found'
            });
            return;
        } else {
            callback({
                playlist_id: result.playlist_id
            });
            return;
        }
    }).catch((err) => {
        console.error('Error while trying to get playlist ID: ' + err);
        callback({
            error: 'database_error'
        });
        return;
    });
}

function activateSocketEndpoints(socket, r) {
    socket.on('setPlaylistId', (data, callback) => {
        if (extra.typeCheck(data, 'object', callback, 'function')) {
            setPlaylistId(socket, data, callback, r);
        }
    });

    socket.on('getPlaylistId', (callback) => {
        if (extra.typeCheck(callback, 'function')) {
            getPlaylistId(socket, callback, r);
        }
    });

    socket.on('getAccessToken', (callback) => {
        if (extra.typeCheck(callback, 'function')) {
            getAccessToken(socket, r, callback);
        }
    });
}

// ------------------------------------------------------------------------------
const Provider = require('./provider.js');

// Module class for spotify integration
class Spotify extends Provider {
    constructor(r) {
        super('Spotify', r, 'spotify');

        // init variables
        this._accessToken = null;
        this._expiresAt = null;
        this._lastRefresh = null;
        
        if (clientSecret !== 'YourSecretKey') {
            this.requestTokens();
        } else {
            console.error('Please enter your spotify client secret in config/spotify.json');
        }
    }

    static requiredTables = [{name: 'spotify', primaryKey: 'spotify_id'}];

    init(socket) {
        // init variables
        initVariables(socket);

        // init functions
        socket.on('authorizationCode', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                authorizationCode(socket, this._r, data, callback);
            }
        }); 

        return { success: true }; //TODO: remove this, don't remember why I added it
    }

    delete(socket) {
        return new Promise((resolve, reject) => {
            this._r.table('spotify').get(socket.spotify.id).delete().run().then((result) => {
                if (result.deleted === 0) {
                    console.error('Error while trying to remove spotify ID ' + socket.spotify.id + ': spotify not found');
                    reject('spotify_not_found');
                } else {
                    resolve();
                }
            }).catch((err) => {
                console.error('Error while trying to remove spotify ID ' + socket.spotify.id + ': ' + err);
                reject('database_error');
                return;
            });

            socket.on('getAccessToken', (callback) => {
                if (extra.typeCheck(callback, 'function')) {
                    getAccessToken(socket, this._r, callback);
                }
            });
    
        });
    }

    isUsed(socket) {
        return extra.elementExisting(socket.spotify.id);
    }

    getId(socket) {
        return socket.spotify.id;
    }

    setSocketVariables(socket, data) {
        activateSocketEndpoints(socket, this._r);
        return setVariables(socket, data);
    }

    requestTokens() {
        return new Promise((resolve, reject) => {
            const postData = new URLSearchParams({
                grant_type: 'client_credentials'
            }).toString();

            const authOptions = {
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
                }
            };

            axios.post('https://accounts.spotify.com/api/token', postData, authOptions).then((response) => {
                const data = response.data;
                this._accessToken = data.access_token;
                this._expiresAt = Date.now() + data.expires_in * 1000;
                this._lastRefresh = Date.now();
                resolve();
            }).catch((err) => {
                console.error('Error while requesting access token from spotify: ' + err);
                reject('server_error');
            });
        });
    }

    getAccessToken() {
        let minTime = 1000 * 60 * 5; // 5 minutes
        return new Promise((resolve, reject) => {
            if (this._expiresAt > Date.now() + minTime) {
                resolve(this._accessToken);
            }

            this.requestTokens().then(() => {
                resolve(this._accessToken);
            }).catch((err) => {
                console.error('Error while requesting access token from spotify: ' + err);
                reject('server_error');
            });
        });
    }

    getSongInfo(songId) {
        return new Promise((resolve, reject) => {
            this.getAccessToken().then((accessToken) => {

                const authOptions = {
                    headers: {
                        'Authorization': 'Bearer ' + accessToken
                    }
                };

                axios.get('https://api.spotify.com/v1/tracks/' + songId, authOptions).then((response) => {
                    const data = response.data;
                    resolve({
                        songName: data.name,
                        song_id: data.id,
                        artistNames: data.artists.map((artist) => artist.name),
                        artistsId: data.artists.map((artist) => artist.id),
                        songDuration: data.duration_ms,
                        albumCover: data.album.images[0].url
                    });
                }).catch((err) => {
                    console.error('Error while requesting song info from spotify: ' + err);
                    reject('server_error');
                });
            }).catch((err) => {
                console.error('Error while requesting access token from spotify: ' + err);
                reject('server_error');
            });
        });
    }
}

module.exports = Spotify;
