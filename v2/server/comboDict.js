const comboDict = {
    2: {
        'ZZ': {
            name: 'Pair',
            base: 2,
            length: 1,
            kicker: 0,
            complete: true
        }
    },
    3: {
        'ZZZ': {
            name: 'Triple',
            base: 3,
            length: 1,
            kicker: 0,
            complete: true
        }
    },
    4: {
        'ZZZZ': {
            name: 'Bomb',
            base: 4,
            length: 1,
            kicker: 0,
            complete: true
        },
        'AAZZ': {
            name: 'Consecutive Pairs',
            base: 2,
            length: 2,
            kicker: 0,
            complete: true
        }
    },
    5: {
        'ABCDZ': {
            name: 'Consecutive Singles',
            base: 1,
            length: 5,
            kicker: 0,
            complete: true
        }
    },
    6: {
        'ABCDEZ': {
            name: 'Consecutive Singles',
            base: 1,
            length: 6,
            kicker: 0,
            complete: true
        },
        'AABBZZ': {
            name: 'Consecutive Pairs',
            base: 2,
            length: 3,
            kicker: 0,
            complete: true
        },
        'AAAZZZ': {
            name: 'Consecutive Triples',
            base: 3,
            length: 2,
            kicker: 0,
            complete: true
        }
    },
    7: {
        'ABCDEFZ': {
            name: 'Consecutive Singles',
            base: 1,
            length: 7,
            kicker: 0,
            complete: true
        },
    },
    8: {
        'ABCDEFGZ': {
            name: 'Consecutive Singles',
            base: 1,
            length: 8,
            kicker: 0,
            complete: true
        },
        'AABBCCZZ': {
            name: 'Consecutive Pairs',
            base: 2,
            length: 4,
            kicker: 0,
            complete: true
        },
        'AAAAZZZZ': {
            name: 'Consecutive Quadruples',
            base: 4,
            length: 2,
            kicker: 0,
            complete: true
        }
    },
    9: {
        'ABCDEFGHZ': {
            name: 'Consecutive Singles',
            base: 1,
            length: 9,
            kicker: 0,
            complete: true
        },
        'AAABBBZZZ': {
            name: 'Consecutive Triples',
            base: 3,
            length: 3,
            kicker: 0,
            complete: true
        }
    },
    10: {
        'ABCDEFGHIZ': {
            name: 'Consecutive Singles',
            base: 1,
            length: 10,
            kicker: 0,
            complete: true
        },
        'AABBCCDDZZ': {
            name: 'Consecutive Pairs',
            base: 2,
            length: 5,
            kicker: 0,
            complete: true
        }
    },
    11: {
        'ABCDEFGHIJZ': {
            name: 'Consecutive Singles',
            base: 1,
            length: 9,
            kicker: 0,
            complete: true
        },
    },
    12: {
        'ABCDEFGHIJKZ': {
            name: 'Consecutive Singles',
            base: 1,
            length: 12,
            kicker: 0,
            complete: true
        },
        'AABBCCDDEEZZ': {
            name: 'Consecutive Pairs',
            base: 2,
            length: 5,
            kicker: 0,
            complete: true
        },
        'AAABBBCCCZZZ': {
            name: 'Consecutive Triples',
            base: 3,
            length: 4,
            kicker: 0,
            complete: true
        },
        'AAAABBBBZZZZ': {
            name: 'Consecutive Quadruples',
            base: 4,
            length: 3,
            kicker: 0,
            complete: true
        }
    },
    13: {},
    14: {
        'AABBCCDDEEFFZZ': {
            name: 'Consecutive Pairs',
            base: 2,
            length: 7,
            kicker: 0,
            complete: true
        }
    },
    15: {
        'AAABBBCCCDDDZZZ': {
            name: 'Consecutive Triples',
            base: 3,
            length: 5,
            kicker: 0,
            complete: true
        }
    },
    16: {
        'AABBCCDDEEFFGGZZ': {
            name: 'Consecutive Pairs',
            base: 2,
            length: 8,
            kicker: 0,
            complete: true
        },
        'AAAABBBBCCCCZZZZ': {
            name: 'Consecutive Quadruples',
            base: 4,
            length: 4,
            kicker: 0,
            complete: true
        }
    },
}

const kickerCombos = {
    'ZZZ': {
        name: 'Triple with Kicker',
        base: 3,
        length: 1,
        range: [4, 5]
    },
    'AAAZZZ': {
        name: 'Consecutive Triples with Kicker',
        base: 3,
        length: 2,
        range: [7, 10]
    },
    'AAABBBZZZ': {
        name: 'Consecutive Triples with Kicker',
        base: 3,
        length: 3,
        range: [10, 15]
    },
    'AAABBBCCCZZZ': {
        name: 'Consecutive Triples with Kicker',
        base: 3,
        length: 4,
        range: [13, 16]
    },
    'ZZZZ': {
        name: 'Quadruple with Kicker',
        base: 4,
        length: 1,
        range: [5, 7]
    },
    'AAAAZZZZ': {
        name: 'Consecutive Quadruples with Kicker',
        base: 4,
        length: 2,
        range: [9, 14]
    },
    'AAAABBBBZZZZ': {
        name: 'Consecutive Quadruples with Kicker',
        base: 4,
        length: 3,
        range: [13, 16]
    }
}

for (let exp of Object.keys(kickerCombos)) {
    let info = kickerCombos[exp];
    let min = info.range[0];
    let max = info.range[1];
    for (let i = min; i <= max; i++) {
        let kicker = i - (min - 1);
        let complete = i == max;
        for (let left = 0; left <= kicker; left++) {
            let newExp = '#'.repeat(left) + exp + '#'.repeat(kicker-left);
            comboDict[i][newExp] = {
                name: info.name,
                base: info.base,
                length: info.length,
                kicker: kicker,
                complete: complete
            }
        }
    }
}

exports.comboDict = comboDict;