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
        ]
    };
} else {
    dbOptions = {};
}

const r = require('rethinkdbdash')(dbOptions);

// check if database exists
r.dbList().contains('gts').run().then((exists) => {
    if (!exists) {
        // create database
        console.log('Database not found, creating...');

        r.dbCreate('gts').run().then(() => {
            // create tables
            createTables();
        });
    } else {
        console.log('Database found');
        // create tables
        createTables();
    }
    // database exist
});

function getNeededTables() {
    const path = require('path');
    const fs = require('fs');
    const tables = [];
    const providerPath = path.join(__dirname, '..', 'src', 'provider');
    const providerFiles = fs.readdirSync(providerPath).filter((file) => (file.endsWith('.js') && !file.startsWith('provider.js')));
    for (let i = 0; i < providerFiles.length; i++) {
        const provider = require(path.join(providerPath, providerFiles[i]));
        let neededTables;
        try {
            neededTables = provider.requiredTables;
            if (neededTables === undefined) {
                neededTables = [];
            }
        } catch (err) {
            console.error('Error while trying to get needed tables from provider ' + providerFiles[i] + ': ' + err);
            neededTables = [];
        }
        console.log('Provider ' + providerFiles[i] + ' needs tables: ' + JSON.stringify(neededTables));
        tables.push(...neededTables);
    }
    return tables;
}

function createTables() {
    const neededTables = getNeededTables();
    console.log('Creating tables...');
    // check if tables exist
    let p = [];
    for (let i = 0; i < neededTables.length; i++) {
        p.push(createTable(neededTables[i]));
        // check if table needs secondary indexes
        if (neededTables[i].secondaryIndexes !== undefined) {
            for (let j = 0; j < neededTables[i].secondaryIndexes.length; j++) {
                p.push(createSecondaryIndex(neededTables[i].name, neededTables[i].secondaryIndexes[j]));
            }
        }
    }
    Promise.all(p).then(() => {
        r.getPoolMaster().drain();
    });
}

function createTable(table) {
    // check if table has name
    let name = table.name;
    if (name === undefined) {
        console.error('Table has no name');
        return;
    }
    let primaryKey = table.primaryKey;
    if (primaryKey === undefined) {
        primaryKey = 'id';
    }
    return new Promise((resolve, reject) => {
        r.db('gts').tableList().contains(name).run().then((exists) => {
            if (!exists) {
                // create table
                r.db('gts').tableCreate(name, { primaryKey: primaryKey }).run().then(() => {
                    console.log('Table ' + name + ' created');
                });
            } else {
                console.log('Table ' + name + ' already exists');
            }
            resolve();
        }).catch((err) => {
            console.error('Error while trying to check if table ' + name + ' exists: ' + err);
            reject();
        });
    });
}

function createSecondaryIndex(table, index) {
    return new Promise((resolve, reject) => {
        r.db('gts').table(table).indexList().contains(index).run().then((exists) => {
            if (!exists) {
                // create index
                r.db('gts').table(table).indexCreate(index).run().then(() => {
                    console.log('Secondary index ' + index + ' created');     
                    resolve();
                });
            } else {
                console.log('Secondary index ' + index + ' already exists');
                resolve();
            }
        }).catch((err) => {
            console.error('Error while trying to check if index ' + index + ' exists: ' + err);
            reject();
        });
    });
}

