const socket = io();

const createRoomButton = document.getElementById('createRoomButton');
const createRoomName = document.getElementById('createRoomName');
const joinRoomButton = document.getElementById('joinRoomButton');
const joinRoomCode = document.getElementById('joinRoomCode');
const leaveRoomButton = document.getElementById('leaveRoomButton');

createRoomButton.addEventListener('click', () => {
    socket.emit('createRoom', createRoomName.value, (roomInfo) => {
        console.log('created room');
        console.log(roomInfo);
    });
});

joinRoomButton.addEventListener('click', () => {
    socket.emit('joinRoom', joinRoomCode.value, (roomInfo) => {
        console.log('joined room');
        console.log(roomInfo);
    });
});

leaveRoomButton.addEventListener('click', () => {
    socket.emit('leaveRoom', () => {
        console.log('left room');
    });
});