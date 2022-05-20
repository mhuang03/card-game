const {comboDict} = require('./comboDict.js');

class CardGame {
    constructor(room) {
        this.room = room;
        let deck = new Deck();
        for (let s of room.sockets) {
            s.hand = new Hand();
            for (let i = 0; i < 16; i++) {
                let card = deck.pop()
                s.hand.push(card);

                if (card.rank == '3' && card.suit == 'Hearts') {
                    this.currentPlayer = s;
                    this.turn = room.sockets.indexOf(s);
                }
            }
            s.emit('playerNumber', room.sockets.indexOf(s));
            s.hand.sort();
            s.emit('dealtHand', s.hand.toObjArr());
        }
        this.addListeners();
        this.newTrick = true;
        this.currentPlayer.emit('yourTurn');
    }

    addListeners() {
        let room = this.room;
        for (let socket of room.sockets) {
            socket.on('playCards', (cards, callback) => {
                if (!room.inGame) {
                    socket.emit('notInGame');
                    return;
                }
                
                if (!cards)  {
                    socket.emit('noCardsSubmitted');
                    return;
                }
                
                if (socket != this.currentPlayer) {
                    socket.emit('notYourTurn');
                    return;
                }

                let stringArr = cards.map(card => card.rank + ' of ' + card.suit)
                if (stringArr.some((val, ind) => stringArr.indexOf(val) != ind)) {
                    socket.emit('duplicateCards');
                    return;
                }

                let combo = new Combo();
                for (let c of cards) {
                    combo.push(new Card(c.rank, c.suit));
                }
                
                combo.parse();
                if (combo.name == 'Invalid') {
                    socket.emit('invalidCombo');
                    return;
                }

                if (!socket.hand.contains(combo)) {
                    socket.emit('comboNotInHand');
                    return;
                }

                if (!this.newTrick) {
                    if (!combo.canPlayOn(this.previousCombo)) {
                        socket.emit('comboNotPlayable');
                        return;
                    }
                }
                this.newTrick = false;
                
                this.previousCombo = combo;
                this.previousPlayer = socket;
                socket.emit('comboAccepted', combo.toObjArr());
                this.emitToRoom('comboPlayed', combo.toObjArr());

                socket.hand.play(combo);
                console.log(socket.hand);
                if (socket.hand.cards.length == 0) {
                    socket.emit('youWin');
                    this.emitToRoom('gameEnds');
                    room.inGame = false;
                    return;
                }
                
                socket.emit('handUpdate', socket.hand.toObjArr());
                this.advanceTurn();
                if (callback) {
                    callback();
                }
            });

            /*
            socket.on('skipTurn', (callback) => {
                if (!room.inGame) {
                    socket.emit('notInGame');
                    return;
                }

                if (this.currentPlayer != socket) {
                    socket.emit('notYourTurn');
                    return;
                }
                
                socket.emit('skippedTurn');
                this.advanceTurn();
            });
            */
        }
    }

    advanceTurn() {
        this.turn += 1;
        this.turn %= 3;
        this.currentPlayer = this.room.sockets[this.turn];
        while (!this.currentPlayer.hand.canPlayOn(this.previousCombo)
              && this.currentPlayer != this.previousPlayer) {
            this.turn += 1;
            this.turn %= 3;
            this.currentPlayer = this.room.sockets[this.turn];
              }
        if (this.currentPlayer == this.previousPlayer) {
            this.emitToRoom('trickEnds');
            this.newTrick = true;
            this.previousCombo = undefined;
            this.previousPlayer = undefined;
        }
        this.currentPlayer.emit('yourTurn');
    }

    emitToRoom(event, ...args) {
        let room = this.room;
        for (let s of room.sockets) {
            s.emit(event, ...args);
        }
    }

    printDeck() {
        console.log(this.deck);
    }

    printRoom() {
        console.log(this.room);
    }

    printHands() {
        for (let s of this.room.sockets) {
            console.log(s.hand);
        }
    }
}

class Card {
    constructor(rank, suit) {
        this.rank = rank;
        this.suit = suit;
    }
}

const valueMap = {
    '3': 0,
    '4': 1,
    '5': 2,
    '6': 3,
    '7': 4,
    '8': 5,
    '9': 6,
    '10': 7,
    'J': 8,
    'Q': 9,
    'K': 10,
    'A': 11,
    '2': 12
};

function compare(card1, card2) {
        if (card1.rank == card2.rank) {
            if (card1.suit < card2.suit) {
                return -1;
            } else if (card1.suit > card2.suit) {
                return 1;
            } else {
                return 0;
            }
        }
    
        return valueMap[card1.rank] - valueMap[card2.rank];
    }

class Deck {
    constructor() {
        let ranks = ['3','4','5','6','7','8','9','10','J','Q','K'];
        let suits = ['Hearts', 'Spades', 'Diamonds', 'Clubs'];
        this.cards = [];
        
        for (let s of suits) {
            for (let r of ranks) {
                this.cards.push(new Card(r, s));
            }
        }
        this.cards.push(new Card('A', 'Hearts'));
        this.cards.push(new Card('A', 'Diamonds'));
        this.cards.push(new Card('A', 'Clubs'));
        this.cards.push(new Card('2', 'Spades'));

        this.shuffle();
    }

    shuffle() {
        let cards = this.cards;
        for (let i = cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [cards[i], cards[j]] = [cards[j], cards[i]];
        }
    }

    pop() {
        return this.cards.pop();
    }
}

class Hand {
    constructor() {
        this.cards = [];
    }

    push(card) {
        this.cards.push(card);
    }

    sort() {
        this.cards.sort(compare);
    }

    toObjArr() {
        let arr = [];
        for (let c of this.cards) {
            arr.push({rank: c.rank, suit: c.suit});
        }
        return arr;
    }

    contains(combo) {
        for (let c of combo.cards) {
            if (!this.cards.some(card => card.rank == c.rank && card.suit == c.suit)) {
                console.log(c);
                return false;
            }
        }
        return true;
    }

    play(combo) {
        this.cards = this.cards.filter((c) => {
            return !combo.cards.some(card => card.rank == c.rank && card.suit == c.suit)
        });
    }

    canPlayOn(combo) {
        let cardCount = combo.base * combo.length + combo.kicker;
        let comboValue = combo.value;
        if (this.cards.length < cardCount) {
            return false;
        }

        let ranks = this.getRankArray();
        console.log(ranks);
        let highestValue = 0;
        let currentLength = 0;
        let hasBomb = false;
        for (let i = 0; i < ranks.length; i++) {
            let rankCount = ranks[i];
            if (rankCount == 4) {
                hasBomb = true;
            }
            if (rankCount >= combo.base) {
                currentLength += 1;
                if (currentLength >= combo.length) {
                    highestValue = i
                }
            } else {
                currentLength = 0;
            }
        }
        if (highestValue > combo.value) {
            return true;
        }
        if (combo.name != 'Bomb' && hasBomb) {
            return true;
        }

        return false;
    }

    getRankArray() {
        let arr = new Array(13).fill(0);
        for (let c of this.cards) {
            arr[valueMap[c.rank]] += 1;
        }
        return arr;
    }
}

class Combo {
    constructor() {
        this.cards = [];
    }

    push(card) {
        this.cards.push(card);
    }

    sort() {
        this.cards.sort(compare);
    }

    toObjArr() {
        let arr = [];
        for (let c of this.cards) {
            arr.push({rank: c.rank, suit: c.suit});
        }
        return arr;
    }

    canPlayOn(other) {
        if (this.name == 'Bomb' && other.name != 'Bomb') {
            return true;
        }
        return this.name == other.name &&
            this.base == other.base &&
            this.length == other.length &&
            this.kicker == other.kicker &&
            this.value > other.value;
    }

    parse() {
        this.sort();
        
        let cards = this.cards;
        if (cards.length == 0) {
            this.name = 'Invalid';
            return;
        }
        if (cards.length == 1) {
            this.name = 'Single';
            this.base = 1;
            this.length = 1;
            this.rank = cards[0].rank;
            this.value = valueMap[this.rank];
            return;
        }
        
        let dict = comboDict[cards.length];
        let matches = [];
        for (let exp of Object.keys(dict)) {
            let match = this.ofForm(exp);
            if (match) {
                let info = dict[exp];
                matches.push({
                    rank: match.rank,
                    value: valueMap[match.rank],
                    info: info
                });
            }
        }
        
        if (matches.length == 0) {
            this.name = 'Invalid';
            return;
        }

        matches.sort((a, b) => {
            let base = a.info.base - b.info.base;
            let length = a.info.length - b.info.length;
            let value = a.value - b.value;
            if (base != 0) {
                return base;
            } else if (length != 0) {
                return length;
            } else if (value != 0) {
                return value;
            } else {
                if (a.info.complete && !b.info.complete) {
                    return 1;
                } else if (!a.info.complete && b.info.complete) {
                    return -1;
                }
            }
            return 0;
        });
        console.log(matches);

        let finalMatch = matches.pop();
        console.log(finalMatch);
        this.rank = finalMatch.rank;
        this.value = finalMatch.value;
        for (let prop of Object.keys(finalMatch.info)) {
            this[prop] = finalMatch.info[prop];
        }
    }

    ofForm(matchString) {
        let cards = this.cards;
        let chars = [...matchString];
        if (chars.length != cards.length) {
            return false;
        }

        let currentCard = cards[0];
        let currentChar = chars[0];
        let returnCard = undefined;
        for (let i = 1; i < chars.length; i++) {
            if (chars[i] == '#') {
                continue;
            }
            if (chars[i - 1] == '#') {
                currentCard = cards[i];
                currentChar = chars[i];
                continue;
            }
            if (chars[i] == 'Z') {
                if (cards[i].rank == '2') {
                    return false;
                } else {
                    returnCard = cards[i];
                }
            }
            
            if (chars[i] == currentChar) {
                if (currentCard.rank != cards[i].rank) {
                    return false;
                }
            } else if (valueMap[currentCard.rank] + 1 != valueMap[cards[i].rank]) {
                return false;
            }

            currentCard = cards[i];
            currentChar = chars[i];
        }
        return returnCard;
    }
}

exports.CardGame = CardGame;
exports.Card = Card;
exports.compare = compare;
exports.Combo = Combo;
exports.Hand = Hand;