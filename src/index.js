const io = require('socket.io');
const https = require('https');
const http = require('http');
const fs = require('fs');
const Crypto = require('crypto');
const path = require('path');
const extra = require('./extra.js');
const LobbyLogic = require('./lobby/socketLobbyLogic.js');


// Local hosting for testing
let allowNoHttps = true;
let exitOnIncorrectProvider = true;
let exitOnIncorrectGamemode = true;
let server, ioServer, r;
const lobbys = new Map(); // Map of all lobbys (key: lobby id, value: lobby object), but also used to transfer data between lobby and socketLobbyLogic

// TODO: Make start pseudo Singelton
function start() {
    r = databaseSetup();
    return new Promise((resolve) => {
        doesDatabaseExist().then(() => {
            startServer().then(() => {
                resolve();
            });
        });
    });

}

function startServer() {
    // Server setup
    server = serverSetup();

    ioServer = io(server, {
        cors: {
            origin: '*',
        }
    });

    loadGamemodes();

    const provider = getProviders();
    
    const serverId = Crypto.randomBytes(20).toString('hex');
    console.log('Server id: ' + serverId);

    ioServer.on('connection', (socket) => {
        /**
         * everything in here is executed when a client connects
         * e.g. it is bound to the socket 
         */

        // socket variables
        // if socket is currently calucating a 'atomic/locked' operation/function
        socket.busy = false;
        
        // link Provider to socket
        socket.provider = provider;

        // get Event Entry
        socket.eventEntry = [];

        // socket cursors
        socket.cursor = [];


        console.log('Client connected');

        // socket disconnect handler
        socket.on('disconnect', () => {
            if (extra.elementExisting(socket.user.username))
                console.log(socket.user.username + ' disconnected');
            else
                console.log('Client disconnected');
            // delete all related data
            // lobby
            socket.lobbyLogic.onDisconnect(socket);

            // clear all cursors
            /*socket.cursor.forEach((cursor) => {
                cursor.close();
            });*/ // ATM unknown bug
        });

        // initialize all providers
        provider.forEach((p) => { p.init(socket); });

        // initialize lobby
        new LobbyLogic(socket, lobbys);


        // this function is atm for testing purposes only
        socket.on('setData', (data, callback) => {
            function getData(data, elseData) {
                if (data !== undefined)
                    return data;
                else
                    return elseData;
            }
            if (testing) {
                socket.user.id = getData(data.userId, socket.user.id);
                socket.user.username = getData(data.username, socket.user.username);
                socket.user.nickname = getData(data.nickname, socket.user.nickname);
                socket.spotify.id = getData(data.spotifyId, socket.spotify.id);
                if (extra.elementExisting(socket.user.username)) {
                    r.table('users').getAll(socket.user.username, {index: 'username'}).run().then((result) => {
                        if (result.length > 0) {
                            socket.user.id = result[0].id;
                        }
                        extra.extendedLogingLogic(socket, r);
                        callback({success: true});
                    }).catch((err) => {
                        console.error('Error while trying to get user: ' + err.trace);
                        callback({success: false});
                    });
                } else {
                    callback({success: true});
                }
            }
        });


        // say hello to client
        socket.emit('hello', {
            server_id: serverId
        });

    });

    return new Promise((resolve) => {
        server.listen(3000, () => {
            console.log('Server listening on port 3000');
            resolve();
        });
    });
}

function databaseSetup() {
    // Database setup
    const dbConfig = require('../config/rethinkdb.json');
    let dbOptions;

    if (dbConfig.useJson === true) {
        dbOptions = {
            servers: [
                {
                    host: dbConfig.connection.host,
                    port: dbConfig.connection.port
                }
            ],
            db: dbConfig.connection.db,
            silent: silent
        };
    } else {
        dbOptions = {
            db: dbConfig.connection.db,
            silent: silent
        };
    }

    return require('rethinkdbdash')(dbOptions);
}

function serverSetup() {
    // Server setup
    let tmpServer;
    try{
        const httpsConfig = require('../config/https.json');
        const options = {
            key: fs.readFileSync(httpsConfig.key),
            cert: fs.readFileSync(httpsConfig.cert)
        };
        tmpServer = https.createServer(options);
    } catch (err) {
        if (allowNoHttps) {
            console.warn('Could not find HTTPS certificates, using HTTP');
            console.warn('Careful: This is not secure!'),
            tmpServer = http.createServer();
        } else {
            console.error('No HTTPS certificates found, exiting');
            process.exit(1);
        }
    }
    return tmpServer;
}

function doesDatabaseExist() {
    // check if database exists
    return r.dbList().contains('gts').run().then((exists) => {
        if (!exists) {
            console.error('Database not found!');
            process.exit(1);
        } else {
            console.log('Database up and running');
            return;
        }
    }).catch((err) => {
        console.error('Error while trying to check if database exists: ' + err);
        process.exit(1);
    });
}

function getProviders() {
    // Load all classes from folder "provider"
    const providerPath = path.join(__dirname, 'provider');
    const providerFiles = fs.readdirSync(providerPath).filter((file) => (file.endsWith('.js') && !file.endsWith('provider.js')));
    const Provider = require('./provider/provider.js');
    const provider = [];
    for (const file of providerFiles) {
        const tmp = require(path.join(providerPath, file));
        const instance = new tmp(r);
        // test if class is a proper provider
        if (testProvider(instance, Provider, file)) {
            provider.push(instance);
        }
    }

    return provider;
}

function testProvider(instance, Provider, file) {
    function badProviderHandler() { if (exitOnIncorrectProvider) process.exit(1); else return false; }

    if (!(instance instanceof Provider) ) {
        console.error('File ' + file + ' is not a proper provider');
        badProviderHandler();
    } else if (instance.name === undefined) {
        console.error('Provider ' + file + ' has no name');
        badProviderHandler();
    } else if (instance.init === undefined) {
        console.error('Provider ' + file + ' has no init function');
        badProviderHandler();
    } else if (instance.delete === undefined) {
        console.error('Provider ' + file + ' has no delete function');
        badProviderHandler();
    }

    
    let instanceInitResult, instanceDeleteResult;
    try {
        instanceInitResult = instance.init(new Object());
        instanceDeleteResult = instance.delete(new Object());
    } catch (err) {
        // "expected" error if provider trys to use the socket as intended
    }
    if (instanceInitResult !== undefined && instanceInitResult.error === 'not_implemented') {
        console.error('Provider ' + file + ' has no overwritten init function');
        badProviderHandler();
    }
    if (instanceDeleteResult !== undefined && instanceDeleteResult.error === 'not_implemented') {
        console.error('Provider ' + file + ' has no overwritten delete function');
        badProviderHandler();
    }

    console.log('Loaded provider ' + instance.name);
    return true;
}

function loadGamemodes() {
    // Load all classes from folder "gamemodes"
    const gamemodePath = path.join(__dirname, 'lobby', 'gamemodes');
    const gamemodeFiles = fs.readdirSync(gamemodePath).filter((file) => file.endsWith('.js') && !file.endsWith('gameMode.js'));
    const gamemodes = [];
    const Lobby = require('./lobby/lobby.js');
    const Player = require('./lobby/player.js');
    const player = new Player({id: 'test', username: 'test', nickname: 'test', lobbyLogic: new Object(), socket: {emit: () => {}}});
    const GameMode = require('./lobby/gamemodes/gameMode.js');
    const lobby = new Lobby('test', player, ['classic'], lobbys);
    for (const file of gamemodeFiles) {
        const tmp = require(path.join(gamemodePath, file));
        const instance = new tmp(lobby);
        if( testGamemode(instance, GameMode, file)) {
            gamemodes.push(file.split('.')[0]);
        }  
    }
    lobby.delete();
    lobbys.availableGamemodes = gamemodes;
}

function testGamemode(instance, GameMode, file) {
    function badGamemodeHandler() { if (exitOnIncorrectGamemode) process.exit(1); else return false; }

    if (!(instance instanceof GameMode) ) {
        console.error('File ' + file + ' is not a proper gamemode');
        badGamemodeHandler();
    } else if (instance.name === undefined) {
        console.error('Gamemode ' + file + ' has no name');
        badGamemodeHandler();
    } else if (instance.description === undefined) {
        console.error('Gamemode ' + file + ' has no description');
        badGamemodeHandler();
    } else if (instance.init === undefined) {
        console.error('Gamemode ' + file + ' has no init function');
        badGamemodeHandler();
    } else if (instance.deInit === undefined) {
        console.error('Gamemode ' + file + ' has no deInit function');
        badGamemodeHandler();
    } 


    console.log('Loaded gamemode ' + instance.name);
    return true;
}


// Testing stuff

let testing = false, silent = false;

function exitServer() {
    return new Promise((resolve) => {
        if (lobbys !== undefined) {
            lobbys.forEach((lobby) => {
                console.error('Deleting lobby ' + lobby.id);
                lobby.delete();
            });
        }
        let p = [];
        p.push(ioServer.close());
        p.push(server.close());
        Promise.all(p).catch((err) => {
            console.error('Error while closing server: ' + err);
        }).finally(() => {
            r.getPoolMaster().drain().catch((err) => {
                console.error('Error while draining pool: ' + err);
            }).finally(() => {
                resolve();
            });
        });
    });
}

function beQuiet() {
    console.log = function() {};
    silent = true;
}

function setToTesting() {
    testing = true;
    allowNoHttps = true;
}

if (require.main === module) {
    start().then(() => {
        console.log('All systems up and running');
    });
}

module.exports = {
    exitServer: exitServer,
    beQuiet: beQuiet,
    setToTesting: setToTesting,
    start: start,
    getR: () => { return r; }
};