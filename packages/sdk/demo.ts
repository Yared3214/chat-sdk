import { ChatClient } from "./src/client";

async function main() {
  // 1. Create client with server URL + token
  const client = new ChatClient({
    serverUrl: "ws://localhost:8080", // backend server URL
    token: "demo-token",              // or async function returning token
    clientInfo: { app: "demo-script" }
  });

  // 2. Register event handlers
  client.onOpen(() => {
    console.log("✅ Connected to server");
  });

  client.onMessage((msg) => {
    console.log("📨 Message received:", msg);
  });

  client.onClose(() => {
    console.log("❌ Disconnected");
  });

  // 3. Connect
  await client.connect();

  // 4. Send message after connect
  setTimeout(() => {
    console.log("📤 Sending message...");
    client.send({ type: "chat", text: "Hello from demo.ts 👋" });
  }, 1000);
}

main().catch(console.error);
