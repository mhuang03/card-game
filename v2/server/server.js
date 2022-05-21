/* Libraries */
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

/* Classes */
const { LobbyManager } = require('./lobby.js');

/* Constants */
const publicPath = path.join(__dirname, '/../public');
const port = process.env.PORT || 3000;



/* Setup Server */
let app = express();
let server = http.createServer(app);
let io = socketIO(server);
app.use((req, res, next) => {
    console.log('request received');
    next();
});
app.use(express.static(publicPath));

app.get('/debug', (req, res) => {
    res.json(Array.from(lobby.roomCodes.keys()));
});

app.get('/:joinCode', (req, res) => {
    console.log('attempt to server index');
    let joinCode = req.params.joinCode;
    if (lobby.roomCodes.has(joinCode)) {
        return res.sendFile('index.html', {
            root: publicPath
        });
    }
    return res.redirect('/');
});

server.listen(port, () => {
    console.log(`Server is up on port ${port}.`);
});

let lobby = new LobbyManager();



/* Setup Connection */
io.use((socket, next) => {
    // attempt to retrieve session from a token
    console.log('attempt to retrieve session from a token');
    let player = undefined;
    let sessionToken = socket.handshake.auth.token;
    if (sessionToken) {
        player = lobby.playerFromToken(sessionToken);
    }
    
    if (player) {
        player.changeSocket(socket);
        socket.player = player;
        return next();
    }

    socket.player = lobby.newPlayer(socket);
    return next();
});
io.use((socket, next) => {
    // join lobby from url path if available
    console.log('join lobby from url path if available');
    let player = socket.player;
    let url = new URL(socket.request.headers.referer);
    let path = url.pathname;
    let matches = path.match(/^\/([A-Z0-9]{5})$/);
    
    if (matches) {
        let joinCode = matches[1];
        console.log(matches);
        if (lobby.roomCodes.has(joinCode)) {
            let room = lobby.roomFromCode(joinCode);
            if (player.inRoom) {
                player.leaveRoom();
            }
            player.joinRoom(room);
        }
    }
    return next();
});
io.on('connection', (socket) => {
    let player = socket.player;
    player.emitSession();
    console.log(`user joined with id ${player.id} and token ${player.token}`)
    
    lobby.setupListeners(player);
    if (player.inRoom) {
        if (player.room.inGame) {
            player.room.game.setupListeners(player);
        }
    }
});