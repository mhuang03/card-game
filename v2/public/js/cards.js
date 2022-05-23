(function (window) {
    let App = window.App || {};
    let $ = window.jQuery;

    function Card(card) {
        this.rank = card.rank;
        this.suit = card.suit;
        let rank = this.rank;
        let suit = this.suit;

        const suitMap = {
            Clubs: 'clubs',
            Diamonds: 'diams',
            Hearts: 'hearts',
            Spades: 'spades',
        };

        unicodeMap = {
            Clubs: '&#9827;',
            Diamonds: '&#9830;',
            Hearts: '&#9829;',
            Spades: '&#9824;',
        };

        let $li = $('<li></li>');

        let $label = $('<label></label>', {
            for: `c-${rank}-${suit}`,
            class: `card rank-${rank.toLowerCase()} ${suitMap[suit]}`,
            rank: rank,
            suit: suit,
        });

        let $info = $('<div></div>', {
            class: `info`,
        });

        let $rank = $('<span></span>', {
            class: 'rank',
            text: rank,
        });

        let $suit = $('<span></span>', {
            class: 'suit',
        }).html(unicodeMap[suit]);

        let $checkbox = $('<input></input>', {
            type: 'checkbox',
            name: `c-${rank}-${suit}`,
            id: `c-${rank}-${suit}`,
            value: 'select',
            class: 'hidden',
        });

        $info.append($rank);
        $info.append($suit);
        $info.append($checkbox);
        $label.append($info);
        $li.append($label);
        this.$li = $li;
    }

    function DisplayCard(card) {
        this.rank = card.rank;
        this.suit = card.suit;
        let rank = this.rank;
        let suit = this.suit;

        const suitMap = {
            Clubs: 'clubs',
            Diamonds: 'diams',
            Hearts: 'hearts',
            Spades: 'spades',
        };

        unicodeMap = {
            Clubs: '&#9827;',
            Diamonds: '&#9830;',
            Hearts: '&#9829;',
            Spades: '&#9824;',
        };

        let $li = $('<li></li>');

        let $div = $('<div></div>', {
            class: `card rank-${rank.toLowerCase()} ${suitMap[suit]}`,
            rank: rank,
            suit: suit,
        });

        let $info = $('<div></div>', {
            class: `info`,
        });

        let $rank = $('<span></span>', {
            class: 'rank',
            text: rank,
        });

        let $suit = $('<span></span>', {
            class: 'suit',
        }).html(unicodeMap[suit]);

        $info.append($rank);
        $info.append($suit);
        $div.append($info);
        $li.append($div);
        this.$li = $li;
    }

    function DisplayCardBack() {
        let $li = $('<li></li>');

        let $div = $('<div></div>', {
            class: `card back`,
        });
        $li.append($div);
        this.$li = $li;
    }

    let Cards = {};
    Cards.Card = Card;
    Cards.DisplayCard = DisplayCard;
    Cards.DisplayCardBack = DisplayCardBack;
    App.Cards = Cards;
    window.App = App;
})(window);
