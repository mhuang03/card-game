// Libraries
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const uuid = require('uuid').v4;
const rstring = require('randomstring').generate;

// Game
const CardGame = require('./game.js').CardGame;

// Constants
const publicPath = path.join(__dirname, '/../public');
const port = process.env.PORT || 3000;

// Initiate Server
let app = express();
let server = http.createServer(app);
let io = socketIO(server);
app.use(express.static(publicPath));
app.get('/debug', function(req, res) {
    let info = {};
    for (let r of Object.keys(rooms)) {
        let room = rooms[r];
        let playerIds = [];
        for (let p of room.players) {
            playerIds.push(p.id);
        }
        info[r] = {
            id: room.id,
            name: room.name,
            hostId: room.host.id,
            joinCode: room.joinCode,
            playerIds: playerIds
        }
    }
    res.json(info);
});
io.use((socket, next) => {
    next();
});
server.listen(port, () => {
    console.log(`Server is up on port ${port}.`);
});

// Instance Variables
let rooms = {};
let roomCodes = {};
let players = [];
let tokens = {};

// Lobby Methods
const createRoom = (player, roomName, callback) => {
    let newJoinCode = '';
    while (Object.keys(roomCodes).includes(newJoinCode) || newJoinCode == '') {
        newJoinCode = rstring({
            length: 5,
            readable: true,
            charset: 'alphanumeric',
            capitalization: 'uppercase'
        })
    }
    
    const newRoom = {
        id: uuid(),
        name: roomName,
        host: player,
        joinCode: newJoinCode,
        players: []
    }
    
    rooms[newRoom.id] = newRoom;
    roomCodes[newRoom.joinCode] = newRoom.id;
    player.isHost = true;
    
    joinRoom(player, newRoom, () => {
        console.log(player.id, 'created room', newRoom.name, 'with id', newRoom.id);
        console.log(Object.keys(rooms).length);
        player.emit('youAreHost');
        if (callback) {
            callback();
        }
    });
}

const joinRoom = (player, room, callback) => {
    room.players.push(player);
    player.join(room.id);
    console.log(player.id, 'joined room', room.name, 'with id', room.id);
    player.roomId = room.id;
    
    player.emit('joinRoomSuccess', {
        name: room.name,
        joinCode: room.joinCode
    });

    emitToRoom(room, 'playerCountUpdate', room.players.length);
    if (callback) {
        callback();
    }
}

const leaveRoom = (player, room, callback) => {
    player.leave(room.id);
    
    room.players = room.players.filter((item) => item !== player);
    console.log(player.id, 'left room', room.name, 'with id', room.id);

    if (room.players.length == 0) {
        //remove room from rooms
        delete roomCodes[room.joinCode];
        delete rooms[room.id];
    } else if (player.isHost) {
        let newHost = room.players[0];
        newHost.isHost = true;
        room.host = newHost;
        newHost.emit('youAreHost');
    }
    
    player.roomId = null;
    player.isHost = null;

    emitToRoom(room, 'playerCountUpdate', room.players.length);
    if (callback) {
        callback();
    }
}

// Helpers
const emitToRoom = (room, event, ...args) => {
    for (let p of room.players) {
        p.emit(event, ...args);
    }
}

// Listeners
io.on('connection', (socket) => {
    let token = socket.handshake.auth.token;
    let name = socket.handshake.auth.name;
    let player = undefined;
    if (token) {
        player = tokens[token];
    }

    if (player) {
        player.socket.removeAllListeners();
        player.changeSocket(socket);
        if (name) {
            player.name = name;
        }
    } else {
        if (name) {
            player = new Player(socket, name);
        } else {
            player = new Player(socket);
        }
        players.push(player);
        tokens[player.token] = player;
    }
    
    socket.emit('session', {
        id: player.id,
        token: player.token,
    })

    if (player.name) {
        socket.emit('nameSet', player.name);
    }
    console.log(`User has connected with id ${player.id}.`);
    
    player.addListeners();

    if (player.room) {
        if (player.room.inGame) {
            player.room.game.addListeners(player);
        }
    }
});

class Player {
    constructor(socket, name=undefined, id=uuid(), token=uuid()) {
        this.socket = socket;
        this.id = id;
        this.token = token;
        this.isHost = false;
        if (name) {
            this.name = name;
        }
    }

    on(...args) {
        return this.socket.on(...args);
    }

    emit(...args) {
        return this.socket.emit(...args);
    }

    join(...args) {
        return this.socket.join(...args);
    }

    leave(...args) {
        return this.socket.leave(...args);
    }

    changeSocket(socket) {
        this.socket = socket;
    }

    addListeners() {
        this.on('disconnect', () => {
            if (this.hasOwnProperty('roomId')) {
                if (this.roomId != null) {
                    leaveRoom(this, rooms[this.roomId]);
                }
            }
            console.log('A user has disconnected');
            console.log(Object.keys(roomCodes));
        });
    
        this.on('createRoom', (roomName, callback) => {
            if (this.hasOwnProperty('roomId')) {
                if (this.roomId != null) {
                    this.emit('alreadyInRoom');
                    return;
                }
            }
    
            if (roomName.trim() == '') {
                this.emit('emptyRoomName');
                return;
            }
            
            createRoom(this, roomName, () => {
                let room = rooms[this.roomId];
                console.log(room.id);
                console.log(room.joinCode);
                callback({
                    name: room.name,
                    joinCode: room.joinCode
                });
            });
        });
    
        this.on('joinRoom', (roomCode, callback) => {
            if (this.hasOwnProperty('roomId')) {
                if (this.roomId != null) {
                    this.emit('alreadyInRoom');
                    return;
                }
            }
            
            roomCode = roomCode.toUpperCase();
            let room = rooms[roomCodes[roomCode]];
            
            if (room) {
                if (room.players.length >= 3) {
                    this.emit('roomAlreadyFull');
                    return;
                }
                joinRoom(this, room, () => {
                    callback({
                        name: room.name,
                        joinCode: room.joinCode
                    });
                });
            } else {
                this.emit('noSuchRoom');
            }
        });
    
        this.on('leaveRoom', (callback) => {
            let room = rooms[this.roomId];
            if (this.hasOwnProperty('roomId')) {
                if (this.roomId != null) {
                    if (rooms.hasOwnProperty(this.roomId)) {
                        leaveRoom(this, room, () => {
                            console.log(room.id);
                            console.log(room.joinCode);
                            console.log(roomCodes);
                            this.emit('leaveRoomSuccess');
                            if (callback) {
                                callback();
                            }
                        });
                        return;
                    } else {
                        this.emit('roomDoesNotExist');
                        return;
                    }
                }
            }
            this.emit('notInRoom');
        });
    
        this.on('startGame', (callback) => {
            if (!this.isHost) {
                this.emit('notHost');
                return;
            }
            
            let room = rooms[this.roomId];
        
            if (room.inGame) {
                this.emit('alreadyInGame');
                return;
            }
                
            if (room.players.length < 3) {
                this.emit('notEnoughPlayers');
                return;
            }
    
            // start the game
            room.inGame = true;
            this.game = new CardGame(room);
        });
    
        this.on('setName', (name) => {
            console.log(name);
            this.name = name;
            this.emit('nameSet', name);
        });
    }
}