const { CardGame } = require('./game.js');
const uuid = require('uuid').v4;
const rstring = require('randomstring').generate;



class LobbyManager {
    constructor() {
        this.rooms = new Map();
        this.roomCodes = new Map();
        this.tokens = new Map();
    }

    newRoom(hostPlayer, roomName) {
        let room = new Room(this, hostPlayer);

        if (roomName) {
            room.setName(roomName);
        }
        
        this.rooms.set(room.id, room);
        this.roomCodes.set(room.joinCode, room);

        return room;
    }

    closeRoom(room) {
        this.rooms.delete(room.id);
        this.roomCodes.delete(room.joinCode);
    }

    generateJoinCode() {
        let joinCode = ''
        while (this.roomCodes.has(joinCode) || joinCode === '') {
            joinCode = rstring({
                length: 5,
                readable: true,
                charset: 'alphanumeric',
                capitalization: 'uppercase'
            });
        }
        return joinCode;
    }

    newPlayer(socket) {
        let player = new Player(this, socket);
        this.tokens.set(player.token, player);

        return player
    }

    playerFromToken(token) {
        return this.tokens.get(token);
    }

    roomFromCode(code) {
        return this.roomCodes.get(code);
    }

    roomFromID(id) {
        return this.rooms.get(id);
    }

    setupListeners(player) {
        player.on('disconnect', () => {
            setTimeout(() => {
                if (player.inRoom) {
                    if (player.room.isEmpty()) {
                        this.closeRoom(player.room);
                    }
                }
            }, 120000);
        });
        
        player.on('createRoom', (roomName, callback) => {
            if (player.inRoom) {
                callback(player.roomResponse('Leave the current room to create a new one.'));
                return;
            }

            if (roomName.trim() == '') {
                callback(player.roomResponse('Please enter a non-empty room name.'));
                return;
            }

            this.newRoom(player, roomName.trim());
            callback(player.roomResponse())
        });
        
        player.on('joinRoom', (code, callback) => {
            if (player.inRoom) {
                callback(player.roomResponse('Leave the current room to join a new one.'));
                return;
            }

            let room = this.roomFromCode(code);
            if (!room) {
                callback(player.roomResponse('No such room exists.'));
                return;
            }

            if (room.size >= 3) {
                callback(player.roomResponse('That room is full.'));
                return;
            }

            if (room.inGame) {
                callback(player.roomResponse('Room is already in-game.'));
                return;
            }

            player.joinRoom(room);
            callback(player.roomResponse());
        });

        player.on('leaveRoom', (callback) => {
            if (!player.inRoom) {
                callback(player.roomResponse('You are not in a room.'));
                return;
            }

            player.leaveRoom(player.room);
            callback(player.roomResponse());
        });

        player.on('startGame', (callback) => {
            if (!player.isHost) {
                callback(player.roomResponse('You are not the host.'));
                return;
            }

            let room = player.room;
            if (room.inGame) {
                callback(player.roomResponse('Game has already begun.'));
                return;
            }

            if (room.size < 3) {
                callback(player.roomResponse('Not enough players.'));
                return;
            }

            room.startGame();
            callback(player.roomResponse());
        });

        player.on('setName', (name, callback) => {
            if (name.trim() == '') {
                callback(player.roomResponse('Please enter a non-empty room name.'));
                return;
            }

            player.setName(name);
            callback(player.roomResponse());
        });

        player.on('roomStateRequest', (callback) => {
            callback(player.roomResponse());
        });
    }
}

class Room {
    constructor(manager, hostPlayer, name='New Room') {
        this.players = [];
        this.manager = manager;
        this.joinCode = manager.generateJoinCode();
        this.inGame = false;
        this.id = uuid();
        this.name = name;
        this.scores = new Map();
        
        hostPlayer.joinRoom(this);
        this.setHost(hostPlayer);
    }

    startGame() {
        this.game = new CardGame(this);
        this.inGame = true;
    }

    endGame() {
        this.game = undefined;
        this.inGame = false;
    }

    setName(name) {
        this.name = name;
    }

    setHost(player) {
        for (let p of this.players) {
            if (p == player) {
                p.isHost = true;
            } else {
                p.isHost = false;
            }
        }
        this.host = player;
    }

    addPlayer(player) {
        this.players.push(player);
        this.scores.set(player, 0);
        this.size = this.players.length;
        this.updatePlayerNumbers();
        this.emitRoomStateUpdate();
    }

    removePlayer(player) {
        this.players = this.players.filter((item) => item !== player);
        this.scores.delete(player);
        this.size = this.players.length;
        if (this.isEmpty()) {
            this.manager.closeRoom(this);
        } else {
            this.updatePlayerNumbers();
            this.emitRoomStateUpdate();
        }
    }

    updatePlayerNumbers() {
        for (let i = 0; i < this.players.length; i++) {
            let p = this.players[i];
            p.setNumber(i);
        }
    }

    isEmpty() {
        for (let p of this.players) {
            if (p.socket.connected) {
                return false;
            }
        }
        return true;
    }

    emit(...args) {
        for (let p of this.players) {
            p.emit(...args);
        }
    }

    getInfo(player) {
        let info = {
            self: {
                playerNumber: player.playerNumber,
                name: player.name,
                score: this.scores.get(player)
            },
            joinCode: this.joinCode,
            inGame: this.inGame,
            full: this.size >= 3,
            host: {
                playerNumber: this.host.playerNumber,
                name: this.host.name
            },
            players: []
        };
        for (let p of this.players) {
            info.players.push({
                name: p.name,
                playerNumber: p.playerNumber,
                score: this.scores.get(p)
            });
        }
        return info;
    }

    emitRoomStateUpdate() {
        for (let p of this.players) {
            let res = {
                success: true,
                errorMsg: '',
                roomState: {
                    inRoom: true,
                    playerName: p.name,
                }
            };
            if (p.inRoom) {
                res.roomState['roomInfo'] = this.getInfo(p);
            }
            p.emit('roomStateUpdate', res);
        }
    }

    scoreBomb(player) {
        let scores = this.scores;
        for (let p of this.players) {
            if (p == player) {
                scores.set(p, scores.get(p) + 20);
            } else {
                scores.set(p, scores.get(p) - 10);
            }
        }
        this.emitRoomStateUpdate();
    }

    scoreGame(winner) {
        let scores = this.scores;
        let total = 0;
        for (let p of this.players) {
            if (p != player) {
                let count = p.hand.size;
                total += count;
                if (count > 1) {
                    if (count < 16) {
                        scores.set(p, scores.get(p) - count);
                    } else {
                        scores.set(p, scores.get(p) - 2*count);
                    }
                }
            }
        }
        scores.set(winner, scores.get(winner) + total);
        this.emitRoomStateUpdate();
    }
}


class Player {
    constructor(manager, socket, name){
        this.manager = manager;
        this.socket = socket;
        this.id = uuid();
        this.token = uuid();
        this.isHost = false;
        this.inRoom = false;
        if (name) {
            this.name = name;
        } else {
            this.name = `Player ${this.token.substring(0, 5)}`;
        }
    }

    on(...args) { return this.socket.on(...args); }
    emit(...args) { return this.socket.emit(...args); }
    join(...args) { return this.socket.join(...args); }
    leave(...args) { return this.socket.leave(...args); }

    changeSocket(socket) {
        this.socket.removeAllListeners();
        this.socket = socket;
    }

    emitSession() {
        this.emit('session', this.token);
    }

    joinRoom(room) {
        this.room = room;
        room.addPlayer(this);
        this.inRoom = true;
    }

    leaveRoom() {
        this.room.removePlayer(this);
        this.room = undefined;
        this.inRoom = false;
    }

    setNumber(num) {
        this.playerNumber = num;
    }

    setHand(num) {
        this.hand = num;
    }

    setName(name) {
        this.name = name;
        this.room.emitRoomStateUpdate();
    }

    roomResponse(errorMsg = '') {
        let res = {
            success: errorMsg == '',
            errorMsg: errorMsg,
            roomState: {
                playerName: this.name,
                inRoom: this.inRoom
            }
        };
        if (this.inRoom) {
            res.roomState['roomInfo'] = this.room.getInfo(this);
        }
        
        return res;
    }
}

exports.LobbyManager = LobbyManager;
exports.Room = Room;
exports.Player = Player;