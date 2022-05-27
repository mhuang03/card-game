(function (window) {
    let App = window.App || {};
    const $ = jQuery;

    // attempt to retrieve existing session
    let token = sessionStorage.getItem('token');
    let auth = {};
    if (token) {
        auth['token'] = token;
    }
    const socket = io({
        auth: auth,
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
    };
    const createRoom = (name) => {
        socket.emit('createRoom', name, handleRoomResponse);
    };
    const joinRoom = (joinCode) => {
        socket.emit('joinRoom', joinCode, handleRoomResponse);
    };
    const leaveRoom = () => {
        socket.emit('leaveRoom', handleRoomResponse);
    };
    const startGame = () => {
        socket.emit('startGame', handleRoomResponse);
    };
    const setName = (name) => {
        socket.emit('setName', name, handleRoomResponse);
    };
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
    };
    const playCards = (cards) => {
        socket.emit('playCards', cards, handleGameResponse);
    };
    // listen for and render game state updates
    socket.on('gameStateUpdate', handleGameResponse);

    // card selection system
    window.isSelecting = false;
    window.selection = [];
    $('body').mousedown(() => {
        window.isSelecting = true;
    });
    $('body').on('mouseup mouseleave', () => {
        window.isSelecting = false;
        window.selection = [];
    });

    /************************/
    /*    Initialization    */
    /************************/
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
    $('#lobbyFunctions > div').each((idx, item) => {
        let $item = $(item);
        let event = $item.attr('event');
        let button = $item.find('input[type="button"]');
        let text = $item.find('input[type="text"]');
        if (text.length > 0) {
            button.click(() => {
                socket.emit(event, text.val(), handleRoomResponse);
                text.val('');
            });
            text.keyup((e) => {
                if (e.key == 'Enter' || e.keyCode == 13) {
                    button.click();
                }
            });
        } else {
            button.click(() => {
                socket.emit(event, handleRoomResponse);
            });
        }
    });
    $('#playCards').click(() => {
        let selected = [];
        $('#myCards > ul')
            .find('li>strong>label')
            .each((idx, el) => {
                selected.push({
                    rank: el.attributes.rank.value,
                    suit: el.attributes.suit.value,
                });
            });
        socket.emit('playCards', selected, handleGameResponse);
    });

    // make name editable and prevent enter
    $('#playerName > div > span').focusout(() => {
        socket.emit('setName', $('#playerName > div > span').text(), handleRoomResponse);
    });
    $('#playerName > div > span').keypress((e) => {
        if (e.key == 'Enter' || e.keyCode == 13) {
            e.preventDefault();
            $('#playerName > div > span').focusout();
            $('#playerName > div > span').blur();
        }
    });

    // make room name editable and prevent enter
    $('#titleText > div > h3').focusout(() => {
        if (!$('#titleText > div > h3').hasClass('editable')) {
            return;
        }
        socket.emit('setRoomName', $('#titleText > div > h3').text(), handleRoomResponse);
    });
    $('#titleText > div > h3').keypress((e) => {
        if (!$('#titleText > div > h3').hasClass('editable')) {
            return;
        }
        if (e.key == 'Enter' || e.keyCode == 13) {
            e.preventDefault();
            $('#titleText > div > h3').focusout();
            $('#titleText > div > h3').blur();
        }
    });

    // join code copy to clipboard
    $('#joinCode').click(() => {
        let code = $('#joinCode > div > span.joinCode').text();
        navigator.clipboard.writeText('https://cards.makeme.party/' + code);
    });

    /*******************/
    /*    Rendering    */
    /*******************/
    const renderRoom = (roomState, errorMsg) => {
        //console.log(roomState);
        $('#playerName > div > span').text(roomState.playerName);
        if (roomState.inRoom) {
            let roomInfo = roomState.roomInfo;
            $('#joinCode > div > span.joinCode').text(roomInfo.joinCode);
            $('#titleText > div > h3').text(roomInfo.roomName);
            $('#lobbyList').removeClass('hidden');
            $('#lobbyList > .player').each((idx, item) => {
                let $player = $(item);
                let playerNumber = $player.attr('playerNumber');
                let playerInfo = roomInfo.players[playerNumber];
                if (playerInfo) {
                    $player.removeClass('hidden');
                    $player.find('.name').text(playerInfo.name);
                    $player.find('.score').text(playerInfo.score);
                    if (playerNumber == roomInfo.host.playerNumber) {
                        $player.addClass('host');
                    }
                    if (roomInfo.lastWinner) {
                        if (playerNumber == roomInfo.lastWinner.playerNumber) {
                            $player.addClass('winner');
                        } else {
                            $player.removeClass('winner');
                        }
                    } else {
                        $player.removeClass('winner');
                    }
                } else {
                    $player.addClass('hidden');
                    $player.find('.name').text('');
                    $player.find('.score').text('');
                    $player.removeClass('host');
                }
            });

            if (!roomInfo.inGame) {
                // clear game area
                $('#opponentCards > .opponent > ul').each((idx, item) => {
                    $(item).empty().removeClass('fadeCards');
                    $(item).siblings().empty().removeClass('turn');
                });
                $('#myCards > ul').empty().removeClass('fadeCards');
                $('#lastCombo > ul').empty().removeClass('fadeCards');
                $('#playCards').addClass('clear');
                $('#app').addClass('preGame');
                $('#playerName > div > span').removeClass('turn');
            } else {
                $('#app').removeClass('preGame');
            }

            if (!roomInfo.inGame && roomInfo.host.playerNumber == roomInfo.self.playerNumber && roomInfo.full) {
                $('#startGame').removeClass('hidden');
            } else {
                $('#startGame').addClass('hidden');
            }

            if (roomInfo.host.playerNumber == roomInfo.self.playerNumber) {
                $('#titleText > div > h3').addClass('editable');
                $('#titleText > div > h3').attr('contenteditable', '');
            } else {
                $('#titleText > div > h3').removeClass('editable');
                $('#titleText > div > h3').attr('contenteditable', null);
            }

            $('#createRoom').addClass('hidden');
            $('#joinRoom').addClass('hidden');
            $('#leaveRoom').removeClass('hidden');
            $('#lobby').removeClass('preRoom');
        } else {
            $('#joinCode > div > span.joinCode').text('');
            $('#titleText > div > h3').text('Card Game');
            $('#lobbyList').addClass('hidden');
            $('#lobbyList > .player').each((idx, item) => {
                let $player = $(item);
                $player.find('.name').text('');
                $player.find('.score').text('');
                $player.removeClass('host');
            });

            $('#createRoom').removeClass('hidden');
            $('#joinRoom').removeClass('hidden');
            $('#startGame').removeClass('hidden');
            $('#leaveRoom').addClass('hidden');
            $('#startGame').addClass('hidden');
            $('#playCards').addClass('clear');
            $('#app').addClass('preGame');
            $('#playerName > div > span').removeClass('turn');
            $('#lobby').addClass('preRoom');
            $('#titleText > div > h3').removeClass('editable');
            $('#titleText > div > h3').attr('contenteditable', null);
        }
        $('#setName').removeClass('hidden');

        if (errorMsg) {
            $('#errorMsg').text(errorMsg);
            $('#errorModal').modal();
        }
    };
    const renderGame = (gameState, errorMsg) => {
        //console.log(gameState);
        $('#app').removeClass('preGame');

        let self = gameState.self.playerNumber;
        let opponents = [(self + 1) % 3, (self + 2) % 3];
        let turn = gameState.currentPlayer.playerNumber;

        let players = gameState.players;
        $('#opponentCards > .opponent > ul').each((idx, item) => {
            let $op = $(item);
            let op = players[opponents[$op.parent().attr('number')]];
            let $newOp = $op.clone().empty();
            if (op.cardsVisible) {
                $newOp.addClass('hand');
                $newOp.removeClass('deck');

                for (let i = 0; i < op.length; i++) {
                    let card = op.hand[i];
                    let $li = new App.Cards.DisplayCard(card).$li;
                    $li.appendTo($newOp);
                }
            } else {
                $newOp.removeClass('hand');
                $newOp.addClass('deck');

                for (let i = 0; i < op.length; i++) {
                    let $li = new App.Cards.DisplayCardBack().$li;
                    $li.appendTo($newOp);
                }
            }

            $op.siblings('span.cardCount').text(op.length);
            if (op.length == 1) {
                $op.siblings('span.cardCount').addClass('singular');
            } else {
                $op.siblings('span.cardCount').removeClass('singular');
            }
            $op.siblings('span.opponentName').text(op.name);

            if (op == players[turn]) {
                $newOp.removeClass('fadeCards');
                $op.siblings('span.opponentName').addClass('turn');
            } else {
                $newOp.addClass('fadeCards');
                $op.siblings('span.opponentName').removeClass('turn');
            }
            $op.replaceWith($newOp);
        });

        let myCards = players[self].hand;
        let $newCards = $('#myCards > ul').clone().empty();
        for (let card of myCards) {
            if (gameState.winner) {
                let $li = new App.Cards.DisplayCard(card).$li;
                $li.appendTo($newCards);
                continue;
            }

            let $li = new App.Cards.Card(card).$li;
            $li.appendTo($newCards);

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
        $('#myCards > ul').replaceWith($newCards);
        if (turn != self) {
            $newCards.addClass('fadeCards');
            $('#playCards').addClass('clear');
            $('#playerName > div > span').removeClass('turn');
        } else {
            $newCards.removeClass('fadeCards');
            if (!gameState.winner) {
                $('#playCards').removeClass('clear');
            }
            $('#playerName > div > span').addClass('turn');
        }

        if (gameState.previousCombo) {
            let $newCombo = $('#lastCombo > ul').clone().empty();
            for (let card of gameState.previousCombo) {
                let $li = new App.Cards.DisplayCard(card).$li;
                $li.appendTo($newCombo);
            }
            $('#lastCombo > ul').replaceWith($newCombo);
        } else {
            $('#lastCombo > ul').empty();
        }

        if (gameState.newTrick) {
            $('#lastCombo > ul').addClass('fadeCards');
        } else {
            $('#lastCombo > ul').removeClass('fadeCards');
        }

        if (gameState.winner) {
            $('#opponentCards > .opponent > ul').each((idx, item) => {
                $(item).removeClass('fadeCards');
                $(item).siblings().removeClass('turn');
            });
            $('#myCards > ul').removeClass('fadeCards');
            $('#lastCombo > ul').removeClass('fadeCards');
            $('#playerName > div > span').removeClass('turn');
        }

        if (errorMsg) {
            $('#errorMsg').text(errorMsg);
            $('#errorModal').modal();
        }
    };

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
        playCards: playCards,
    };
    App.Game = Game;
    window.App = App;
})(window);
