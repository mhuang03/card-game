const { Deck, Hand, Combo, Card } = require('./cards.js');

class CardGame {
    constructor(room, lastWinner) {
        this.room = room;
        let deck = new Deck();

        for (let p of room.players) {
            p.setHand(new Hand());
            p.setNumber(room.players.indexOf(p));
            for (let i = 0; i < 16; i++) {
                let card = deck.pop()
                p.hand.push(card);

                if (!lastWinner && card.rank == '3' && card.suit == 'Hearts') {
                    this.currentPlayer = p;
                    this.turn = p.playerNumber;
                }
            }
            p.hand.sort();
            
            this.setupListeners(p);
        }
        if (lastWinner) {
            this.currentPlayer = lastWinner;
            this.turn = lastWinner.playerNumber;
        }
        this.newTrick = true;
        //room.emitRoomStateUpdate();
        this.emitGameStateUpdate();
    }

    setupListeners(player) {
        let room = this.room;
        player.on('playCards', (cards, callback) => {
            if (!room.inGame) {
                callback(this.gameResponse(player, 'The game has not started yet.'));
                return;
            }

            if (cards.length == 0) {
                callback(this.gameResponse(player, 'No cards selected.'));
                return;
            }

            if (player != this.currentPlayer) {
                callback(this.gameResponse(player, 'It is not your turn.'));
                return;
            }

            let stringArr = cards.map(card => card.rank + ' of ' + card.suit);
            if (stringArr.some((val, ind) => stringArr.indexOf(val) != ind)) {
                callback(this.gameResponse(player, 'Duplicate cards were submitted.'));
                return;
            }

            let combo = new Combo();
            for (let c of cards) {
                combo.push(new Card(c.rank, c.suit));
            }
            combo.parse();

            if (combo.name == 'Invalid') {
                callback(this.gameResponse(player, 'Not a valid combo.'));
                return;
            }

            if (!player.hand.contains(combo)) {
                callback(this.gameResponse(player, 'That combo is not in your hand.'));
                return;
            }

            if (!this.newTrick && !combo.canPlayOn(this.previousCombo)) {
                callback(this.gameResponse(player, 'Cannot play that combo.'));
                return;
            }
            
            this.newTrick = false;
            this.secondToLastCombo = this.previousCombo;
            this.secondToLastPlayer = this.previousPlayer
            this.previousCombo = combo;
            this.previousPlayer = player;
            
            player.hand.play(combo);

            if (combo.name == 'Bomb') {
                room.scoreBomb(player);
            }

            if (player.hand.size == 0) {
                this.winner = {
                    name: player.name,
                    playerNumber: player.playerNumber
                }
                room.scoreGame(player, combo, this.secondToLastPlayer, this.secondToLastCombo);
                room.endGame();
            } else {
                this.advanceTurn();
            }
            
            callback(this.gameResponse(player));
            this.emitGameStateUpdate();
        });

        player.on('gameStateRequest', (callback) => {
            callback(this.gameResponse(player));
        });
    }

    advanceTurn() {
        this.turn += 1;
        this.turn %= 3;
        this.currentPlayer = this.room.players[this.turn];
        while (!this.currentPlayer.hand.canPlayOn(this.previousCombo)
              && this.currentPlayer != this.previousPlayer) {
            this.turn += 1;
            this.turn %= 3;
            this.currentPlayer = this.room.players[this.turn];
        }
        if (this.currentPlayer == this.previousPlayer) {
            this.newTrick = true;
        }
    }

    emit(...args) {
        this.room.emit(...args);
    }

    emitGameStateUpdate() {
        for (let p of this.room.players) {
            p.emit('gameStateUpdate', this.gameResponse(p));
        }
    }

    gameResponse(player, errorMsg='') {
        let res = {
            success: errorMsg == '',
            errorMsg: errorMsg,
            gameState: {
                self: {
                    playerNumber: player.playerNumber,
                    name: player.name
                },
                winner: this.winner,
                newTrick: this.newTrick,
                currentPlayer: {
                    playerNumber: this.turn,
                    name: this.currentPlayer.name
                },
                players: []
            }
        };

        if (this.previousCombo) {
            res.gameState['previousCombo'] = this.previousCombo.toObjArr();
        }

        for (let p of this.room.players) {
            let playerInfo = {
                name: p.name,
                length: p.hand.size,
                cardsVisible: p == player
            };
            if (this.winner) {
                playerInfo.cardsVisible = true;
            }
            if (playerInfo.cardsVisible) {
                playerInfo['hand'] = p.hand.toObjArr();
            }
            res.gameState.players.push(playerInfo);
        }
        
        return res;
    }
}

exports.CardGame = CardGame;