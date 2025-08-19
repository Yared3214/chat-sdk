import WebSocket from "ws";
import { Message, MessageCallback } from "./types";

export class ChatClient {
  private socket: WebSocket | null = null;
  private serverUrl: string;
  private token: string;
  private messageHandlers: MessageCallback[] = [];

  constructor(serverUrl: string, token: string) {
    this.serverUrl = serverUrl;
    this.token = token;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = new WebSocket(this.serverUrl, {
        headers: { Authorization: `Bearer ${this.token}` }
      });

      this.socket.on("open", () => {
        console.log("✅ Connected to server");
        resolve();
      });

      this.socket.on("error", (err) => {
        console.error("❌ Connection error:", err);
        reject(err);
      });

      this.socket.on("message", (data) => {
        try {
          const msg: Message = JSON.parse(data.toString());
          this.messageHandlers.forEach((cb) => cb(msg));
        } catch (e) {
          console.error("Invalid message received:", data);
        }
      });
    });
  }

  sendMessage(content: string) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("Socket is not connected");
    }

    const message = { type: "message", content };
    this.socket.send(JSON.stringify(message));
  }

  onMessage(callback: MessageCallback) {
    this.messageHandlers.push(callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      console.log("🔌 Disconnected from server");
    }
  }
}
