const extra = require('../extra.js');

// ------------------------------------------------------------------------------------------------------------
const Provider = require('./provider.js');

class Friends extends Provider {
    constructor(r) {
        super('Friends', r, 'friends');
    }

    static requiredTables = [{name: 'friends', secondaryIndexes: ['friend1', 'friend2']}];
    // explaination:
    // friend1 is the user_id of the user who sent the friend request
    // friend2 is the user_id of the user who received the friend request
    // after the friend request is accepted, the data is duplicated with friend1 and friend2 swapped

    // so if one of the datasets is missing, the user sent a friend request or a friend request was sent to the user

    init(socket) {
        
        socket.on('addFriend', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                this.addFriend(socket, data, callback);
            }
        });

        socket.on('acceptFriend', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                this.acceptFriend(socket, data, callback);
            }
        });

        socket.on('removeFriend', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                this.removeFriend(socket, data, callback);
            }
        });

        socket.on('getFriends', (callback) => {
            if (extra.typeCheck(callback, 'function')) {
                this.getFriends(socket, callback);
            }
        });

        socket.on('searchUser', (data, callback) => {
            if (extra.typeCheck(data, 'object', callback, 'function')) {
                this.searchUser(socket, data, callback);
            }
        });


        socket.eventEntry.push(() => {this.setEvents(socket); });
        
    }

    delete(socket) {
        return new Promise((resolve) => {
            this._r.table('friends').getAll(socket.user.id, {index: 'friend1'}).delete().run().then(() => {
                this._r.table('friends').getAll(socket.user.id, {index: 'friend2'}).delete().run().then(() => {
                    resolve();
                }).catch((err) => {
                    console.error('Error while trying to delete friends (dir 1): ' + err.stack);
                    resolve();
                });
            }).catch((err) => {
                console.error('Error while trying to delete friends (dir 2): ' + err.stack);
                resolve();
            });
        });
    }

    _getFriends(userId, socket) {
        let dir1 = this._r.table('friends').getAll(userId, {index: 'friend1'}).filter({friend2: socket.user.id}).limit(1).run();
        let dir2 = this._r.table('friends').getAll(socket.user.id, {index: 'friend1'}).filter({friend2: userId}).limit(1).run();

        return Promise.all([dir1, dir2]);
    }

    addFriend(socket, data, callback) {
        // check if user is logged in
        if (extra.isNotLoggedIn(socket)) { callback({ error: 'not_logged_in' }); return; }

        let userId = data.user_id;

        if (extra.elementNotExisting(userId)) { callback({ error: 'invalid_data' }); return; }

        userId = userId.trim();

        if (userId == null || userId == '') { callback({ error: 'invalid_user_id' }); return; }

        // check if user_id is trying to add himself
        if (userId == socket.user.id) { callback({ error: 'cannot_add_self' }); return; }

        // check if user_id is valid
        this._r.table('users').get(userId).run().then((user) => {
            if (user == null) { callback({ error: 'user_not_found' }); return; }

            // check if user is already friend
            this._getFriends(userId, socket).then((friends) => {
                let dir2 = friends[0][0];
                let dir1 = friends[1][0];

                if (dir1 != null && dir2 != null) { callback({ error: 'already_friends' }); return; }

                if (dir1 != null && dir2 == null) { callback({ error: 'already_sent_request' }); return; }

                if (dir1 == null && dir2 != null) { 
                    // no Idea why you would want to do this, but it's possible
                    // accept the friend request
                    this.acceptFriend(socket, {user_id: userId}, callback);
                    return;
                }

                // add friend request
                this._r.table('friends').insert({
                    friend1: socket.user.id,
                    friend2: userId
                }).run().then(() => {
                    socket.openFriends.add(userId);
                    callback({ success: true });
                    return;
                }).catch((err) => {
                    console.error('Error while trying to add friend: ' + err.stack);
                    callback({ error: 'database_error' });
                });
            }).catch((err) => {
                console.error('Error while trying to get friends: ' + err.stack);
                callback({ error: 'database_error' });
            });
        }).catch((err) => {
            console.error('Error while trying to get user: ' + err.stack);
            callback({ error: 'database_error' });
        });

    }

    acceptFriend (socket, data, callback) {
        // check if user is logged in
        if (extra.isNotLoggedIn(socket)) { callback({ error: 'not_logged_in' }); return; }

        let userId = data.user_id;

        if (extra.elementNotExisting(userId)) { callback({ error: 'invalid_data' }); return; }

        userId = userId.trim();

        if (userId == null || userId == '') { callback({ error: 'invalid_user_id' }); return; }
        if (userId == socket.user.id) { callback({ error: 'invalid_user_id' }); return; }


        // check if user_id is valid
        this._r.table('users').get(userId).run().then((user) => {
            if (user == null) { callback({ error: 'user_not_found' }); return; }

            // check if user is already friend
            this._getFriends(userId, socket).then((friends) => {
                let dir1 = friends[0][0];
                let dir2 = friends[1][0];

                if (dir1 == null) { callback({ error: 'no_request' }); return; }

                if (dir2 != null) { callback({ error: 'already_friends' }); return; }

                // accept friend request
                this._r.table('friends').insert({
                    friend1: socket.user.id,
                    friend2: userId
                }).run().then(() => {
                    socket.openFriends.delete(userId);
                    callback({ success: true });
                    return;
                }).catch((err) => {
                    console.error('Error while trying to accept friend: ' + err.stack);
                    callback({ error: 'database_error' });
                });
            }).catch((err) => {
                console.error('Error while trying to get friends: ' + err.stack);
                callback({ error: 'database_error' });
            });
        }).catch((err) => {
            console.error('Error while trying to get user: ' + err.stack);
            callback({ error: 'database_error' });
        });
    }

    removeFriend (socket, data, callback) {
        // check if user is logged in
        if (extra.isNotLoggedIn(socket)) { callback({ error: 'not_logged_in' }); return; }

        let userId = data.user_id;

        if (extra.elementNotExisting(userId)) { callback({ error: 'invalid_data' }); return; }

        userId = userId.trim();

        if (userId == socket.user.id) { callback({ error: 'invalid_user_id' }); return; }
        if (userId == null || userId == '') { callback({ error: 'invalid_user_id' }); return; }

        // check if user_id is valid
        this._r.table('users').get(userId).run().then((user) => {
            if (user == null) { callback({ error: 'user_not_found' }); return; }

            // check if user is already friend
            this._getFriends(userId, socket).then((friends) => {
                let dir1 = friends[0][0];
                let dir2 = friends[1][0];

                if (dir1 == null && dir2 == null) { callback({ error: 'not_friends' }); return; }

                // remove friend
                let remDir1 = this._r.table('friends').getAll(userId, {index: 'friend1'}).filter({friend2: socket.user.id}).delete().run();
                let remDir2 = this._r.table('friends').getAll(socket.user.id, {index: 'friend1'}).filter({friend2: userId}).delete().run();

                Promise.all([remDir1, remDir2]).then(() => {
                    socket.openFriends.delete(userId);
                    callback({ success: true });
                    return;
                }).catch((err) => {
                    console.error('Error while trying to remove friend: ' + err.stack);
                    callback({ error: 'database_error' });
                });
            }).catch((err) => {
                console.error('Error while trying to get friends: ' + err.stack);
                callback({ error: 'database_error' });
            });
        }).catch((err) => {
            console.error('Error while trying to get user: ' + err.stack);
            callback({ error: 'database_error' });
        });
    }

    getFriends (socket, callback) {
        // check if user is logged in
        if (extra.isNotLoggedIn(socket)) { callback({ error: 'not_logged_in' }); return; }

        this.getFriendsIds(socket).then((result) => {
            let friends = result['friends'];
            let requests = result['requests'];
            let pending = result['pending'];
            if (!(friends instanceof Array && requests instanceof Array && pending instanceof Array)) { 
                console.error('Error while trying to get friend IDs: one is not an array');
                callback({ error: 'database_error' });
                return;
            }

            let friendsInfo = this._r.table('users').getAll(...friends).run();
            let requestsInfo = this._r.table('users').getAll(...requests).run();
            let pendingInfo = this._r.table('users').getAll(...pending).run();

            Promise.all([friendsInfo, requestsInfo, pendingInfo]).then((info) => {
                friendsInfo = info[0].map((friend) => { return new User(friend); });
                requestsInfo = info[1].map((friend) => { return new User(friend); });
                pendingInfo = info[2].map((friend) => { return new User(friend); });

                callback({ friends: friendsInfo, requests: requestsInfo, pending: pendingInfo });
                return;
            }).catch((err) => {
                console.error('Error while trying to get friends: ' + err.stack);
                callback({ error: 'database_error' });
            });
        }).catch((err) => {
            console.error('Error while trying to get friends: ' + err.stack);
            callback({ error: 'database_error' });
        });  
    }

    getFriendsIds (socket) {
        return new Promise((resolve, reject) => {
            // get friends
            let dir1 = this._r.table('friends').getAll(socket.user.id, {index: 'friend1'}).run();
            let dir2 = this._r.table('friends').getAll(socket.user.id, {index: 'friend2'}).run();

            Promise.all([dir1, dir2]).then((friendsData) => {
                let friends = [];
                let requests = [];
                dir1 = new Set(friendsData[0].map((friend) => { return friend.friend2; }));
                dir2 = new Set(friendsData[1].map((friend) => { return friend.friend1; }));

                for (let dir1Id of dir1) {
                    if (dir2.has(dir1Id)) {
                        friends.push(dir1Id);
                        dir2.delete(dir1Id);
                    } else {
                        requests.push(dir1Id);
                    }
                }

                resolve({ friends: friends, requests: requests, pending: Array.from(dir2) });
            }).catch((err) => {
                console.error('Error while trying to get friends: ' + err.stack);
                reject(err);
            });
        });
    }

    searchUser (socket, data, callback) {
        // check if user is logged in
        if (extra.isNotLoggedIn(socket)) { callback({ error: 'not_logged_in' }); return; }

        let query = data.query;

        if (extra.elementNotExisting(query)) { callback({ error: 'invalid_data' }); return; }

        query = query.trim();

        if (query == null || query == '' || query.length < 3 || query.length > 20) { callback({ error: 'invalid_query' }); return; }

        let friends = this.getFriendsIds(socket);
        
        // get all users
        let querryResult = this._r.table('users')
            .filter(user => user('username').match(`(?i)${query}`).or(user('nickname').match(`(?i)${query}`)))
            .limit(10)
            .run();
        
        Promise.all([friends, querryResult]).then((result) => {
            let resultFriends = result[0];
            let resultRequests = result[1];
            let matchedUsers = resultRequests.map((user) => new User(user));
            matchedUsers.map((user) => {
                if (user.user_id == socket.user.id) {
                    user.status = 'self';
                } else if (resultFriends['friends'].includes(user.user_id)) {
                    user.status = 'friend';
                } else if (resultFriends['requests'].includes(user.user_id)) {
                    user.status = 'request';
                } else if (resultFriends['pending'].includes(user.user_id)) {
                    user.status = 'pending';
                } else {
                    user.status = 'none';
                }
            });
            callback({ users: matchedUsers });
            return;
        }).catch((err) => {
            console.error('Error while trying to search users: ' + err.stack);
            callback({ error: 'database_error' });
        });
    }

    setEvents(socket) {
        this.getFriendsIds(socket).then((result) => {
            socket.openFriends = new Set(result['requests'].concat(result['pending']));
            this.eventDir1(socket);
            this.eventDir2(socket);
        }).catch((err) => {
            console.error('Error while trying to get friends: ' + err.stack);
            return;
        });
    }

    eventDir1(socket) {
        this._r.table('friends').between(socket.user.id, socket.user.id, {rightBound: 'closed', index: 'friend1'}).changes({squash: false}).run().then((cursor) => {
            cursor.each((err, row) => {
                if (err) { console.error('Error while listening for friend requests: ' + err.stack); return; }
                //console.error(socket.user.id, socket.openFriends);
                if (row.new_val == null) {
                    // friend request was rejected or friendship was revoked
                    let friendId = row.old_val.friend2;
                    if (socket.openFriends.has(friendId)) {
                        // friend request was rejected
                        socket.openFriends.delete(friendId);
                        this.emitFriendUpdate(socket, 'reject', friendId);
                    } else {
                        // friendship was revoked
                        this.emitFriendUpdate(socket, 'remove', friendId);
                    }
                } else if (row.old_val == null) {
                    // The user generated a friend request
                    return;
                }
            });
            socket.cursor.push(cursor);
        }).catch((err) => {
            console.error('Error while listening for friend requests: ' + err.stack);
            return;
        });
    }

    eventDir2(socket) {
        this._r.table('friends').between(socket.user.id, socket.user.id, {rightBound: 'closed', index: 'friend2'}).changes({squash: false}).run().then((cursor) => {
            cursor.each((err, row) => {
                if (err) { console.error('Error while listening for friend requests: ' + err.stack); return; }

                if (row.new_val == null) {
                    // friendship was revoked or friend request was withdrawn
                    let friendId = row.old_val.friend1;
                    if (socket.openFriends.has(friendId)) {
                        // friend request was withdrawn
                        socket.openFriends.delete(friendId);
                        this.emitFriendUpdate(socket, 'withdraw', friendId);
                    } else {
                        // friendship was revoked
                        // is handled by eventDir1
                        return;
                    }
                } else if (row.old_val == null) {
                    // friend request was accepted or request was sent
                    let friendId = row.new_val.friend1;
                    if (socket.openFriends.has(friendId)) {
                        // friend request was accepted
                        socket.openFriends.delete(friendId);
                        this.emitFriendUpdate(socket, 'accept', friendId);
                    } else {
                        // friend request was sent
                        socket.openFriends.add(friendId);
                        this.emitFriendUpdate(socket, 'request', friendId);
                    }
                }
            });
            socket.cursor.push(cursor);
        }).catch((err) => {
            console.error('Error while listening for friend requests: ' + err.stack);
            return;
        });
    }

    emitFriendUpdate(socket, type, friendId) {
        this._r.table('users').get(friendId).run().then((user) => {
            if (user == null) { return; }

            socket.emit('friendUpdate', {
                type: type,
                user: new User(user)
            });
            return;
        }).catch((err) => {
            console.error('Error while trying to get user: ' + err.stack);
            return;
        });
    }

    
}

class User {
    constructor(data) {
        this.user_id = data.id;
        this.username = data.username;
        this.nickname = data.nickname;
        this.status = 'none';
    }
}

module.exports = Friends;