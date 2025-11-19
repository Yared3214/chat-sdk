import { SocketClient } from './packages/sdk/src/client';

// Get DOM elements
const myIdSpan = document.getElementById('myId');
const targetUserIdInput = document.getElementById('targetUserId');
const startCallButton = document.getElementById('startCallButton');
const endCallButton = document.getElementById('endCallButton');
const incomingCallDiv = document.getElementById('incomingCallDiv');
const callerIdSpan = document.getElementById('callerId');
const answerButton = document.getElementById('answerButton');
const rejectButton = document.getElementById('rejectButton');

// Initialize the client
const MY_USER_ID = prompt("Enter your user ID:") || `user_${Math.random().toString(36).substr(2, 9)}`;
const SERVER_URL = "http://localhost:3000"; // Your signaling server URL

const client = new SocketClient({SERVER_URL, appId: 'app123'});
myIdSpan.textContent = MY_USER_ID;

// Set up event listeners
let currentCallId = null;
let currentTargetUserId = null;



// Start a new call
startCallButton.addEventListener('click', async () => {
    try {
        const token = await client.login('yared', '1234'); // Use fixed credentials for simplicity
        await client.connect(token)
        await client.startCall(currentTargetUserId);
        endCallButton.disabled = false;
        console.log("Call started...");
    } catch (error) {
        console.error("Failed to start call:", error);
    }
});

// End the current call
endCallButton.addEventListener('click', () => {
    if (currentCallId && currentTargetUserId) {
        client.endCall(currentCallId, currentTargetUserId);
        endCallButton.disabled = true;
        currentCallId = null;
        currentTargetUserId = null;
    }
});

// Listen for incoming calls
client.onIncomingCall((callId, fromUserId) => {
    incomingCallDiv.style.display = 'block';
    callerIdSpan.textContent = fromUserId;
    
    // Store the call info for answering
    currentCallId = callId;
    currentTargetUserId = fromUserId;

    // Setup answer button
    answerButton.onclick = async () => {
        await client.handleIncomingCall(callId, fromUserId);
        incomingCallDiv.style.display = 'none';
        endCallButton.disabled = false;
    };

    // Setup reject button
    rejectButton.onclick = () => {
        client.endCall(callId, fromUserId);
        incomingCallDiv.style.display = 'none';
        currentCallId = null;
        currentTargetUserId = null;
    };
});

// Set up the other WebRTC event handlers
client.onReceiveOffer((callId, from, offer) => {
    client.receiveOffer(callId, from, offer);
});

client.onReceiveAnswer((answer) => {
    client.receiveAnswer(answer);
});

client.onReceiveIceCandidate((candidate) => {
    client.addIceCandidate(candidate);
});

client.onCallEnded((callId, from) => {
    console.log(`Call ${callId} ended by ${from}`);
    endCallButton.disabled = true;
    currentCallId = null;
    currentTargetUserId = null;
    // Also hide the incoming call div if it was visible
    incomingCallDiv.style.display = 'none'; 
});