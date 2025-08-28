// client.ts
import { io, Socket } from "socket.io-client";
import { ConnectOptions, ReconnectOptions } from "./types";

export class SocketClient {
  private opts: Required<ConnectOptions>;
  private socket: Socket | null = null;
  private token?: string;
  private appId?: string;

  constructor(options: ConnectOptions) {
    this.opts = {
      reconnect: {
        enabled: true,
        maxAttempts: 0,
        backoffInitialMs: 600,
        backoffMaxMs: 10_000,
        backoffMultiplier: 1.8,
        jitterRatio: 0.2,
        ...(options.reconnect || {}),
      },
      clientInfo: options.clientInfo || {},
      ...options,
    } as Required<ConnectOptions>;
    
    // Set appId from options if provided
    if (options.appId) {
      this.appId = options.appId;
    }
  }

  // Set or update the appId after initialization
  setAppId(appId: string): void {
    this.appId = appId;
    
    // If already connected, update the socket authentication
    if (this.socket && this.socket.connected) {
      this.socket.auth = {
        ...this.socket.auth,
        appId: this.appId
      };
    }
  }

  // Get the current appId
  getAppId(): string | undefined {
    return this.appId;
  }

  async connect(token: string) {
    this.token = token;

    // Prepare authentication data including appId if available
    const authData: any = { token, ...this.opts.clientInfo };
    if (this.appId) {
      authData.appId = this.appId;
    }

    this.socket = io(this.opts.serverUrl + "/ws", {
      transports: ["websocket"],   // avoid xhr polling
      auth: authData,
      reconnection: this.opts.reconnect.enabled,
      reconnectionAttempts:
        this.opts.reconnect.maxAttempts === 0
          ? Infinity
          : this.opts.reconnect.maxAttempts,
      reconnectionDelay: this.opts.reconnect.backoffInitialMs,
      reconnectionDelayMax: this.opts.reconnect.backoffMaxMs,
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      console.log("✅ Connected:", this.socket?.id);
      console.log("App ID:", this.appId);
    });

    this.socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected:", reason);
    });

    this.socket.on("connect_error", (err) => {
      console.error("⚠️ Connection error:", err.message);
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  async createUser(username: string, password: string) {
    try {
      // Include appId in the request if available
      const body: any = { username, password };
      if (this.appId) {
        body.appId = this.appId;
      }

      const res = await fetch(this.opts.serverUrl + "/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "User creation failed");
      }
      return await res.json();
    } catch (err) {
      throw err;
    }
  }

  async login(username: string, password: string) {
    try {
      // Include appId in the request if available
      const body: any = { username, password };
      if (this.appId) {
        body.appId = this.appId;
      }

      const res = await fetch(this.opts.serverUrl + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Login failed");
      }
      const data = await res.json();
      const token = data.access_token;
      return token;
    } catch (err) {
      throw err;
    }
  }

  // ---------------------
  // --- Channel Operations ---
  // ---------------------

  async createChannel(name: string) {
    return new Promise(async (resolve, reject) => {
      // Include appId in the channel data if available
      const channelData: any = { name };
      if (this.appId) {
        channelData.appId = this.appId;
      }

      try {
        const res = await fetch(this.opts.serverUrl + "/channels", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(channelData),
        });
        if (!res.ok) {
          const err = await res.json();
          reject(err.message || "Channel creation failed");
        } else {
          const data = await res.json();
          resolve(data);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  async listChannels() {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(this.opts.serverUrl + "/channels/me", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
        });
        if (!res.ok) {
          const err = await res.json();
          reject(err.message || "Fetch channels failed");
        } else {
          const data = await res.json();
          resolve(data);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  async joinChannel(channelId: string) {
    return new Promise(async(resolve, reject) => {
      // Include appId in the join data if available
      const joinData: any = { channelId };
      if (this.appId) {
        joinData.appId = this.appId;
      }
      try{
        const res = await fetch(this.opts.serverUrl + `/channels/${channelId}/join`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(joinData),
        });
        if (!res.ok) {
          res.json().then(err => {
            reject(err.message || "Join channel failed");
          }).catch(() => {
            reject("Join channel failed");
          });
        } else {
          res.json().then(data => resolve(data)).catch(() => {
            reject("Join channel failed");
          });
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  async leaveChannel(channelId: string) {
    return new Promise(async (resolve, reject) => {
      // Include appId in the leave data if available
      const leaveData: any = { channelId };
      if (this.appId) {
        leaveData.appId = this.appId;
      }

      try {
        const res = await fetch(this.opts.serverUrl + `/channels/${channelId}/leave`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(leaveData),
        });
        if (!res.ok) {
          const err = await res.json();
          reject(err.message || "Leave channel failed");
        } else {
          const data = await res.json();
          resolve(data);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  async getChannelHistory(channelId: string, limit: number = 50) {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(
          this.opts.serverUrl +
            `/channels/${channelId}/messages?limit=${limit}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.token}`,
            },
          }
        );
        if (!res.ok) {
          const err = await res.json();
          reject(err.message || "Fetch channel history failed");
        } else {
          const data = await res.json();
          resolve(data);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  async inviteUser(channelId: string, userId: string) {
    return new Promise(async (resolve, reject) => {
      // Include appId in the invite data if available
      const inviteData: any = { userId };
      if (this.appId) {
        inviteData.appId = this.appId;
      }

      try {
        const res = await fetch(this.opts.serverUrl + `/channels/${channelId}/invite`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(inviteData),
        });
        if (!res.ok) {
          const err = await res.json();
          reject(err.message || "Invite user failed");
        } else {
          const data = await res.json();
          resolve(data);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  async makeChannelPrivate(channelId: string) {
    return new Promise(async (resolve, reject) => {
      // Include appId in the request if available
      const privateData: any = {};
      if (this.appId) {
        privateData.appId = this.appId;
      }

      try {
        const res = await fetch(this.opts.serverUrl + `/channels/${channelId}/private`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(privateData),
        });
        if (!res.ok) {
          const err = await res.json();
          reject(err.message || "Make channel private failed");
        } else {
          const data = await res.json();
          resolve(data);
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  async promoteToAdmin(channelId: string, userId: string) {
    return new Promise(async (resolve, reject) => {
      // Include appId in the promote data if available
      const promoteData: any = { userId };
      if (this.appId) {
        promoteData.appId = this.appId;
      }

      try {
        const res = await fetch(this.opts.serverUrl + `/channels/${channelId}/promote`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.token}`,
          },
          body: JSON.stringify(promoteData),
        });
        if (!res.ok) {
          const err = await res.json();
          reject(err.message || "Promote to admin failed");
        } else {
          const data = await res.json();
          resolve(data);
        }
      } catch (err) {
        reject(err);
      }
    });
  }
    

  // ---------------------
  // --- DM Operations ---
  // ---------------------

  async sendDM(receiverId: string, content: string) {
    return new Promise((resolve, reject) => {
      // Include appId in the DM data if available
      const dmData: any = { receiverId, content };
      if (this.appId) {
        dmData.appId = this.appId;
      }

      this.socket?.emit(
        "sendDM",
        dmData,
        (ack: { ok: boolean; message?: any; error?: string }) => {
          if (ack?.ok) resolve(ack.message);
          else reject(ack?.error || "Send failed");
        }
      );
    });
  }

  async sendMessage(channelId: string, content: string) {
    return new Promise((resolve, reject) => {
      // Include appId in the message data if available
      const msgData: any = { channelId, content };
      if (this.appId) {
        msgData.appId = this.appId;
      }
      this.socket?.emit(
        "send_message",
        msgData,
        (ack: { ok?: boolean; id?: string; error?: string }) => {
          if (ack?.ok || ack === undefined) resolve(ack);
          else reject(ack?.error || "Send failed");
        }
      );
    });
  }

  async joinDMRoom(otherUserId: string) {
    return new Promise((resolve, reject) => {
    // Include appId in the join data if available
    const joinData: any = { otherUserId };
    if (this.appId) {
      joinData.appId = this.appId;
    }
    
    this.socket?.emit(
      "joinDM",
      joinData,
      (history: any) => {
        if (history) resolve(history);
        else reject("Failed to join DM room");
      }
      );
  });
  }
  
  markAsRead(messageId: string) {
    return new Promise((resolve, reject) => {
    // Include appId in the read receipt if available
    const readData: any = { messageId };
    if (this.appId) {
      readData.appId = this.appId;
    }
    
    this.socket?.emit("markDMRead", readData, (ack: { ok?: boolean; error?: string }) => {
      if (ack?.ok || ack === undefined) resolve(ack);
      else reject(ack?.error || "Mark as read failed");
    });
  })
  }
  

  // ------------------------
  // --- Event Listeners ----
  // ------------------------

  onNewDM(handler: (msg: any) => void) {
    this.socket?.on("newDM", handler);
  }

  onSendMessageAck(handler: (ack: any) => void) {
    this.socket?.on("send_message_ack", handler);
  }
  
  onReceipt(handler: (receipt: any) => void) {
    this.socket?.on("dmReadReceipt", handler);
  }

  onDisconnect(handler: (reason: string) => void) {
    this.socket?.on("disconnect", handler);
  }

  onConnect(handler: () => void) {
    this.socket?.on("connect", handler);
  }

  onError(handler: (err: any) => void) {
    this.socket?.on("connect_error", handler);
  }
}