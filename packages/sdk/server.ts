import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("✅ Client connected");

  // Send welcome
  ws.send(JSON.stringify({ type: "welcome", msg: "connected to demo server" }));

  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    console.log("📩 Received:", msg);

    // Respond to pings
    if (msg.type === "ping") {
      ws.send(JSON.stringify({ type: "pong" }));
      return;
    }

    // Echo other messages
    wss.clients.forEach((client) => {
      if (client.readyState === ws.OPEN) {
        client.send(JSON.stringify({ type: "chat", text: msg.text || "no-text" }));
      }
    });
  });

  ws.on("close", () => {
    console.log("❌ Client disconnected");
  });
});

console.log("🚀 Server running at ws://localhost:8080");
