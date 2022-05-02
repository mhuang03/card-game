const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

const publicPath = path.join(__dirname, '/../public');
const port = process.env.PORT || 3000;

let app = express();
let server = http.createServer(app);
let io = socketIO(server);

app.use(express.static(publicPath));

server.listen(port, () => {
    console.log(`Server is up on port ${port}.`);
});

