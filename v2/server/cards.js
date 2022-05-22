const { comboDict } = require('./comboDict.js');

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

const rankMap = Object.fromEntries(Object.entries(valueMap).map(a => a.reverse()));

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
        this.size = this.cards.length;
    }

    push(card) {
        this.cards.push(card);
        this.size = this.cards.length;
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
                return false;
            }
        }
        return true;
    }

    play(combo) {
        this.cards = this.cards.filter((c) => {
            return !combo.cards.some(card => card.rank == c.rank && card.suit == c.suit)
        });
        this.size = this.cards.length;
    }

    canPlayOn(combo) {
        let cardCount = combo.base * combo.length + combo.kicker;
        let comboValue = combo.value;
        if (this.size < cardCount) {
            return false;
        }

        let ranks = this.getRankArray();
        let highestValue = 0;
        let lowestValue = 0;
        let currentLength = 0;
        let hasBomb = false;
        let bombValue = 0;
        for (let i = 0; i < ranks.length; i++) {
            let rankCount = ranks[i];
            if (rankCount == 4) {
                hasBomb = true;
                if (bombValue == 0) {
                    bombValue = i;
                }
            }
            if (rankCount >= combo.base) {
                currentLength += 1;
                if (currentLength >= combo.length) {
                    highestValue = i
                    if (lowestValue == 0) {
                        lowestValue = i;
                    }
                }
            } else {
                currentLength = 0;
            }
        }
        if (highestValue > combo.value) {
            return {
                value: lowestValue,
                rank: rankMap[lowestValue],
                base: combo.base,
                length: combo.length,
                kicker: combo.kicker,
            };
        }
        if (combo.name != 'Bomb' && hasBomb) {
            return {
                value: bombValue,
                rank: rankMap[bombValue],
                base: 4,
                length: 1,
                kicker: 0,
            };
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
        this.size = this.cards.length;
    }

    push(card) {
        this.cards.push(card);
        this.size = this.cards.length;
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
        
        if (this.size == 0) {
            this.name = 'Invalid';
            return;
        }
        if (this.size == 1) {
            this.name = 'Single';
            this.base = 1;
            this.length = 1;
            this.rank = this.cards[0].rank;
            this.value = valueMap[this.rank];
            return;
        }
        
        let dict = comboDict[this.size];
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

        let finalMatch = matches.pop();
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

exports.Deck = Deck;
exports.Hand = Hand;
exports.Combo = Combo;
exports.Card = Card;