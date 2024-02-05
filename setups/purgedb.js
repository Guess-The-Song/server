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
        db: dbConfig.connection.db
    };
} else {
    dbOptions = {};
}

const r = require('rethinkdbdash')(dbOptions);

// get all tables
function getTables() {
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
        console.log('Provider ' + providerFiles[i] + ' has tables: ' + JSON.stringify(neededTables));
        tables.push(...neededTables);
    }
    return tables;
}

// purge all table data
function purgeTables() {
    console.log('Purging tables...');
    const tables = getTables();
    let promises = [];
    for (let i = 0; i < tables.length; i++) {
        promises.push(r.table(tables[i].name).delete().run());
    }
    return Promise.all(promises);
}

purgeTables().then(() => {
    console.log('Done');
    r.getPoolMaster().drain();
}).catch((err) => {
    console.error('Error while purging tables: ' + err);
    r.getPoolMaster().drain();
});

