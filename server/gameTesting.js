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
hand.push(new Card('9', 'Spades'));
hand.push(new Card('J', 'Spades'));
hand.push(new Card('2', 'Spades'));
console.log(hand);

let combo = new Combo();
combo.push(new Card('A', 'Diamonds'));
combo.parse();
//console.log(combo);
//console.log(hand.contains(combo))
//hand.play(combo);
console.log(hand);

let combo2 = new Combo();
combo2.push(new Card('K', 'Diamonds'));
combo2.push(new Card('K', 'Clubs'));
combo2.push(new Card('K', 'Hearts'));
combo2.push(new Card('K', 'Spades'));
//combo2.parse();

console.log(hand.canPlayOn(combo));

//console.log(comboDict[4]);