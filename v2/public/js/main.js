(function(window) {
    let App = window.App || {};
    const $ = jQuery;
    
    // attempt to retrieve existing session
    let token = sessionStorage.getItem('token');
    let auth = {};
    if (token) {
        auth['token'] = token;
    }
    const socket = io({
        auth: auth
    });
    // store session
    socket.on('session', (token) => {
        sessionStorage.setItem('token', token);
    });
    
    
    
    /**********************/
    /*    Lobby System    */
    /**********************/
    const handleRoomResponse = (res, cb) => {
        if (!res.success) {
            renderRoom(res.roomState, res.errorMsg);
        } else {
            renderRoom(res.roomState);
        }
        roomState = res.roomState;
        if (cb) {
            cb(res);
        }
    }
    const createRoom = (name) => {
        socket.emit('createRoom', name, handleRoomResponse);
    }
    const joinRoom = (joinCode) => {
        socket.emit('joinRoom', joinCode, handleRoomResponse);
    }
    const leaveRoom = () => {
        socket.emit('leaveRoom', handleRoomResponse);
    }
    const startGame = () => {
        socket.emit('startGame', handleRoomResponse);
    }
    const setName = (name) => {
        socket.emit('setName', name, handleRoomResponse);
    }
    // listen for and render room state updates
    socket.on('roomStateUpdate', handleRoomResponse);
    
    
    
    /*********************/
    /*    Game System    */
    /*********************/
    const handleGameResponse = (res, cb) => {
        if (!res.success) {
            renderGame(res.gameState, res.errorMsg);
        } else {
            renderGame(res.gameState);
        }
        gameState = res.gameState;
        if (cb) {
            cb(res);
        }
    }
    const playCards = (cards) => {
        socket.emit('playCards', cards, handleGameResponse);
    }
    // listen for and render game state updates
    socket.on('gameStateUpdate', handleGameResponse);
    
    
    
    /************************/
    /*    Initialization    */
    /************************/
    let roomState = undefined;
    let gameState = undefined;
    // request the initial room and game state
    socket.emit('roomStateRequest', (res) => {
        handleRoomResponse(res, (res) => {
            if (res.roomState.inRoom) {
                let info = res.roomState.roomInfo;
                if (info.inGame) {
                    socket.emit('gameStateRequest', handleGameResponse);
                }
            }
        });
    });

    // add listeners to buttons
    $('#lobbyFunctions > div')
        .each((idx, item) => {
            let $item = $(item);
            let event = $item.attr('event');
            let button =  $item.find('input[type="button"]');
            let text = $item.find('input[type="text"]');
            if (text.length > 0) {
                button.click(() => {
                    socket.emit(event, text.val(), handleRoomResponse);
                    text.val('');
                });
                text.keyup((e) => {
                    if (e.key == 'Enter' || e.keyCode == 13) {
                        button.click()
                    }
                });
            } else {
                button.click(() => {
                    socket.emit(event, handleRoomResponse);
                });
            }
        });
    $('#myCards > input[type="button"]')
        .click(() => {
            let selected = [];
            $('#myCards > ul').find('li>strong>label').each((idx, el) => {
                selected.push({
                    rank: el.attributes.rank.value,
                    suit: el.attributes.suit.value
                });
            });
            socket.emit('playCards', selected, handleRoomResponse);
        });



    /*******************/
    /*    Rendering    */
    /*******************/
    const renderRoom = (roomState, errorMsg) => {
        console.log(roomState);
        $('#playerName > span').text(roomState.playerName);
        if (roomState.inRoom) {
            let roomInfo = roomState.roomInfo;
            $('#joinCode > span').text(roomInfo.joinCode);
            $('#lobbyList > .player')
                .each((idx, item) => {
                    let $player = $(item);
                    let playerNumber = $player.attr('playerNumber');
                    let playerInfo = roomInfo.players[playerNumber];
                    if (playerInfo) {
                        $player.find('.name').text(playerInfo.name);
                        $player.find('.score').text(playerInfo.score);
                    }
                });
        }
    }
    const renderGame = (gameState, errorMsg) => {
        console.log(gameState);
    }

    // log all events
    socket.onAny((event, ...args) => {
        console.log(event, ...args);
    });

    

    let Game = {
        createRoom: createRoom,
        joinRoom: joinRoom,
        leaveRoom: leaveRoom,
        startGame: startGame,
        setName: setName,
        playCards: playCards
    };
    App.Game = Game;
    window.App = App;
})(window);