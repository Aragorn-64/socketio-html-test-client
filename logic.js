const urlInput = document.getElementById("urlInput");
const simpleConnCheck = document.getElementById("simpleConnCheck");
const connectButton = document.getElementById("connectButton");
const numConnsInput = document.getElementById("numConns");
const connRateInput = document.getElementById("connRate");
const messageContentInput = document.getElementById("messageContent");
const channelInput = document.getElementById("channelInput");
const sendButton = document.getElementById("sendButton");
const currentConns = document.getElementById("currentConns");
const maxConns = document.getElementById("maxConns");
const totalMessagesSent = document.getElementById("totalMessagesSent");
const totalMessagesReceived = document.getElementById(
    "totalMessagesReceived"
);
const messagesReceivedLastSecond = document.getElementById(
    "messagesReceivedLastSecond"
);

import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

let socketConns = new Set();
let listeningTo = new Set();

function errAlert(err) {
    alert(err);
}


// Default values
const defaultValues = {
    urlInput: "",
    simpleConnCheck: true,
    numConnsInput: 1,
    connRateInput: 1,
    messageContentInput: "",
    channelInput: "message",
    currentConns: 0,
    maxConns: 0,
    totalMessagesSent: 0,
    totalMessagesReceived: 0,
    messagesReceivedLastSecond: 0,
};

// Load values from localStorage on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
    const values = {
        urlInput: getFromLocalStorage("urlInput"),
        simpleConnCheck: getFromLocalStorage("simpleConnCheck"),
        numConnsInput: getFromLocalStorage("numConnsInput"),
        connRateInput: getFromLocalStorage("connRateInput"),
        messageContentInput: getFromLocalStorage("messageContentInput"),
        channelInput: getFromLocalStorage("channelInput"),
    };

    // Set values to defaults if not found in localStorage
    for (const key in values) {
        if (values[key] === null) {
            values[key] = defaultValues[key];
        }
    }

    // Set values to elements
    urlInput.value = values.urlInput;
    simpleConnCheck.checked = values.simpleConnCheck;
    numConnsInput.value = values.numConnsInput;
    connRateInput.value = values.connRateInput;
    messageContentInput.value = values.messageContentInput;
    channelInput.value = values.channelInput;
    currentConns.innerHTML = 0;
    maxConns.innerHTML = 0;
    totalMessagesSent.innerHTML = 0;
    totalMessagesReceived.innerHTML = 0;
    messagesReceivedLastSecond.innerHTML = 0;

    if (checkbox.checked) {
        connOptionsRow.classList.add("hidden");
    }
});

// Store values to localStorage on beforeunload
window.addEventListener("beforeunload", () => {
    setToLocalStorage("urlInput", urlInput.value);
    setToLocalStorage("simpleConnCheck", simpleConnCheck.checked);
    setToLocalStorage("numConnsInput", numConnsInput.value);
    setToLocalStorage("connRateInput", connRateInput.value);
    setToLocalStorage("messageContentInput", messageContentInput.value);
    setToLocalStorage("channelInput", channelInput.value);
});

const checkbox = document.getElementById("simpleConnCheck");
const connOptionsRow = document.getElementById("connOptionsRow");

checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
        connOptionsRow.classList.add("hidden");
    } else {
        connOptionsRow.classList.remove("hidden");
    }
});

// Getter function to retrieve data from localStorage
function getFromLocalStorage(key) {
    const data = localStorage.getItem(key);
    if (data) {
        return JSON.parse(data);
    }
    return null;
}

// Setter function to store data in localStorage
function setToLocalStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function newConn() {
    if (urlInput.value == "") {
        throw new Error('URL field is empty')
    }
    const sock = io(urlInput.value, {
        transports: ["websocket"],
        upgrade: false,
    });

    sock.on("connect", () => {
        socketConns.add(sock);
        console.log(`sock ${sock.id} connected`);
        // currentConns.innerHTML++;
        connectButton.textContent = "Disconnect";
        connectButton.style.backgroundColor = "#F44336";
    });

    sock.on("message", (message) => {
        totalMessagesReceived.innerHTML++;
        console.log(`${sock.id}`);
        console.log(message)
    });

    sock.on("disconnect", (reason) => {
        // currentConns.innerHTML--;
        socketConns.delete(sock);
        console.log(`sock disconnected due to ${reason}`);
    });
}


let connectionInterval = null
connectButton.addEventListener("click", () => {
    updateMetrics()
    if (connectButton.textContent === "Connect") {
        try {
            let numConns = 1
            let connRate = 1
            if (!checkbox.checked) {
                numConns = parseInt(numConnsInput.value);
                connRate = parseInt(connRateInput.value);
            }
            const timeInterval = 1000 / connRate

            if (isNaN(numConns) || isNaN(connRate)) {
                throw new Error('Please enter valid numbers for the number of connections and connection rate.');
            }

            // let connectionsCount = 0; // Variable to keep track of the number of connections created

            for (let i = 0; i < numConns; i++) {
                setTimeout(newConn, i * timeInterval);
            }
        } catch (err) {
            errAlert(err)
            console.log(err);
        }
    } else {
        // clearInterval(connectionInterval);
        socketConns.forEach((sock) => {
            sock.close();
        });
        listeningTo.clear()
        connectButton.textContent = "Connect";
        connectButton.style.backgroundColor = "#4CAF50";
    }
});

sendButton.addEventListener("click", () => {
    sendButton.style.backgroundColor = "#808080"; // Change the background color to grey
    setTimeout(() => {
        sendButton.style.backgroundColor = ""; // Reset the background color to default
    }, 200); // Wait for 200 milliseconds

    if (channelInput.value != "message" && !listeningTo.has(channelInput.value)) {
        listeningTo.add(channelInput.value)
        socketConns.forEach((sock) => {
            //attach listener for that event on all connected sockets
            sock.on(channelInput.value, (message) => {
                totalMessagesReceived.innerHTML++;
                console.log(
                    `${sock.id} : ${channelInput.value} : `
                );
                console.log(message)
            });
        });
    }

    //send the message input to all connected sockets
    socketConns.forEach((sock) => {
        sock.emit(channelInput.value, messageContentInput.value);
    });
});

// connection count metric
function updateMetrics() {
    currentConns.innerHTML = socketConns.size
    maxConns.innerHTML = Math.max(currentConns.innerHTML, maxConns.innerHTML)
}

setInterval(updateMetrics, 1000)

// help button logic
const helpButton = document.getElementById('helpButton');
const helpDiv = document.getElementById('helpDiv');

helpButton.addEventListener('click', () => {
    if (helpButton.innerText === 'Help') {
        helpButton.innerText = 'Help X';
        helpDiv.classList.add('show');
    } else {
        helpButton.innerText = 'Help';
        helpDiv.classList.remove('show');
    }
});
