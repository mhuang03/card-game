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
        let joinCode = '';
        while (this.roomCodes.has(joinCode) || joinCode === '') {
            joinCode = rstring({
                length: 5,
                readable: true,
                charset: 'alphanumeric',
                capitalization: 'uppercase',
            });
        }
        return joinCode;
    }

    newPlayer(socket) {
        let player = new Player(this, socket);
        this.tokens.set(player.token, player);

        return player;
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
            player.timeout = setTimeout(() => {
                if (!player.socket.connected) {
                    if (player.inRoom) {
                        player.leaveRoom();
                    }
                }
            }, 120000);
        });
        player.on('connect', () => {
            if (player.timeout) {
                clearTimeout(player.timeout);
                player.timeout = undefined;
            }
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
            callback(player.roomResponse());
        });

        player.on('joinRoom', (code, callback) => {
            if (player.inRoom) {
                callback(player.roomResponse('Leave the current room to join a new one.'));
                return;
            }

            let room = this.roomFromCode(code.toUpperCase());
            if (!room) {
                // try parsing as url
                let url = undefined;
                try {
                    url = new URL(code);
                    let path = url.pathname;
                    let matches = path.match(/^\/([A-Z0-9]{5})$/);
                    if (matches) {
                        code = matches[1];
                    }
                } catch (error) {
                    callback(player.roomResponse('No such room exists.'));
                    return;
                }
                
                room = this.roomFromCode(code.toUpperCase());
                if (!room) {
                    callback(player.roomResponse('No such room exists.'));
                    return;
                }
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
                callback(player.roomResponse('Please enter a non-empty name.'));
                return;
            }
            name = name.trim();

            if (player.inRoom) {
                for (let p of player.room.players) {
                    if (p != player && p.name == name) {
                        callback(player.roomResponse('Please choose a unique name.'));
                        return;
                    }
                }
            }

            if (name.length > 16) {
                callback(player.roomResponse('Names have a max length of 16.'));
                return;
            }

            for (let char of [...name]) {
                let charCode = char.charCodeAt(0);
                if ((charCode > 126 || charCode < 32) && !(charCode == 160)) {
                    callback(player.roomResponse('ASCII characters only.'));
                    return;
                }
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
    constructor(manager, hostPlayer, name = 'New Room') {
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
        this.inGame = true;
        if (this.lastWinner) {
            this.game = new CardGame(this, this.lastWinner);
        } else {
            this.game = new CardGame(this);
        }
    }

    endGame() {
        for (let p of this.players) {
            p.removeAllListeners('playCards');
            p.removeAllListeners('gameStateRequest');
        }
        this.game = undefined;
        this.inGame = false;
        this.emitRoomStateUpdate();
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
    }

    removePlayer(player) {
        this.players = this.players.filter((item) => item !== player);
        this.scores.delete(player);
        this.size = this.players.length;

        if (player.isHost && this.size > 0) {
            this.setHost(this.players[0]);
        }

        if (this.lastWinner == player) {
            this.lastWinner = undefined;
        }

        if (this.isEmpty()) {
            this.manager.closeRoom(this);
        } else {
            this.updatePlayerNumbers();
        }
    }

    updatePlayerNumbers() {
        for (let i = 0; i < this.players.length; i++) {
            let p = this.players[i];
            p.setNumber(i);
        }
        this.emitRoomStateUpdate();
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
                score: this.scores.get(player),
            },
            joinCode: this.joinCode,
            roomName: this.name,
            inGame: this.inGame,
            full: this.size >= 3,
            host: {
                playerNumber: this.host.playerNumber,
                name: this.host.name,
            },
            players: [],
        };
        for (let p of this.players) {
            info.players.push({
                name: p.name,
                playerNumber: p.playerNumber,
                score: this.scores.get(p),
            });
        }
        if (this.lastWinner) {
            info['lastWinner'] = {
                playerNumber: this.lastWinner.playerNumber,
                name: this.lastWinner.name,
            };
        }
        return info;
    }

    emitRoomStateUpdate() {
        for (let p of this.players) {
            if (p.inRoom) {
                let res = {
                    success: true,
                    errorMsg: '',
                    roomState: {
                        inRoom: p.inRoom,
                        playerName: p.name,
                    },
                };
                res.roomState['roomInfo'] = this.getInfo(p);
                p.emit('roomStateUpdate', res);
            }
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

    scoreGame(winner, finalCombo, lastPlayer, previousCombo) {
        this.lastWinner = winner;
        let scores = this.scores;

        let winnerIndex = winner.playerNumber;
        let lastPlayerThrew = false;
        finalCombo.value -= 1;
        if (finalCombo.name == 'Single' && previousCombo.name == 'Single' && lastPlayer.hand.canPlayOn(finalCombo)) {
            lastPlayerThrew = true;
        }

        let total = 0;
        for (let p of this.players) {
            if (p != winner) {
                let count = p.hand.size;
                let score = 0;
                if (count > 1) {
                    score += count;
                }
                if (count == 16) {
                    score *= 2;
                }
                if (lastPlayerThrew) {
                    if (p == lastPlayer) {
                        score *= 2;
                    } else {
                        score = 0;
                    }
                }
                scores.set(p, scores.get(p) - score);
                total += score;
            }
        }
        scores.set(winner, scores.get(winner) + total);
        this.emitRoomStateUpdate();
    }
}

const animals = [
    'alligator',
    'anteater',
    'armadillo',
    'axolotl',
    'badger',
    'bat',
    'beaver',
    'buffalo',
    'camel',
    'capybara',
    'chameleon',
    'cheetah',
    'chinchilla',
    'chipmunk',
    'chupacabra',
    'coyote',
    'crow',
    'dingo',
    'dinosaur',
    'dog',
    'dolphin',
    'dragon',
    'duck',
    'elephant',
    'ferret',
    'fox',
    'frog',
    'giraffe',
    'gopher',
    'grizzly',
    'hedgehog',
    'hippo',
    'hyena',
    'jackal',
    'ibex',
    'ifrit',
    'iguana',
    'koala',
    'kraken',
    'lemur',
    'leopard',
    'liger',
    'lion',
    'llama',
    'manatee',
    'mink',
    'monkey',
    'narwhal',
    'nyan cat',
    'octopus',
    'orangutan',
    'otter',
    'panda',
    'penguin',
    'platypus',
    'python',
    'rabbit',
    'raccoon',
    'rhino',
    'sheep',
    'shrew',
    'skunk',
    'squirrel',
    'tiger',
    'turtle',
    'unicorn',
    'walrus',
    'wolf',
    'wombat',
];

class Player {
    constructor(manager, socket, name) {
        this.manager = manager;
        this.socket = socket;
        this.id = uuid();
        this.token = uuid();
        this.isHost = false;
        this.inRoom = false;
        if (name) {
            this.name = name;
        } else {
            this.name = animals[Math.floor(Math.random() * animals.length)];
        }
    }

    on(...args) {
        return this.socket.on(...args);
    }
    off(...args) {
        return this.socket.off(...args);
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
    removeAllListeners(...args) {
        return this.socket.removeAllListeners(...args);
    }

    changeSocket(socket) {
        this.socket.removeAllListeners();
        this.socket = socket;
    }

    emitSession() {
        this.emit('session', this.token);
    }

    joinRoom(room) {
        this.room = room;
        let done = false;
        while (!done) {
            done = true;
            for (let p of room.players) {
                if (p.name == this.name) {
                    done = false;
                    this.setName(this.name + '^2');
                }
            }
        }
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
        if (name !== this.name) {
            this.name = name;
            if (this.inRoom) {
                this.room.emitRoomStateUpdate();
                if (this.room.inGame) {
                    this.room.game.emitGameStateUpdate();
                }
            } else {
                this.emit('roomStateUpdate', this.roomResponse());
            }
        }
    }

    roomResponse(errorMsg = '') {
        let res = {
            success: errorMsg == '',
            errorMsg: errorMsg,
            roomState: {
                playerName: this.name,
                inRoom: this.inRoom,
            },
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
