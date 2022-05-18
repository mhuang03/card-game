const $ = jQuery;
const socket = io();
console.log(socket);

const createRoomButton = document.getElementById('createRoomButton');
const createRoomName = document.getElementById('createRoomName');
const joinRoomButton = document.getElementById('joinRoomButton');
const joinRoomCode = document.getElementById('joinRoomCode');
const leaveRoomButton = document.getElementById('leaveRoomButton');

const roomDetails = document.getElementById('roomDetails');
const infoText = document.getElementById('infoText');

const gameDiv = document.getElementById('gameDiv');
const startGameButton = document.getElementById('startGameButton');

const toggleRoomButtons = () => {
    createRoomButton.classList.toggle('hidden');
    createRoomName.classList.toggle('hidden');
    joinRoomButton.classList.toggle('hidden');
    joinRoomCode.classList.toggle('hidden');
    leaveRoomButton.classList.toggle('hidden');
};

const toggleGame = () => {
    console.log('called toggleGame');
    gameDiv.classList.toggle('hidden');
};

createRoomButton.addEventListener('click', () => {
    socket.emit('createRoom', createRoomName.value, (roomInfo) => {
        createRoomName.value = '';
        infoText.innerText = ''
    });
});

joinRoomButton.addEventListener('click', () => {
    socket.emit('joinRoom', joinRoomCode.value, (roomInfo) => {
        joinRoomCode.value = '';
        infoText.innerText = '';
    });
});

leaveRoomButton.addEventListener('click', () => {
    socket.emit('leaveRoom', () => {
        infoText.innerText = '';
    });
});

startGameButton.addEventListener('click', () => {
    socket.emit('startGame', () => {
        infoText.innerText = '';
        console.log('started game'); 
    });
});

socket.on('joinRoomSuccess', (roomInfo) => {
    console.log('joined room');
    console.log(roomInfo);
    roomDetails.innerText = `Room: ${roomInfo.name}, Join Code: ${roomInfo.joinCode}`;
    toggleRoomButtons();
    toggleGame();
});

socket.on('leaveRoomSuccess', () => {
    console.log('left room');
    roomDetails.innerText = 'Not in a room.';
    toggleRoomButtons();
    toggleGame();
    startGameButton.classList.add('hidden');
});

socket.on('alreadyInRoom', () => {
    infoText.innerText = 'Already in a room. Leave the current room to create or join a new room.';
});

socket.on('noSuchRoom', () => {
    infoText.innerText = 'No such room was found.';
});

socket.on('notInRoom', () => {
    infoText.innerText = '';
    roomDetails.innerText = 'Not in a room.';
    toggleRoomButtons();
    toggleGame();
});

socket.on('roomDoesNotExist', () => {
    infoText.innerText = 'The room no longer exists. Please reload the page.';
});

socket.on('emptyRoomName', () => {
    infoText.innerText = 'Please enter a non-empty room name.';
});

socket.on('roomAlreadyFull', () => {
    infoText.innerText = 'That room is already full.';
});

socket.on('youAreHost', () => {
    startGameButton.classList.remove('hidden');
});

socket.on('notEnoughPlayers', () => {
    infoText.innerText = 'Not enough players to start the game.';
});

socket.on('gameBegins', () => {
    
});

socket.onAny((eventName, ...args) => {
    console.log(eventName, ...args);
});