const protoPath = './serveroutput.proto'

function decodeServerOutput(encodedData) {
    return new Promise((resolve, reject) => {
        protobuf.load(protoPath, (err, root) => {
            if (err) {
                reject(err);
                return;
            }

            const messageType = root.lookupType("serveroutputpackage.ServerOutput");
            const decodedMessage = messageType.decode(encodedData);

            resolve(decodedMessage);
        });
    });
}

const urlInput = document.getElementById("urlInput");
const simpleConnCheck = document.getElementById("simpleConnCheck");
const lastMessageCheck = document.getElementById("lastMsgDisplayCheck");
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
const messageOutputCol = document.getElementById("messageOutputCol");
const messageOutputBox = document.getElementById("messageOutput");
const messageSizeSpan = document.getElementById("msgSize")

let givenBlockAlert = false

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
    lastMessageCheck: false,
    numConnsInput: 1,
    connRateInput: 1,
    messageContentInput: "",
    channelInput: "message",
    currentConns: 0,
    maxConns: 0,
    totalMessagesSent: 0,
    totalMessagesReceived: 0,
    messagesReceivedLastSecond: 0,
    blockAlertShown: false
};

// Load values from localStorage on DOMContentLoaded
window.addEventListener("DOMContentLoaded", () => {
    const values = {
        urlInput: getFromLocalStorage("urlInput"),
        simpleConnCheck: getFromLocalStorage("simpleConnCheck"),
        lastMessageCheck: getFromLocalStorage("lastMessageCheck"),
        numConnsInput: getFromLocalStorage("numConnsInput"),
        connRateInput: getFromLocalStorage("connRateInput"),
        messageContentInput: getFromLocalStorage("messageContentInput"),
        channelInput: getFromLocalStorage("channelInput"),
        blockAlertShown: getFromLocalStorage("blockAlertShown"),
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
    lastMessageCheck.checked = values.lastMessageCheck;
    numConnsInput.value = values.numConnsInput;
    connRateInput.value = values.connRateInput;
    messageContentInput.value = values.messageContentInput;
    channelInput.value = values.channelInput;
    currentConns.innerHTML = 0;
    maxConns.innerHTML = 0;
    totalMessagesSent.innerHTML = 0;
    totalMessagesReceived.innerHTML = 0;
    messagesReceivedLastSecond.innerHTML = 0;
    givenBlockAlert = values.blockAlertShown

    if (simpleConnCheck.checked) {
        connOptionsRow.classList.add("hidden");
    }
    if (!lastMessageCheck.checked) {
        messageOutputCol.classList.add("hidden");
    }
});

// Store values to localStorage on beforeunload
window.addEventListener("beforeunload", () => {
    setToLocalStorage("urlInput", urlInput.value);
    setToLocalStorage("simpleConnCheck", simpleConnCheck.checked);
    setToLocalStorage("lastMessageCheck", lastMessageCheck.checked);
    setToLocalStorage("numConnsInput", numConnsInput.value);
    setToLocalStorage("connRateInput", connRateInput.value);
    setToLocalStorage("messageContentInput", messageContentInput.value);
    setToLocalStorage("channelInput", channelInput.value);
    setToLocalStorage("blockAlertShown", givenBlockAlert);

});

// const simpleConnCheck = document.getElementById("simpleConnCheck");
const connOptionsRow = document.getElementById("connOptionsRow");

simpleConnCheck.addEventListener("change", () => {
    if (simpleConnCheck.checked) {
        connOptionsRow.classList.add("hidden");
    } else {
        connOptionsRow.classList.remove("hidden");
    }
});

lastMessageCheck.addEventListener("change", () => {
    if (!lastMessageCheck.checked) {
        // messageOutputBox.classList.add("hidden");
        messageOutputCol.style.display = "none"
        // messageOutputBox.innerHTML = ""
        lastMessage = ""
    } else {
        // messageOutputBox.classList.remove("hidden");
        messageOutputCol.style.display = "block"
        lastMessage = messageOutputBox.innerHTML
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

let disabled = false
let lastMessage = ""


setInterval(countMessageSize, 3000)

function countMessageSize() {
    if (lastMessage == "" || lastMessage == null) return

    let fileSize = lastMessage.byteLength
    messageSizeSpan.innerHTML = fileSize
    console.log('File size:', fileSize, 'bytes');
}

function newConn() {
    console.log('new conn called')
    if (disabled) return

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
    let SOM = null
    sock.on("message", (message) => {
        const encodedData = new Uint8Array(message); // Assuming the message is received as a Uint8Array

        decodeServerOutput(encodedData)
            .then((decodedMessage) => {
                // Handle the decoded message
                console.log(decodedMessage);
                totalMessagesReceived.innerHTML++;
                messageOutputBox.innerHTML = JSON.stringify(decodedMessage)
                lastMessage = decodedMessage
            })
            .catch((error) => {
                // Handle any errors
                console.error(error);
            });
        // console.log(`${sock.id}`);
        // console.log(message)
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
            disabled = false
            let numConns = 1
            let connRate = 1
            if (!simpleConnCheck.checked) {
                numConns = parseInt(numConnsInput.value);
                connRate = parseInt(connRateInput.value);
            }
            const timeInterval = 1000 / connRate

            if (isNaN(numConns) || isNaN(connRate)) {
                throw new Error('Please enter valid numbers for the number of connections and connection rate.');
            }

            // let connectionsCount = 0; // Variable to keegp track of the number of connections created

            for (let i = 0; i < numConns; i++) {
                if (disabled) break
                setTimeout(newConn, i * timeInterval);
            }
        } catch (err) {
            errAlert(err)
            console.log(err);
        }
    } else {
        disabled = true
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
                // console.log(`${sock.id} : ${channelInput.value} : `);
                // console.log(message)
            });
        });
    }

    //send the message input to all connected sockets
    socketConns.forEach((sock) => {
        totalMessagesSent.innerHTML++;
        sock.emit(channelInput.value, messageContentInput.value);
    });
});

let prevTotal = 0
// connection count metric
function updateMetrics() {
    currentConns.innerHTML = socketConns.size
    maxConns.innerHTML = Math.max(currentConns.innerHTML, maxConns.innerHTML)
    messagesReceivedLastSecond.innerHTML = totalMessagesReceived.innerHTML - prevTotal
    prevTotal = totalMessagesReceived.innerHTML
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


// import protobuf from "https://cdn.jsdelivr.net/npm/protobufjs@7.X.X/dist/protobuf.js"
