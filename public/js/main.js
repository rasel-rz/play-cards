const socket = io();
let $cards, animationTimeout;
socket.emit('joinPlayer', `Player Joined`);

socket.on('inGame', ({ player, players }) => {
    document.querySelector('#player').textContent = `You are playing as ${player.toUpperCase()}`;
    document.querySelectorAll('#playground .card-holder:not(:first-child)').forEach((elem, index) => {
        elem.style.setProperty('--player', players[index]);
        elem.setAttribute('aria-label', `Player ${players[index]}`);
        elem.setAttribute('data-player', players[index]);
    });
});

socket.on('hand', ({ cards, message }) => {
    $cards = JSON.parse(JSON.stringify(cards));
    renderHand(cards);
    updateMessage(message);
});

socket.on('cardPlayed', ({ message, error, cardholder, card }) => {
    updateMessage(message);
    if (error) {
        clearTimeout(animationTimeout);
        document.querySelector('.playing')?.classList.remove('playing');
        return;
    }
    if (cardholder) {
        let cardHolderElem = document.querySelector(`#playground .card-holder[data-player="${cardholder}" i]`);
        if (cardHolderElem) {
            cardHolderElem.appendChild(createCard(card));
            setTimeout(() => {
                cardHolderElem.querySelector('.card:last-child').classList.add('fade-in');
            }, 0);
        }
    }
    checkLeadProgress();
});

socket.on('leadCompleted', ({ message }) => {
    clearPlayground();
    updateMessage(message);
});

socket.on('outOfRoom', message => {
    updateMessage(message);
    document.querySelector('#playground')?.remove();
    document.querySelector('#cards').innerHTML = '';
    document.querySelector('#player').textContent = '';
});

socket.on('playerLeft', updatePlayerStatus);
socket.on('playerJoined', updatePlayerStatus);

function updatePlayerStatus({ message, count }) {
    updateCount(count);
    updateMessage(message);
    document.querySelectorAll('.card').forEach(card => card.remove());
    document.querySelector('#playground').classList.remove('appear');
}

function updateMessage(message) {
    document.querySelector('#message').innerHTML = message;
}

function updateCount(count) {
    document.querySelector('#count span').textContent = count;
}

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
    if (document.querySelector('#playground.pulse')) return;
    cardElem.classList.add('playing');
    let cardPostion = cardElem.getBoundingClientRect();
    let playgroundPosition = document.querySelector('#playground .card-holder').getBoundingClientRect();
    cardElem.style.setProperty('--playing-x', `${playgroundPosition.left + (playgroundPosition.width / 2) - (cardPostion.width / 2) - cardPostion.left}px`);
    cardElem.style.setProperty('--playing-y', `${playgroundPosition.top - cardPostion.top}px`);
    sessionStorage.setItem('playedCardIndex', [...cardElem.parentElement.children].indexOf(cardElem));
    animationTimeout = setTimeout(() => {
        document.querySelector('#playground .card-holder').appendChild(cardElem);
        cardElem.classList.remove('playing');
        checkLeadProgress();
        cardElem.removeEventListener('click', playCard.bind(this, card, cardElem));
    }, 1000);
    socket.emit('playCard', card);
}

function checkLeadProgress() {
    if (document.querySelectorAll('#playground .card-holder .card').length == 4) {
        document.querySelector('#playground').classList.add('pulse');
    } else {
        document.querySelector('#playground').classList.remove('pulse');
    }
}

document.querySelector('#playground').addEventListener('click', () => {
    if (document.querySelector('#playground').classList.contains('pulse')) {
        socket.emit('leadComplete');
        clearPlayground();
    }
});

function clearPlayground() {
    document.querySelectorAll('#playground .card-holder .card')
        .forEach(card => card.remove());
    checkLeadProgress();
}

window.onbeforeunload = function () {
    socket.disconnect();
};