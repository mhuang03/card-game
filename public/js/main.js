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

createRoomButton.addEventListener('click', () => {
    socket.emit('createRoom', createRoomName.value, (roomInfo) => {
        console.log('created room');
        console.log(roomInfo);
        createRoomName.value = '';
        roomDetails.innerText = `Room: ${roomInfo.name}, Join Code: ${roomInfo.joinCode}`;
        infoText.innerText = ''
    });
});

joinRoomButton.addEventListener('click', () => {
    socket.emit('joinRoom', joinRoomCode.value, (roomInfo) => {
        console.log('joined room');
        console.log(roomInfo);
        joinRoomCode.value = '';
        roomDetails.innerText = `Room: ${roomInfo.name}, Join Code: ${roomInfo.joinCode}`;
        infoText.innerText = ''
    });
});

leaveRoomButton.addEventListener('click', () => {
    socket.emit('leaveRoom', () => {
        console.log('left room');
        roomDetails.innerText = 'Not in a room.';
        infoText.innerText = ''
    });
});

socket.on('alreadyInRoom', () => {
    infoText.innerText = 'Already in a room. Leave the current room to create or join a new room.'
})

socket.on('noSuchRoom', () => {
    infoText.innerText = 'No such room was found.'
})

socket.on('notInRoom', () => {
    infoText.innerText = 'Not in a room. Create or join a room first.'
})

socket.on('roomDoesNotExist', () => {
    infoText.innerText = 'The room no longer exists. Please reload the page.'
})

socket.on('emptyRoomName', () => {
    infoText.innerText = 'Please enter a non-empty room name.'
})

socket.onAny((eventName) => {
    console.log(eventName);
})