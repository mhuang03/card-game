const {CardGame, Card, compare, Combo} = require('./game.js');
const {comboDict} = require('./comboDict.js');
const uuid = require('uuid').v4;

class Socket {
    constructor() {
        this.id = uuid();
    }

    emit(event, ...args) {
        console.log(event, ...args);
    }
}

let game = new CardGame({
    sockets: [
        new Socket(),
        new Socket(),
        new Socket()
    ]
});

//game.printHands();
//console.log(game);

let combo = new Combo();
combo.push(new Card('Q', 'Hearts'));
combo.push(new Card('Q', 'Hearts'));
combo.push(new Card('Q', 'Hearts'));
combo.push(new Card('J', 'Spades'));
combo.push(new Card('J', 'Diamonds'));
combo.push(new Card('J', 'Diamonds'));
combo.push(new Card('K', 'Diamonds'));
combo.push(new Card('K', 'Diamonds'));
combo.push(new Card('K', 'Diamonds'));
combo.push(new Card('A', 'Diamonds'));
combo.parse();
console.log(combo);

//console.log(comboDict[4]);