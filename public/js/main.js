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
const playCardsButton = document.getElementById('playCardsButton');
const skipTurnButton = document.getElementById('skipTurnButton');

const Card = window.Game.Card;
const DisplayCard = window.Game.DisplayCard;
const hand = document.getElementById('cardHand');
const comboDisplay = document.getElementById('comboDisplay');
const turnInfo = document.getElementById('turnInfo');

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

playCardsButton.addEventListener('click', () => {
    let selected = [];
    $('#cardHand').find('li>strong>label').each((idx, el) => {
        selected.push({
            rank: el.attributes.rank.value,
            suit: el.attributes.suit.value
        });
    });
    socket.emit('playCards', selected);
});

skipTurnButton.addEventListener('click', () => {
    socket.emit('skipTurn');
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
    infoText.innerText = '';
});

socket.on('dealtHand', (cards) => {
    for (let c of cards) {
        let card = new Card(c);
        let $li = card.$li;
        $li.appendTo('#cardHand');

        let $card = $li.children().first();
        $card.on('change', () => {
            if ($card.parent().prop('tagName') == 'STRONG') {
                $card.unwrap();
            } else {
                $card.wrap('<strong></strong>');
            }
        });
        
        $card.on('mouseenter mouseleave', () => {
            if (!window.isSelecting || window.selection.includes($card)) {
                return;
            }
            $card.click();
            window.selection.push($card);
        });

        $card.on('mousedown', () => {
            if (window.selection.includes($card)) {
                return;
            }
            $card.click();
            window.selection.push($card);
        });
    }
});

socket.on('comboAccepted', (cards) => {
    for (let c of cards) {
        let $card = $('#cardHand').find(`label[rank=${c.rank}][suit=${c.suit}]`);
        $card.closest('li').detach();
    }
    turnInfo.innerText = '';
});

socket.on('comboPlayed', (cards) => {
    $('#comboDisplay').empty();
    for (let c of cards) {
        let card = new DisplayCard(c);
        let $li = card.$li;
        $li.appendTo('#comboDisplay');
    }
});

socket.on('trickEnds', () => {
    $('#comboDisplay').empty();
});

socket.on('yourTurn', () => {
    turnInfo.innerText = 'Your Turn';
});

socket.on('skippedTurn', () => {
    turnInfo.innerText = '';
});

socket.on('youWin', () => {
    infoText.innerText = 'You Win!';
});

socket.on('gameEnds', () => {
    turnInfo.innerText = '';
    $('#cardHand').empty();
    $('#comboDisplay').empty();
});

window.isSelecting = false;
window.selection = [];
document.body.addEventListener('mousedown', () => {
    window.isSelecting = true;
});
document.body.addEventListener('mouseup', () => {
    window.isSelecting = false;
    window.selection = [];
});
document.body.addEventListener('mouseleave', () => {
    window.isSelecting = false;
    window.selection = [];
});

socket.onAny((eventName, ...args) => {
    console.log(eventName, ...args);
});