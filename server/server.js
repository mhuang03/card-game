// Libraries
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const uuid = require('uuid').v4;
const rstring = require('randomstring').generate;
//const {parse, stringify} = require('flatted');


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
        let socketIds = [];
        for (let s of room.sockets) {
            socketIds.push(s.id);
        }
        info[r] = {
            id: room.id,
            name: room.name,
            hostId: room.host.id,
            joinCode: room.joinCode,
            socketIds: socketIds
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
const createRoom = (socket, roomName, callback) => {
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
        host: socket,
        joinCode: newJoinCode,
        sockets: []
    }
    
    rooms[newRoom.id] = newRoom;
    roomCodes[newRoom.joinCode] = newRoom.id;
    socket.isHost = true;
    
    joinRoom(socket, newRoom, () => {
        console.log(socket.id, 'created room', newRoom.name, 'with id', newRoom.id);
        console.log(Object.keys(rooms).length);
        socket.emit('youAreHost');
        if (callback) {
            callback();
        }
    });
}

const joinRoom = (socket, room, callback) => {
    room.sockets.push(socket);
    socket.join(room.id);
    console.log(socket.id, 'joined room', room.name, 'with id', room.id);
    socket.roomId = room.id;

    if (!socket.isHost) {
        socket.isHost = false;
    }
    
    socket.emit('joinRoomSuccess', {
        name: room.name,
        joinCode: room.joinCode
    });

    emitToRoom(room, 'playerCountUpdate', room.sockets.length);
    if (callback) {
        callback();
    }
}

const leaveRoom = (socket, room, callback) => {
    socket.leave(room.id);
    
    room.sockets = room.sockets.filter((item) => item !== socket);
    console.log(socket.id, 'left room', room.name, 'with id', room.id);

    if (room.sockets.length == 0) {
        //remove room from rooms
        delete roomCodes[room.joinCode];
        delete rooms[room.id];
    } else if (socket.isHost) {
        let newHost = room.sockets[0];
        newHost.isHost = true;
        room.host = newHost;
        newHost.emit('youAreHost');
    }
    
    socket.roomId = null;
    socket.isHost = null;

    emitToRoom(room, 'playerCountUpdate', room.sockets.length);
    if (callback) {
        callback();
    }
}

// Helpers
const emitToRoom = (room, event, ...args) => {
    for (let s of room.sockets) {
        s.emit(event, ...args);
    }
}

// Listeners
io.on('connection', (socket) => {
    socket.id = uuid();
    console.log(`User has connected with id ${socket.id}.`);
    
    socket.on('disconnect', () => {
        if (socket.hasOwnProperty('roomId')) {
            if (socket.roomId != null) {
                leaveRoom(socket, rooms[socket.roomId]);
            }
        }
        console.log('A user has disconnected');
        console.log(Object.keys(roomCodes));
    });

    socket.on('createRoom', (roomName, callback) => {
        if (socket.hasOwnProperty('roomId')) {
            if (socket.roomId != null) {
                socket.emit('alreadyInRoom');
                return;
            }
        }

        if (roomName.trim() == '') {
            socket.emit('emptyRoomName');
            return;
        }
        
        createRoom(socket, roomName, () => {
            let room = rooms[socket.roomId];
            console.log(room.id);
            console.log(room.joinCode);
            callback({
                name: room.name,
                joinCode: room.joinCode
            });
        });
    });

    socket.on('joinRoom', (roomCode, callback) => {
        if (socket.hasOwnProperty('roomId')) {
            if (socket.roomId != null) {
                socket.emit('alreadyInRoom');
                return;
            }
        }
        
        roomCode = roomCode.toUpperCase();
        let room = rooms[roomCodes[roomCode]];
        
        if (room) {
            if (room.sockets.length >= 3) {
                socket.emit('roomAlreadyFull');
                return;
            }
            joinRoom(socket, room, () => {
                callback({
                    name: room.name,
                    joinCode: room.joinCode
                });
            });
        } else {
            socket.emit('noSuchRoom');
        }
    });

    socket.on('leaveRoom', (callback) => {
        let room = rooms[socket.roomId];
        if (socket.hasOwnProperty('roomId')) {
            if (socket.roomId != null) {
                if (rooms.hasOwnProperty(socket.roomId)) {
                    leaveRoom(socket, room, () => {
                        console.log(room.id);
                        console.log(room.joinCode);
                        console.log(roomCodes);
                        socket.emit('leaveRoomSuccess');
                        if (callback) {
                            callback();
                        }
                    });
                    return;
                } else {
                    socket.emit('roomDoesNotExist');
                    return;
                }
            }
        }
        socket.emit('notInRoom');
    });

    socket.on('startGame', (callback) => {
        if (!socket.isHost) {
            socket.emit('notHost');
            return;
        }
        
        let room = rooms[socket.roomId];
        if (room.sockets.length < 3) {
            socket.emit('notEnoughPlayers');
            return;
        }

        // start the game
        let game = new CardGame(room);
        
        emitToRoom(room, 'gameBegins', (callback) => {
            if (callback) {
                callback();
            }
        });
    });
});