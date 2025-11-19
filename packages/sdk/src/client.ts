// client.ts
import { io, Socket } from "socket.io-client";
import { ConnectOptions, ReconnectOptions } from "./types";
export class SocketClient {
  private opts: Required<ConnectOptions>;
  private socket: Socket | null = null;
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
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

  private async request<T>(path: string, options: RequestInit): Promise<T> {
    const res = await fetch(this.opts.serverUrl + path, options);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  private handleAck<T>(resolve: (val: T) => void, reject: (err: any) => void) {
    return (ack?: { ok?: boolean; error?: string; data?: T }) => {
      if (!ack || ack.ok) resolve(ack?.data as T);
      else reject(ack.error || "Operation failed");
    };
  }

  private cleanupCall() {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.pc?.close();
    this.localStream = null;
    this.pc = null;
  }
  
  

  
  async createUser(username: string, password: string) {
      // Include appId in the request if available
      const body: any = { username, password };
      if (this.appId) {
        body.appId = this.appId;
      }
      return this.request('/auth/signup', {
        method: "POST",
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify(body),
      })
  }

  async login(username: string, password: string) {
      // Include appId in the request if available
      const body: any = { username, password };
      if (this.appId) {
        body.appId = this.appId;
      }
      return await this.request('/auth/login', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
  }

  async getUsernameById(userId: string) {
    return this.request(`/user/${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,  
        },
      })
  }

  async listAllUsers() {
    const body: any = {}
    if (this.appId) {
      body.appId = this.appId
    }
    return this.request(`/user/${body.appId}/many`, {
      method: "GET",
      headers: { "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,  
        },
    })
  }

  // ---------------------
  // --- Channel Operations ---
  // ---------------------

  async createChannel(name: string) {
      // Include appId in the channel data if available
      const channelData: any = { name };
      if (this.appId) {
        channelData.appId = this.appId;
      }
      return this.request('/channels', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(channelData),
      })
  }

  async listChannels() {
    return this.request('/channels/me', {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
    })
  }

  async joinChannel(channelId: string) {
      // Include appId in the join data if available
      const joinData: any = { channelId };
      if (this.appId) {
        joinData.appId = this.appId;
      }
      return this.request(`/channels/${channelId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(joinData),
      });
  }

  async leaveChannel(channelId: string) {
      // Include appId in the leave data if available
      const leaveData: any = { channelId };
      if (this.appId) {
        leaveData.appId = this.appId;
      }

      return this.request( `/channels/${channelId}/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(leaveData),
      });
  }

  async getChannelHistory(channelId: string, limit: number = 50) {
    return this.request(`/channels/${channelId}/messages?limit=${limit}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
    });
  }

  async inviteUser(channelId: string, userId: string) {
      // Include appId in the invite data if available
      const inviteData: any = { userId };
      if (this.appId) {
        inviteData.appId = this.appId;
      }

      return this.request(`/channels/${channelId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(inviteData),
      });
  }

  async makeChannelPrivate(channelId: string) {
      // Include appId in the request if available
      const privateData: any = {};
      if (this.appId) {
        privateData.appId = this.appId;
      }

      return this.request(`/channels/${channelId}/private`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(privateData),
      });
  }

  async promoteToAdmin(channelId: string, userId: string) {
      // Include appId in the promote data if available
      const promoteData: any = { userId };
      if (this.appId) {
        promoteData.appId = this.appId;
      }

      return this.request(`/channels/${channelId}/promote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(promoteData),
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
        this.handleAck(resolve, reject)
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
        this.handleAck(resolve, reject)
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
    
    this.socket?.emit("markDMRead", readData, this.handleAck(resolve, reject));
  })
  }

  // ------------------------
  // --- Call Operations ----
  // ------------------------

  async createCall(receiverId: string) {
    return this.request('/call', {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.token}` },
      body: JSON.stringify({ receiverId}),
    });
  }

  async startCall(receiverId: string, callId: string) {
    return new Promise(async (resolve, reject) => {
      // const callData = await this.createCall(receiverId);
      // if (!callData) throw new Error("Call initiation failed");
      // const callId = (callData as any).id;
      this.pc = new RTCPeerConnection();

        // capture mic
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.localStream.getTracks().forEach(track => this.pc!.addTrack(track, this.localStream!));

      // send ICE candidates
    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.socket?.emit("sendIceCandidate", { callId, receiverId, candidate: e.candidate }, this.handleAck(resolve, reject));
      }
    };

    // remote audio
    this.pc.ontrack = (e) => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];
      audio.play();
    };

    // create offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    this.socket?.emit("sendOffer", { callId, receiverId, offer },this.handleAck(resolve, reject));
    });
  }
  

  async handleIncomingCall(callId: string, fromUserId: string) {
    this.cleanupCall();
    this.pc = new RTCPeerConnection();

    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.localStream.getTracks().forEach(track => this.pc!.addTrack(track, this.localStream!));

    this.pc.onicecandidate = (e) => {
      if (e.candidate) {
        this.socket?.emit("sendIceCandidate", { callId, toUserId: fromUserId, candidate: e.candidate });
      }
    };

    this.pc.ontrack = (e) => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];
      audio.play();
    };
  }

  // Called when receiving an offer
  async receiveOffer(callId: string, fromUserId: string, offer: RTCSessionDescriptionInit) {
    await this.pc!.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    this.socket?.emit("sendAnswer", { callId, toUserId: fromUserId, answer });
  }

  async receiveAnswer(answer: RTCSessionDescriptionInit) {
    await this.pc!.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    await this.pc!.addIceCandidate(new RTCIceCandidate(candidate));
  }

  async endCall(callId: string, toUserId: string) {
    return new Promise((resolve, reject) => {
      this.pc?.close();
      this.pc = null;
      const endData: any = { callId };
      if (this.appId) endData.appId = this.appId;
      this.socket?.emit(
        "endCall",
        endData,
        this.handleAck(resolve, reject)
      );
    });
  }

  // ------------------------
  // --- Call Listeners -----
  // ------------------------

  onIncomingCall(handler: (call: any) => void) {
    this.socket?.on("incomingCall", handler);
  }

  onCallAnswered(handler: (call: any) => void) {
    this.socket?.on("callAnswered", handler);
  }

  onCallEnded(handler: (callId: string) => void) {
    this.socket?.on("callEnded", handler);
  }

  onReceiveOffer(cb: (callId: string, from: string, offer: RTCSessionDescriptionInit) => void) {
    this.socket?.on("receiveOffer", cb);
  }
  onReceiveAnswer(cb: (answer: RTCSessionDescriptionInit) => void) {
    this.socket?.on("receiveAnswer", cb);
  }
  onReceiveIceCandidate(cb: (candidate: RTCIceCandidateInit) => void) {
    this.socket?.on("receiveIceCandidate", cb);
  }
  

  // ------------------------
  // --- Event Listeners ----
  // ------------------------

  onNewDM(handler: (msg: any) => void) {
    this.socket?.on("newDM", handler);
    return () => this.socket?.off("newDM", handler);
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