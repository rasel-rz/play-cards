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
let $players = [
    { name: "Red", id: undefined, cards: undefined },
    { name: "Green", id: undefined, cards: undefined },
    { name: "Orange", id: undefined, cards: undefined },
    { name: "Blue", id: undefined, cards: undefined }
];

// Getting a new deck
let myDeck = [];
let currentTurn = 0;

// Player ordering for visual purposes
function getPlayerInOrders(playerName) {
    let playerIndex = $players.findIndex(player => player.name === playerName);
    let playerOrder = [];
    for (let i = playerIndex + 1; playerOrder.length < $players.length - 1; i++) {
        playerOrder.push($players[i % $players.length]);
    }
    return playerOrder.map(player => player.name);
}

// Setting up socket.io
io.on('connection', socket => {
    socket.on('joinPlayer', () => {
        if ($players.find(x => x.id === undefined)) {
            $players.find(x => x.id === undefined).id = socket.id;
            let player = $players.find(x => x.id === socket.id);
            let message = `${player.name} joined the game`;
            io.to(socket.id).emit('inGame', {
                player: player.name,
                players: getPlayerInOrders(player.name)
            });
            io.emit('playerJoined', {
                message,
                count: $players.filter(x => x.id !== undefined).length,
            });
        } else {
            io.to(socket.id).emit('outOfRoom', 'Sorry, the room is full!!');
            return;
        }
        if ($players.every(x => x.id)) {
            myDeck = deck.getNewDeck();
            deck.shuffleDeck(myDeck);
            currentTurn = 0;
            $players.forEach(player => {
                player.cards = deck.drawHand(myDeck, 13, player.name);
                io.to(player.id).emit('hand', {
                    cards: player.cards,
                    message: `---- Game started ----<br/>Now it's Red's turn`
                });
            });
        }
    });

    socket.on('playCard', card => {
        let player = $players.find(x => x.id === socket.id);
        let playerIndex = $players.indexOf(player);
        if ($players.find(x => x.id === undefined)) {
            let message = `Waiting for other players to join`;
            io.emit('cardPlayed', { message, error: true });
            return;
        }
        if (currentTurn !== $players.indexOf(player)) {
            let message = `It's not your turn, @${player.name}!!`;
            io.to(socket.id).emit('cardPlayed', { message, error: true });
            return;
        }
        let nextPlayerIndex = (playerIndex + 1) % $players.length;
        let nextPlayer = $players[nextPlayerIndex];
        let message = `${player.name.toUpperCase()} played ${card.value} of ${card.suit}<br/>Now it's ${nextPlayer.name}'s turn`;
        io.emit('cardPlayed', { message, error: false, cardholder: player.name, card });
        currentTurn = (currentTurn + 1) % $players.length;
    });

    socket.on('leadComplete', () => {
        let player = $players.find(x => x.id === socket.id);
        socket.broadcast.emit('leadCompleted', { message: `${player.name} collected the lead` });
        io.to(socket.id).emit('leadCompleted', { message: `You collected the lead` });
    });

    socket.on('disconnect', () => {
        let player = $players.find(x => x.id === socket.id);
        console.log(`${player?.name || 'Guest'} left the game`);
        if (player) {
            player.cards = undefined;
            player.id = undefined;
            io.emit('playerLeft', {
                message: `${player.name} left, waiting for another player to join`,
                count: $players.filter(x => x.id !== undefined).length
            });
        }
    });
});

// Starting the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT} ==> http://localhost:${PORT}`));