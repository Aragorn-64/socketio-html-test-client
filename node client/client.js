const fs = require('fs');
// const { io } = require('socket.io-client');
import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

// Read the configuration from the JSON file
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

const {
    urlInput,
    simpleConnCheck,
    numConnsInput,
    connRateInput,
    messageContentInput,
    channelInput,
    messageDelay
} = config;

// currentConns,
// maxConns,
// totalMessagesSent,
// totalMessagesReceived,
// messagesReceivedLastSecond,


let socketConns = new Set();
let listeningTo = new Set();

function errAlert(err) {
    console.error(err);
}

function newConn() {
    if (urlInput === '') {
        throw new Error('URL field is empty');
    }

    const sock = io(urlInput, {
        transports: ['websocket'],
        upgrade: false
    });

    sock.on('connect', () => {
        socketConns.add(sock);
        console.log(`sock ${sock.id} connected`);
    });

    sock.on('message', (message) => {
        console.log(`Message received: ${message}`);
    });

    sock.on('disconnect', (reason) => {
        socketConns.delete(sock);
        console.log(`sock disconnected due to ${reason}`);
    });
};

const startConnections = () => {
    let numConns = parseInt(numConnsInput);
    let connRate = parseInt(connRateInput);

    if (isNaN(numConns) || isNaN(connRate)) {
        throw new Error('Please enter valid numbers for the number of connections and connection rate.');
    }

    const timeInterval = 1000 / connRate;

    for (let i = 0; i < numConns; i++) {
        setTimeout(newConn, i * timeInterval);
    }
};

const sendMessage = () => {
    let delay = parseInt(messageDelay);

    if (isNaN(delay)) {
        throw new Error('Please enter a valid delay value in the configuration.');
    }

    setTimeout(() => {
        socketConns.forEach((sock) => {
            sock.emit(channelInput, messageContentInput);
        });
    }, delay);
};

startConnections();
sendMessage();
