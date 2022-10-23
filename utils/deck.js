const deck = require('./deck.json');

const getNewDeck = () => {
    console.log('Getting a new deck of cards');
    return JSON.parse(JSON.stringify(deck));
};

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const drawHand = (deck, count, playerName) => {
    console.log(`${playerName} drawing a hand of cards`);
    let cards = deck.splice(0, count);
    return cards.map(card => {
        card.sortedValue = card.code
            .replace('S', 'W')
            .replace('H', 'X')
            .replace('C', 'Y')
            .replace('D', 'Z')
            .split("").reverse().join("")
            .replace('J', 'B')
            .replace('Q', 'C')
            .replace('K', 'D')
            .replace('A', 'E')
            .replace('0', 'A');
        return card;
    }).sort((a, b) => a.sortedValue.localeCompare(b.sortedValue));
};

const shuffleDeck = (deck) => {
    console.log('Shuffling deck');
    return shuffleArray(deck);
};

module.exports = { getNewDeck, drawHand, shuffleDeck };