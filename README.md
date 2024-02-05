# Instrutions for running the server

## Install dependencies

### Node.js

I would personally recommend using [NVM](https://github.com/nvm-sh/nvm) to install Node.js.\
NVM is a version manager for Node.js. It allows you to install multiple versions of Node.js and switch between them.

If you don't want to use NVM, you can download Node.js from [here](https://nodejs.org/en/download/).

### NPM

NPM is installed with Node.js. You can check the version with `npm -v`.

### RETHINKDB

You can download RethinkDB from [here](https://rethinkdb.com/docs/install/).

## Setup

Navigate to the server directory (this directory) and run:
```
npm install
```
This will install all needed dependencies.

My recommendation is to create a new directory for the database in the directory of this project (may come with propper config in the future):
```
mkdir db
```
\
Then you can start RethinkDB with:
```
rethinkdb --directory db
```
or
```
rethinkdb --directory path/to/db
```
This will also start the RethinkDB admin panel on port 8080 (localhost only).

If you want start RethinkDB as a background process, add `--daemon` to the command.

To setup all needed tables in RethinkDB, run:
```
npm run setup_db
```
Make sure RethinkDB is running when you run this command.

## Starting the server

First you need to start RethinkDB (see above).

Then you can start the server with:
```
node index.js
```
or
```
node .
```

## Tested on


- Node.js v18.16.0 and v21.1.0

- NPM v9.6.3 and v10.2.0

- RethinkDB v2.4.3