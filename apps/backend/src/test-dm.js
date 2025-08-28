const { io } = require("socket.io-client");

const socket = io("http://localhost:3000/ws", {
  auth: { token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InNhbWkiLCJzdWIiOiI2OGZjYmY2OC1jYjhkLTRhZGMtYjZjYS0zMmQwNTU5YjNlYTMiLCJpYXQiOjE3NTYyMTMyNjEsImV4cCI6MTc1NjIxNjg2MX0._DQAHs5BQxOuNTYQZ9vDrRCUL23QnMcqoakp62_sd-g" }
});

socket.on("connect", () => {
  console.log("✅ Connected:", socket.id);

  // Join DM with user 2
  socket.emit("joinDM", { otherUserId: "6865269d-70b3-4dfa-b0c4-dbdf94e15dee" });

  // Send DM
  // socket.emit("sendDM", { receiverId: "68fcbf68-cb8d-4adc-b6ca-32d0559b3ea3", content: "Hello from test client!" });
});

socket.on("dmHistory", (messages) => {
  console.log("📜 DM History:", messages);
});

// socket.on("newDM", (msg) => {
//   console.log("📩 New DM received:", msg);
// });

// Mark a message as read
socket.emit('markDMRead', { messageId: "cmesjtxbf0001tplw9xgrs3tc" });

// Listen for receipts
socket.on('dmReadReceipt', (data) => {
  console.log("Message read:", data);
});


socket.on("error", (err) => {
  console.error("❌ Error:", err);
});


