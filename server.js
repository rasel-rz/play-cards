const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const botName = 'Chat Bot';
const deck = require('./utils/deck');

//Setting the static frontend
app.use(express.static(path.join(__dirname, 'public')));
const PLAYER__NAMES = ['Red', 'Green', 'Yellow', 'Blue'];
let players = [];
let playerCards = [];


// Getting a new deck
let myDeck = deck.getNewDeck();
deck.shuffleDeck(myDeck);
let currentTurn = 0;
function getPlayerInOrders(playerName) {
    let playerIndex = PLAYER__NAMES.indexOf(playerName);
    let playerOrder = [];
    for (let i = playerIndex + 1; playerOrder.length < PLAYER__NAMES.length - 1; i++) {
        playerOrder.push(PLAYER__NAMES[i % PLAYER__NAMES.length]);
    }
    return playerOrder;
}

// Setting up socket.io
io.on('connection', socket => {
    socket.on('joinPlayer', () => {
        players.push(socket.id);
        if (players.length <= PLAYER__NAMES.length) {
            let playerName = PLAYER__NAMES[players.length - 1];
            let message = `${playerName} joined with ID: ${socket.id}`;
            io.to(socket.id).emit('playerJoined', {
                message,
                player: playerName,
                players: getPlayerInOrders(playerName),
                id: socket.id
            });
            let cards = deck.drawHand(myDeck, 13, playerName)
            playerCards.push(cards);
            io.to(socket.id).emit('hand', cards);
        } else {
            io.to(socket.id).emit('outOfRoom', 'Sorry, the room is full!!');
            players.pop();
        }
    });

    socket.on('playCard', card => {
        let player = players.find(player => player === socket.id);
        let playerIndex = players.indexOf(player);
        if (players.length !== PLAYER__NAMES.length) {
            let message = `Waiting for other players to join`;
            io.emit('cardPlayed', { message, error: true });
            return;
        }
        if (currentTurn !== players.indexOf(socket.id)) {
            let message = `It's not your turn, @${PLAYER__NAMES[playerIndex]}!!`;
            io.to(socket.id).emit('cardPlayed', { message, error: true });
            return;
        }
        let nextPlayerIndex = (playerIndex + 1) % players.length;
        let message = `${PLAYER__NAMES[playerIndex].toUpperCase()} played ${card.value} of ${card.suit}<br/>Now it's ${PLAYER__NAMES[nextPlayerIndex]}'s turn`;
        io.emit('cardPlayed', { message, error: false, cardholder: PLAYER__NAMES[currentTurn], card });
        currentTurn = (currentTurn + 1) % players.length;
    });

    socket.on('leadComplete', () => {
        let player = players.find(player => player === socket.id);
        let playerIndex = players.indexOf(player);
        socket.broadcast.emit('leadCompleted', { message: `${PLAYER__NAMES[playerIndex]} collected the lead` });
        io.to(socket.id).emit('leadCompleted', { message: `You collected the lead` });
    });

    socket.on('disconnect', () => {
        let playerIndex = players.indexOf(socket.id);
        myDeck = myDeck.concat(playerCards[playerIndex]).filter(x => x);
        let player = PLAYER__NAMES[playerIndex];
        players = players.filter(player => player !== socket.id);
        io.emit('playerLeft', `${player} left the game`);
        console.log(`${player} left the game`);
    });
});

// Starting the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT} ==> http://localhost:${PORT}`));