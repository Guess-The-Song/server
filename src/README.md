# This is a small Documentaion of all the Socket.emit() and Socket.on() events as used in the server

## Socket.on() events

### General

<details>
    <summary>connect</summary>

`'connect'`
> This event is emitted when the client connects to the server
</details>

<details>
    <summary>disconnect</summary>

`'disconnect'`
> This event is emitted when the client disconnects from the server, this can be caused by the client or the server\
> Client can disconnect by calling `socket.disconnect()`
</details>

### Login Process

<details>
    <summary>auth</summary>

`'auth', (data, callback)`
- data:
    ```javascript
    {
        token: string
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            username: string,
            nickname: string,
            provider: string, // name of the provider
            ... // provider specific data
        }
        ```
> This event is emitted to the server when the client wants to authenticate with a token

</details>

#### Spotify

<details>
    <summary>authorizationCode</summary>

`'authorizationCode', (data, callback)`
- data:
    ```javascript
    {
        code: string,
        state: string,
        storedState: string
    }
    ```
- callback: 
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        // if the user is new
        {
            spotify_exists: false,
            display_name: string,
            product: string
        }
        // if the user already exists
        {
            spotify_exists: true,
            username: string,
            nickname: string,
            product: string,
            token: string // auth token
        }
        ```
</details>

<details>
    <summary>getAccessToken</summary>

`'getAccessToken', (callback)`
- callback: 
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            access_token: string
        }
        ```
</details>

<details>
    <summary>setPlaylistId</summary>

`'setPlaylistId', (data, callback)`
- data:
    ```javascript
    {
        playlist_id: string
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            success: true
        }
        ```
</details>

<details>
    <summary>getPlaylistId</summary>

`'getPlaylistId', (callback)`

- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            playlist_id: string
        }
        ```
</details>

#### User (Our User)

<details>
    <summary>register</summary>

`'register', (data, callback)`
- data:
    ```javascript
    {
        username: string,
        nickname: string
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            success: true,
            username: string,
            nickname: string
        }
        ```
</details>

<details>
    <summary>changeUsername</summary>

`'changeUsername', (data, callback)`
- data:
    ```javascript
    {
        username: string
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            success: true
        }
        ```
</details>

<details>
    <summary>changeNickname</summary>

`'changeNickname', (data, callback)`
- data:
    ```javascript
    {
        nickname: string
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            success: true
        }
        ```
</details>

<details>
    <summary>removeAccount</summary>

`'removeAccount', (callback)`
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            success: true
        }
        ```
</details>

#### Friends

<details>
    <summary>addFriend</summary>

`'addFriend', (data, callback)`
- data:
    ```javascript
    {
        user_id: string //get for searchUser
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            success: true
        }
        ```
</details>

<details>
    <summary>acceptFriend</summary>

`'acceptFriend', (data, callback)`
- data:
    ```javascript
    {
        user_id: string
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            success: true
        }
        ```
</details>

<details>
    <summary>removeFriend</summary>

`'removeFriend', (data, callback)`

- data:
    ```javascript
    {
        user_id: string
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            success: true
        }
        ```
> Also used to decline a friend request or cancel a friend request
</details>

<details>
    <summary>searchUser</summary>

`'getFriends', (callback)`
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            friends: [
                {
                    user_id: string,
                    username: string,
                    nickname: string
                },
                ...
            ],
            requests: [
                {
                    user_id: string,
                    username: string,
                    nickname: string
                },
                ...
            ],
            pending: [
                {
                    user_id: string,
                    username: string,
                    nickname: string
                },
                ...
            ]
        }
        ```
</details>

<details>
    <summary>searchUser</summary>

`'searchUser', (data, callback)`
- data:
    ```javascript
    {
        query: string
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            users: [
                {
                    user_id: string,
                    username: string,
                    nickname: string
                },
                ... // limit 10
            ]
        }
        ```
</details>




### Multiplayer

#### Lobby

<details>
    <summary>createLobby</summary>

`'createLobby', (callback)`
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            lobby_id: string
        }
        ```
</details>

<details>
    <summary>lobbyExists</summary>

`'lobbyExists', (data, callback)`
- data:
    ```javascript
    {
        lobby_id: string
    }
    ```
- callback:
    ```javascript
    {
        exists: boolean
    }
    ```
</details>

<details>
    <summary>joinLobby</summary>

`'joinLobby', (data, callback)`
- data:
    ```javascript
    {
        lobby_id: string
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            success: true
        }
        ```
</details>

<details>
    <summary>leaveLobby</summary>

`'leaveLobby', (callback)`
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            success: true
        }
        ```
</details>

<details>
    <summary>ready</summary>

`'ready', (data, callback)`
- data:
    ```javascript
    {
        ready: boolean
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            success: true,
            status: string // is set if something went wrong while trying to start the game
        }
        ```
</details>

<details>
    <summary>changeRules</summary>

`'changeRules', (data, callback)`
- data:
    ```javascript
    {
        rules: {
            key: string,
            value: string | number | boolean
        }
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
            {
                success: true
            }
        ```
</details>

<details>
    <summary>kickPlayer</summary>

`'kickPlayer', (data, callback)`
- data:
    ```javascript
    {
        username: string,
        nickname: string // person that initiated the kick
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            success: true
        }
        ```
</details>

#### Ingame

<details>
    <summary>artistMessage</summary>

`'artistGuess', (data, callback)`

- data:
    ```javascript
    {
        guess: string
    }
    ```
- callback:
   - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            correct: boolean,
            close: boolean, // if wrong but close
            optimal: string, // optimal artist, to be displayed to the user
            song_id: string, // if song and artist are correct
        }
        ```
</details>

<details>
    <summary>songMessage</summary>

`'songGuess', (data, callback)`

- data:
    ```javascript
    {
        guess: string
    }
    ```
- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        {
            correct: boolean,
            close: boolean, // if wrong but close
            optimal: string, // optimal song, to be displayed to the user
            song_id: string, // if song and artist are correct
        }
        ```
</details>

<details>
    <summary>selectedSong</summary>

`'selectedSong', (data, callback)`
- data:
    ```javascript
    {
        song_id: string,
        song_start: number
    }
    ```

- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        { 
            success: true
        }
        ```
> This event is emitted to the server when the player who's turn it is selects a song
</details>

<details>
    <summary>setInactive</summary>

`'setInactive', (callback)`

- callback:
    - error:
        ```javascript
        { 
            error: string
        }
        ```
    - success:
        ```javascript
        { 
            success: true
        }
        ```

</details>


## Socket.emit() events

### General

<details>
    <summary>hello</summary>

`'hello', (data)`
- data:
    ```javascript
    {
        servre_id: string,
    }
    ```
> This event is emitted to the client when the client connects to the server
</details>

### Login Process

#### Friends

<details>
    <summary>friendUpdate</summary>

`'friendUpdate', (data)`
- data:
    ```javascript
    {
        type: string, // 'reject', 'accept', 'request', 'remove', 'withdraw'
        user: {
            user_id: string,
            username: string,
            nickname: string
        }
    }

</details>


### Multiplayer

#### Lobby

<details>
    <summary>lobbyInfo</summary>

`'lobbyInfo', (data)`
- data:
    -   <details>
            
        <summary>players changed:</summary>

        ```javascript
        {
            type: 'playerList',
            data: [
                {   
                    id: string,
                    username: string,
                    nickname: string
                    
                },
                ...
            ]
        }
        ```
        </details>
    -   <details>
            
        <summary>rules changed:</summary>

        ```javascript
        {
            type: 'rules',
            data: [
                {
                    key: string,
                    value: string | number | boolean,
                    description: string,
                    type: string // 'string' | 'number' | 'boolean'
                },
                ...
            ]
        }
        ```
        </details>

    -   <details>
                
        <summary>Gamemode changed:</summary>
    
        ```javascript
        {
            type: 'gamemode', // indicates that the game started
            data: {
                ...
            }
        }
        ```
        </details>
    -   <details>
                
        <summary>Player kicked:</summary>
    
        ```javascript
        {
            type: 'kicked',
            data: {
                player_name: string // player that initiated the kick
            }
        } // this is only emitted to the player that got kicked
        ```
        </details>

    -   <details>
                    
            <summary>gameStart:</summary>
        
            ```javascript
            {
                type: 'gameStart'
            }
            ```

    -   <details>
                    
        <summary>Current Round</summary>
        
        ```javascript
        {
            type: 'round',
            data: {
                round: number
            }
        }
        ```
        </details>

> This event is emitted to all players in the lobby when the lobby info changes
</details>


### Ingame

<details>
    <summary>artistMessage</summary>

`'artistMessage', (data)`
- data:
    ```javascript
    {
        username: string, // null if server
        message: string,
        info: string // 'close', 'already_guessed', 'guessed'
    }
    ```
> This event is emitted to all players in the lobby when a player sends a message in the artist input
</details>

<details>
    <summary>songMessage</summary>

`'songMessage', (data)`
- data:
    ```javascript
    {
        username: string, // null if server
        message: string,
        info: string // 'close', 'already_guessed', 'guessed'
    }
    ```
> This event is emitted to all players in the lobby when a player sends a message in the song input
</details>

<details>
    <summary>yourTurn</summary>

`'yourTurn'`
> This event is emitted to the player whos turn to choose a song/artist it is
</details>

<details>
    <summary>isSelecting</summary>

`'isSelecting', (data)`
- data:
    ```javascript
    {
        username: string,
        nickname: string
    }
    ```
> This event is emitted to all players in the lobby when a player is selecting a song/artist
</details>
    
<details>
    <summary>selectedSong</summary>

`'selectedSong', (data)`

- data:
    ```javascript
    {
        song_id: string,
        playback_start: number, // time when the song should start playing
        song_start: number // entry point (in ms) of the song
    }
    ```
> This event is emitted to all players in the lobby when a player selected a valid song
</details>

<details>
    <summary>turnEnd</summary>

`'turnEnd', (data)`

- data:
    ```javascript
    {
        song_id: string,
        song_name: string,
        artists_names: string[].join(', '), // so a string
        album_cover: string // url
    }
    ```
> This event is emitted to all players in the lobby when all player selected the right song and artist or the time ran out
</details>

<details>
    <summary>gameEnd</summary>

`'gameEnd', (data)`

- data:
    ```javascript
    {
        place_1: {
            username: string,
            nickname: string,
            score: number
        },
        place_2: {
            username: string,
            nickname: string,
            score: number
        },
        place_3: {
            username: string,
            nickname: string,
            score: number
        }
    }
    ```
> This event is emitted to all players in the lobby when the game ends
</details>
    