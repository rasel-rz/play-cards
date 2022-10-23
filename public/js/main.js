const socket = io();
let $cards;
socket.emit('joinPlayer', `Player Joined`);

socket.on('playerJoined', ({ message, player, id }) => {
    console.log(message);
    document.querySelector('#player').textContent = `You are playing as ${player.toUpperCase()}`;
});


socket.on('hand', cards => {
    $cards = JSON.parse(JSON.stringify(cards));
    renderHand(cards);
});

function renderHand(cards) {
    let cardContainer = document.querySelector('#cards');
    cards.forEach(card => {
        cardContainer.appendChild(createCard(card));
    });

    document.querySelector('#playground').classList.add('appear');
    cardHeightAdjust();
}

function cardHeightAdjust() {
    let cardContainer = document.querySelector('#cards');
    cardContainer.style.setProperty('--card-height', 'none');
    cardContainer.style.setProperty('--card-height', `${cardContainer.getBoundingClientRect().height}px`);
}
window.onresize = cardHeightAdjust;

function formatValue(value) {
    let temp;
    switch (value) {
        case 'ACE': temp = 'A'; break;
        case 'KING': temp = 'K'; break;
        case 'QUEEN': temp = 'Q'; break;
        case 'JACK': temp = 'J'; break;
        default: temp = value;
    }
    return temp.split("").map(x => `<span>${x}</span>`).join("\n");
}

function createCard(card) {
    let cardElement = document.createElement('div');
    cardElement.classList.add('card');
    cardElement.setAttribute('aria-label', `${card.value} of ${card.suit}`);
    cardElement.setAttribute('aria-hidden', true);
    cardElement.setAttribute('role', 'button');
    cardElement.setAttribute('tabindex', 0);
    cardElement.style.setProperty('--card-color', (function () {
        switch (card.suit) {
            case 'SPADES':
            case 'CLUBS': return 'black';
            case 'HEARTS':
            case 'DIAMONDS': return 'red';
        }
    })())
    cardElement.innerHTML = `
        <span value>${formatValue(card.value)}</span>
        <span suit>
        ${(function () {
            switch (card.suit) {
                case 'SPADES': return '&spades;';
                case 'HEARTS': return '&hearts;';
                case 'DIAMONDS': return '&diams;';
                case 'CLUBS': return '&clubs;';
            }
        })()}
        </span>
    `;
    cardElement.addEventListener('click', playCard.bind(this, card, cardElement));
    return cardElement;
}

function playCard(card, cardElem) {
    cardElem.classList.add('playing');
    let cardPostion = cardElem.getBoundingClientRect();
    let playgroundPosition = document.querySelector('#playground .card-holder').getBoundingClientRect();
    cardElem.style.setProperty('--playing-x', `${playgroundPosition.left + (playgroundPosition.width / 2) - (cardPostion.width / 2) - cardPostion.left}px`);
    cardElem.style.setProperty('--playing-y', `${playgroundPosition.top - cardPostion.top}px`);
    setTimeout(() => {
        document.querySelector('#playground .card-holder').appendChild(cardElem);
        cardElem.classList.remove('playing');
    }, 1000);
    socket.emit('playCard', card);
}

window.onbeforeunload = function () {
    console.log('Leaving');
    socket.disconnect();
};