const {CardGame, Card, compare, Combo, Hand} = require('./game.js');
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
/*
let game = new CardGame({
    sockets: [
        new Socket(),
        new Socket(),
        new Socket()
    ]
});*/

//game.printHands();
//console.log(game);
let hand = new Hand();
hand.push(new Card('Q', 'Hearts'));
hand.push(new Card('Q', 'Diamonds'));
hand.push(new Card('Q', 'Clubs'));
hand.push(new Card('J', 'Spades'));
console.log(hand);

let combo = new Combo();
combo.push(new Card('Q', 'Diamonds'));
combo.push(new Card('Q', 'Clubs'));
combo.push(new Card('Q', 'Hearts'));
combo.push(new Card('J', 'Spades'));
combo.parse();
//console.log(combo);
//console.log(hand.contains(combo))
hand.play(combo);
console.log(hand);

//console.log(comboDict[4]);