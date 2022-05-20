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
server.listen(port, () => {
    console.log(`Server is up on port ${port}.`);
});

// Instance Variables
let rooms = {};
let roomCodes = {};

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
    let player = new Player(socket, uuid());
    console.log(`User has connected with id ${player.id}.`);
    
    player.on('disconnect', () => {
        if (player.hasOwnProperty('roomId')) {
            if (player.roomId != null) {
                leaveRoom(player, rooms[player.roomId]);
            }
        }
        console.log('A user has disconnected');
        console.log(Object.keys(roomCodes));
    });

    player.on('createRoom', (roomName, callback) => {
        if (player.hasOwnProperty('roomId')) {
            if (player.roomId != null) {
                player.emit('alreadyInRoom');
                return;
            }
        }

        if (roomName.trim() == '') {
            player.emit('emptyRoomName');
            return;
        }
        
        createRoom(player, roomName, () => {
            let room = rooms[player.roomId];
            console.log(room.id);
            console.log(room.joinCode);
            callback({
                name: room.name,
                joinCode: room.joinCode
            });
        });
    });

    player.on('joinRoom', (roomCode, callback) => {
        if (player.hasOwnProperty('roomId')) {
            if (player.roomId != null) {
                player.emit('alreadyInRoom');
                return;
            }
        }
        
        roomCode = roomCode.toUpperCase();
        let room = rooms[roomCodes[roomCode]];
        
        if (room) {
            if (room.players.length >= 3) {
                player.emit('roomAlreadyFull');
                return;
            }
            joinRoom(player, room, () => {
                callback({
                    name: room.name,
                    joinCode: room.joinCode
                });
            });
        } else {
            player.emit('noSuchRoom');
        }
    });

    player.on('leaveRoom', (callback) => {
        let room = rooms[player.roomId];
        if (player.hasOwnProperty('roomId')) {
            if (player.roomId != null) {
                if (rooms.hasOwnProperty(player.roomId)) {
                    leaveRoom(player, room, () => {
                        console.log(room.id);
                        console.log(room.joinCode);
                        console.log(roomCodes);
                        player.emit('leaveRoomSuccess');
                        if (callback) {
                            callback();
                        }
                    });
                    return;
                } else {
                    player.emit('roomDoesNotExist');
                    return;
                }
            }
        }
        player.emit('notInRoom');
    });

    player.on('startGame', (callback) => {
        if (!player.isHost) {
            player.emit('notHost');
            return;
        }
        
        let room = rooms[player.roomId];
    
        if (room.inGame) {
            player.emit('alreadyInGame');
            return;
        }
            
        if (room.players.length < 3) {
            player.emit('notEnoughPlayers');
            return;
        }

        // start the game
        room.inGame = true;
        this.game = new CardGame(room);
    });

    player.on('setName', (name) => {
        console.log(name);
        player.name = name;
        player.emit('nameSet', name);
    });
});

class Player {
    constructor(socket, id) {
        this.socket = socket;
        this.id = id;
        this.isHost = false;
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
}