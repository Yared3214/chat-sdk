  // Note: new file - WebRTC logic separated from UI and signaling transport
  import { Socket } from "socket.io-client";

  export type StreamHandler = (stream: MediaStream) => void;
  
  export interface PeerManagerOptions {
    onLocalStream?: StreamHandler;
    onRemoteStream?: StreamHandler;
    debug?: boolean;
  }
  
  export interface CallMediaOptions {
    video?: boolean;
    audio?: boolean;
  }
  
  /**
   * PeerManager
   * - Handles a single 1:1 call (one RTCPeerConnection)
   * - Uses a socket.io Socket for signaling (expects server to use event 'signal' with signature (fromId, message))
   * - Keeps UI concerns separate: provides callback hooks for local and remote MediaStreams
   */
  export class PeerManager {
    private socket: Socket;
    private pc: RTCPeerConnection | null = null;
    private localStream: MediaStream | null = null;
    private remoteStream: MediaStream | null = null;
    private targetId: string | null = null;
    private opts: PeerManagerOptions;
  
    constructor(socket: Socket, opts: PeerManagerOptions = {}) {
      this.socket = socket;
      this.opts = opts;
  
      // Bind incoming signaling messages
      // expects server to emit: socket.emit('signal', fromId, message)
      this.socket.on("signal", (fromId: string, message: string) => {
        if (this.opts.debug) console.log("[PeerManager] got signal from", fromId, message);
        this.handleSignal(fromId, message);
      });
    }
  
    // Initialize local camera/mic with graceful fallback to audio-only
    async initLocalMedia(video = true, audio = true): Promise<MediaStream> {
      if (this.localStream) return this.localStream;

      const tryGet = async (v: boolean, a: boolean) =>
        navigator.mediaDevices.getUserMedia({ video: v, audio: a });

      try {
        this.localStream = await tryGet(video, audio);
      } catch (err: any) {
        if (this.opts.debug) console.warn('[PeerManager] getUserMedia failed', err?.name || err);
        const name = err?.name || '';
        // Retry audio-only if video not found or overconstrained
        if (video && (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'OverconstrainedError')) {
          try {
            if (this.opts.debug) console.log('[PeerManager] retrying audio-only');
            this.localStream = await tryGet(false, audio);
          } catch (err2) {
            if (this.opts.debug) console.warn('[PeerManager] audio-only fallback failed', err2);
            throw err2;
          }
        } else {
          throw err;
        }
      }

      if (this.opts.onLocalStream && this.localStream) this.opts.onLocalStream(this.localStream);
      return this.localStream as MediaStream;
    }
  
    // Create new RTCPeerConnection for a given target socket id
    private createPeerConnection(targetId: string) {
      if (this.pc) {
        // close previous if exists
        try { this.pc.close(); } catch (_) {}
        this.pc = null;
      }
  
      const config: RTCConfiguration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      };
  
      this.pc = new RTCPeerConnection(config);
      this.targetId = targetId;
  
      // ICE candidate -> send to remote via socket
      this.pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          if (this.opts.debug) console.log("[PeerManager] sending ice to", targetId, ev.candidate);
          this.socket.emit("signal", targetId, JSON.stringify({ ice: ev.candidate }));
        }
      };
  
      // ontrack (preferred): build remote stream and pass to UI
      this.remoteStream = new MediaStream();
      this.pc.ontrack = (ev) => {
        if (this.opts.debug) console.log("[PeerManager] ontrack", ev.streams);
        // Some browsers give streams array, some give tracks individually:
        if (ev.streams && ev.streams[0]) {
          this.remoteStream = ev.streams[0];
        } else {
          // add tracks
          if (!ev.streams || ev.streams.length === 0) {
            ev.track && this.remoteStream!.addTrack(ev.track);
          }
        }
        if (this.opts.onRemoteStream && this.remoteStream) this.opts.onRemoteStream(this.remoteStream);
      };
  
      // For older onaddstream support (if server or other client uses it)
      // @ts-ignore
      this.pc.onaddstream = (ev: any) => {
        if (this.opts.debug) console.log("[PeerManager] onaddstream", ev);
        this.remoteStream = ev.stream;
        if (this.opts.onRemoteStream && this.remoteStream) this.opts.onRemoteStream(this.remoteStream);
      };
  
      // Add local tracks to PeerConnection
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          this.pc!.addTrack(track, this.localStream as MediaStream);
        });
      }
    }
  
    // Initiate a call by creating an offer and sending it to target
    async call(targetId: string, media?: CallMediaOptions) {
      const wantVideo = media?.video !== undefined ? !!media.video : true;
      const wantAudio = media?.audio !== undefined ? !!media.audio : true;
      await this.initLocalMedia(wantVideo, wantAudio);
      this.createPeerConnection(targetId);
  
      if (!this.pc) throw new Error("PeerConnection not created");
      // ensure local tracks are added (if initLocalMedia happened after pc creation)
      if (this.localStream) {
        // remove duplicates: if no senders exist
        const senders = this.pc.getSenders();
        if (senders.length === 0) {
          this.localStream.getTracks().forEach((track) => this.pc!.addTrack(track, this.localStream as MediaStream));
        }
      }
  
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
  
      // send offer to remote
      this.socket.emit("signal", targetId, JSON.stringify({ sdp: this.pc.localDescription }));
      if (this.opts.debug) console.log("[PeerManager] sent offer to", targetId);
    }
  
    // End/cleanup call
    async endCall() {
      if (this.pc) {
        try { this.pc.close(); } catch (_) {}
        this.pc = null;
      }
      this.targetId = null;
  
      if (this.localStream) {
        this.localStream.getTracks().forEach((t) => t.stop());
        this.localStream = null;
      }
  
      if (this.remoteStream) {
        this.remoteStream.getTracks().forEach((t) => t.stop());
        this.remoteStream = null;
      }
    }
  
    // Handle incoming signaling messages (from socket 'signal' event)
    private async handleSignal(fromId: string, message: string) {
      let signal;
      try {
        signal = JSON.parse(message);
      } catch (e) {
        if (this.opts.debug) console.warn("[PeerManager] invalid signal json", message);
        return;
      }
  
      // If there's no pc yet, create it and set the fromId as the target (callee will answer back)
      if (!this.pc) {
        // initialize local media with graceful fallback
        try { await this.initLocalMedia(true, true); } catch (_) {}
        this.createPeerConnection(fromId);
      }
  
      if (!this.pc) return;
  
      if (signal.sdp) {
        const sdp = signal.sdp;
        try {
          await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
        } catch (e) {
          if (this.opts.debug) console.error("[PeerManager] setRemoteDescription failed", e);
          return;
        }
  
        // If received an offer, create an answer
        if (sdp.type === "offer") {
          // ensure local tracks are attached before creating answer
          if (this.localStream) {
            this.localStream.getTracks().forEach((track) => {
              // avoid duplicate senders for same track
              const matched = this.pc!.getSenders().some((s) => s.track === track);
              if (!matched) this.pc!.addTrack(track, this.localStream as MediaStream);
            });
          }
  
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          this.socket.emit("signal", fromId, JSON.stringify({ sdp: this.pc.localDescription }));
          if (this.opts.debug) console.log("[PeerManager] answered offer to", fromId);
        }
      }
  
      if (signal.ice) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(signal.ice));
        } catch (e) {
          if (this.opts.debug) console.warn("[PeerManager] addIceCandidate failed", e);
        }
      }
    }
  
    // Optional helpers for UI to toggle tracks
    muteAudio(muted: boolean) {
      if (!this.localStream) return;
      this.localStream.getAudioTracks().forEach((t) => (t.enabled = !muted));
    }
    muteVideo(muted: boolean) {
      if (!this.localStream) return;
      this.localStream.getVideoTracks().forEach((t) => (t.enabled = !muted));
    }
  }