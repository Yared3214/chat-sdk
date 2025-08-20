import { ChatClient } from "./src";

async function main() {
  const client = new ChatClient("ws://localhost:8080", "test-token");

  await client.connect();

  client.onMessage((msg) => {
    console.log("📩 New message:", msg);
  });

  client.sendMessage("Hello world!");
}

main();
