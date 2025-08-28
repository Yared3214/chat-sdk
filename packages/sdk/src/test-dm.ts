import { SocketClient } from '../src/client';
import { io, Socket } from "socket.io-client";

const client = new SocketClient({ serverUrl: "http://localhost:3000", appId: 'app123' });

const run = async () => {
    // const user = await client.createUser("dawit", "1234");
    // console.log("User created:", user);
    const token = await client.login("yared", "1234");
    await client.connect(token);
    console.log("Connected with appId:", client.getAppId());

    // Update appId after connection
    // client.setAppId("newAppId456");
    // console.log("Updated appId:", client.getAppId());

    // const res = await client.sendDM("726c41cf-9451-4853-8d30-29184aca97ba", "Hello dawit, this is a direct message from sami!");
    // console.log("DM sent, response:", res);
    
    // const history = await client.joinDMRoom("68fcbf68-cb8d-4adc-b6ca-32d0559b3ea3");
    // console.log("DM history:", history);

    // const res = await client.markAsRead("cmet14k2c0001tpwwe9mewgox");
    // console.log("Marked as read:", res);

    const res = await client.sendMessage("cmesifxvb0001tpn8f6opkcjj", "Hello all, i am dawit!");
    console.log("Message sent, response:", res);

    // Listen for incoming DMs
    client.onNewDM((message) => {
        console.log("New DM received:", message);
    });

    client.onReceipt((receipt) => {
        console.log("Read receipt received:", receipt);
    });

    client.onSendMessageAck((ack) => {
        console.log("Send message ack received:", ack);
    });

}

run();