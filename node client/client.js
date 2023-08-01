const fs = require('fs');
const { io } = require('socket.io-client');

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

let currentConns = 0;
let maxConns = 0;
let totalMessagesSent = 0;
let totalMessagesReceived = 0;
let messagesReceivedLastSecond = 0;

let socketConns = new Set();
let listeningTo = new Set();

function errAlert(err) {
    console.error(err);
}

let endCount = 0;
function newConn() {
    if (urlInput === '') {
        throw new Error('URL field is empty');
    }
    let end = endCount % 5 + 1
    endCount++
    const selectedUrl = urlInput + end; // Cyclic selection of URLs
    console.log(end)

    const sock = io(selectedUrl, {
        transports: ['websocket'],
        upgrade: false
    });

    sock.on('connect', () => {
        socketConns.add(sock);
        console.log(`sock ${sock.id} connected to ${selectedUrl}`);
        currentConns++;
    });

    sock.on('message', (message) => {
        totalMessagesReceived++;
        // if(selectedUrl[-1])
        // console.log(message);
    });

    sock.on('disconnect', (reason) => {
        socketConns.delete(sock);
        console.log(`sock disconnected due to ${reason}`);
    });
};

const startConnections = () => {
    if (simpleConnCheck === true) {
        newConn()
    }
    else {
        let numConns = parseInt(numConnsInput);
        let connRate = parseInt(connRateInput);

        if (isNaN(numConns) || isNaN(connRate)) {
            throw new Error('Please enter valid numbers for the number of connections and connection rate.');
        }

        const timeInterval = 1000 / connRate;

        for (let i = 0; i < numConns; i++) {
            setTimeout(newConn, i * timeInterval);
        }
    }

};

const sendMessage = () => {
    let delay = parseInt(messageDelay);

    if (isNaN(delay)) {
        throw new Error('Please enter a valid delay value in the configuration.');
    }

    setTimeout(() => {
        socketConns.forEach((sock) => {
            totalMessagesSent++;
            sock.emit(channelInput, JSON.stringify(messageContentInput));
        });
        console.log('sent messages')
    }, delay * 1000);
};

let prevTotal = 0
const startLogging = () => {
    setInterval(() => {
        messagesReceivedLastSecond = totalMessagesReceived - prevTotal
        prevTotal = totalMessagesReceived
        console.table({
            currentConns: socketConns.size,
            maxConns: Math.max(currentConns, maxConns),
            totalMessagesSent,
            totalMessagesReceived,
            messagesReceivedLastSecond
        });
    }, 500);
}

startConnections();
console.log(`Waiting for ${messageDelay} seconds to send messages ...`)
sendMessage();
startLogging();
