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
            Spades: 'spades'
        }

        let $li = $('<li></li>');
        
        let $label = $('<label></label>', {
            for: `c-${rank}-${suit}`,
            class: `card rank-${rank.toLowerCase()} ${suitMap[suit]}`,
            rank: rank,
            suit: suit
        });

        let $rank = $('<span></span>', {
            class: 'rank',
            text: rank
        });

        let $suit = $('<span></span>', {
            class: 'suit'
        }).html(`&${suitMap[suit]};`);

        let $checkbox = $('<input></input>', {
            type: 'checkbox',
            name: `c-${rank}-${suit}`,
            id: `c-${rank}-${suit}`,
            value: 'select',
            class: 'hidden'
        });

        $label.append($rank);
        $label.append($suit);
        $label.append($checkbox);
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
            Spades: 'spades'
        }

        let $li = $('<li></li>');
        
        let $div = $('<div></div>', {
            class: `card rank-${rank.toLowerCase()} ${suitMap[suit]}`,
            rank: rank,
            suit: suit
        });

        let $rank = $('<span></span>', {
            class: 'rank',
            text: rank
        });

        let $suit = $('<span></span>', {
            class: 'suit'
        }).html(`&${suitMap[suit]};`);

        $div.append($rank);
        $div.append($suit);
        $li.append($div);
        this.$li = $li;
    }

    function DisplayCardBack() {
        let $li = $('<li></li>');
        
        let $div = $('<div></div>', {
            class: `card back`
        });
        $li.append($div);
        this.$li = $li;
    }

    App.Card = Card;
    App.DisplayCard = DisplayCard;
    App.DisplayCardBack = DisplayCardBack;
    window.App = App;
})(window);