// src/client.ts
// Robust WebSocket client with auth, reconnect, heartbeat, and queueing.
import { WebSocketLike, ConnectOptions, EventHandler, MessageHandler } from './types';
  
  function defaultWsFactory(url: string, protocols?: string[]): WebSocketLike {
    // Browser / React Native
    if (typeof globalThis !== 'undefined' && (globalThis as any).WebSocket) {
      return new (globalThis as any).WebSocket(url, protocols);
    }
    // Node
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const WS = require('ws');
    return new WS(url, protocols);
  }
  
  function toWsUrl(httpish: string) {
    // http(s) -> ws(s)
    return httpish.replace(/^http/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws'));
  }
  
  function withQuery(url: string, query: Record<string, string | number | boolean | undefined>) {
    const u = new URL(url);
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    });
    return u.toString();
  }
  
  function expBackoff(attempt: number, initial: number, max: number, mult: number, jitterRatio: number) {
    const base = Math.min(max, initial * Math.pow(mult, Math.max(0, attempt - 1)));
    const jitter = base * jitterRatio;
    const delta = (Math.random() * 2 - 1) * jitter; // +/- jitter
    return Math.max(0, Math.floor(base + delta));
  }
  
  export class ChatClient {
    private opts: Required<ConnectOptions>;
    private ws: WebSocketLike | null = null;
    private connecting: Promise<void> | null = null;
    private closedByUser = false;
  
    private heartbeatTimer: any = null;
    private lastPongAt: number = 0;
    private connectAbortTimer: any = null;
  
    private reconnectAttempt = 0;
    private messageQueue: string[] = [];           // queue while connecting
    private messageHandlers: MessageHandler[] = [];
    private openHandlers: EventHandler[] = [];
    private closeHandlers: EventHandler[] = [];
  
    constructor(options: ConnectOptions) {
      // Defaults
      this.opts = {
        protocols: [],
        connectTimeoutMs: 8000,
        heartbeatIntervalMs: 25_000,
        heartbeatTimeoutMs: 10_000,
        reconnect: {
          enabled: true,
          maxAttempts: 0, // unlimited by default
          backoffInitialMs: 600,
          backoffMaxMs: 10_000,
          backoffMultiplier: 1.8,
          jitterRatio: 0.2,
          ...(options.reconnect || {})
        },
        wsFactory: options.wsFactory || defaultWsFactory,
        clientInfo: options.clientInfo || {},
        ...options,
        serverUrl: toWsUrl(options.serverUrl),
      } as Required<ConnectOptions>;
    }
  
    /** Connect and complete handshake. Safe to call multiple times. */
    async connect(): Promise<void> {
      if (this.ws && this.ws.readyState === this.ws.OPEN) return;
      if (this.connecting) return this.connecting;
  
      this.closedByUser = false;
      this.connecting = this.openSocket();
      try {
        await this.connecting;
      } finally {
        this.connecting = null;
      }
    }
  
    /** Send a JSON message. Queues if not yet OPEN. */
    send(msg: any) {
      const data = JSON.stringify(msg);
      if (this.ws && this.ws.readyState === this.ws.OPEN) {
        this.ws.send(data);
      } else {
        this.messageQueue.push(data);
      }
    }
  
    onMessage(handler: MessageHandler) { this.messageHandlers.push(handler); }
    onOpen(handler: EventHandler) { this.openHandlers.push(handler); }
    onClose(handler: EventHandler) { this.closeHandlers.push(handler); }
  
    /** Graceful user-initiated disconnect (stops auto-reconnect). */
    disconnect(code = 1000, reason = 'client disconnect') {
      this.closedByUser = true;
      this.clearTimers();
      if (this.ws) {
        try { this.ws.close(code, reason); } catch {}
        this.ws = null;
      }
    }
  
    // -------------------- internals --------------------
  
    private async resolveToken(): Promise<string> {
      const t = this.opts.token;
      return typeof t === 'function' ? await (t as any)() : (t as string);
      // NOTE: keep tokens short-lived (5–15 min) since we put it in the query param.
    }
  
    private async openSocket(): Promise<void> {
      const token = await this.resolveToken();
  
      // Build URL with token (browser cannot set headers; query or subprotocol is typical)
      const url = withQuery(this.opts.serverUrl, { token, v: 1 });
  
      // Create socket
      const ws = this.opts.wsFactory(url, this.opts.protocols);
      this.ws = ws;
  
      // Connect timeout
      await new Promise<void>((resolve, reject) => {
        const onOpen = () => {
          this.clearConnectAbort();
          this.lastPongAt = Date.now();
          this.setupHeartbeat();
          this.flushQueue();
          this.reconnectAttempt = 0;
          this.openHandlers.forEach(fn => fn());
          // Optionally send HELLO so server can record client info
          this.safeSend({ type: 'hello', ts: Date.now(), info: this.opts.clientInfo });
          resolve();
        };
  
        const onMessage = (ev: any) => {
          try {
            const payload = typeof ev.data !== 'undefined' ? ev.data : ev; // ws vs browser
            const text = typeof payload === 'string' ? payload : payload?.data?.toString?.() ?? payload.toString?.();
            const msg = JSON.parse(text);
            if (msg?.type === 'pong') {
              this.lastPongAt = Date.now();
              return;
            }
            this.messageHandlers.forEach(fn => fn(msg));
          } catch (e) {
            // ignore malformed frames
          }
        };
  
        const onError = (err: any) => {
          cleanup();
          reject(err instanceof Error ? err : new Error(String(err)));
        };
  
        const onClose = async () => {
          cleanup();
          this.handleClose();
          // If we closed before resolving, fail connect() so caller can await retry logic or catch
          reject(new Error('socket closed during connect'));
        };
  
        const cleanup = () => {
          if (!ws) return;
          ws.removeEventListener('open', onOpen);
          ws.removeEventListener('message', onMessage);
          ws.removeEventListener('error', onError);
          ws.removeEventListener('close', onClose);
        };
  
        ws.addEventListener('open', onOpen);
        ws.addEventListener('message', onMessage);
        ws.addEventListener('error', onError);
        ws.addEventListener('close', onClose);
  
        // Abort connection if we don’t OPEN in time
        this.connectAbortTimer = setTimeout(() => {
          try { ws.close(4000, 'connect-timeout'); } catch {}
          cleanup();
          reject(new Error(`connect timeout after ${this.opts.connectTimeoutMs}ms`));
        }, this.opts.connectTimeoutMs);
      }).catch(async (err) => {
        // If user didn’t call disconnect(), try to reconnect
        if (!this.closedByUser && this.opts.reconnect.enabled) {
          await this.reconnectLoop();
          return;
        }
        throw err;
      });
    }
  
    private async reconnectLoop(): Promise<void> {
      const { maxAttempts, backoffInitialMs, backoffMaxMs, backoffMultiplier, jitterRatio } = this.opts.reconnect;
      while (!this.closedByUser && (maxAttempts === 0 || this.reconnectAttempt < (maxAttempts as number))) {
        this.reconnectAttempt++;
        const delay = expBackoff(this.reconnectAttempt, backoffInitialMs!, backoffMaxMs!, backoffMultiplier!, jitterRatio!);
        await new Promise(r => setTimeout(r, delay));
        try {
          await this.openSocket();
          return; // success
        } catch {
          // keep looping
        }
      }
      // Give up: notify close handlers
      this.closeHandlers.forEach(fn => fn());
    }
  
    private handleClose() {
      this.clearTimers();
      this.ws = null;
      if (this.closedByUser) {
        this.closeHandlers.forEach(fn => fn());
        return;
      }
      if (this.opts.reconnect.enabled) {
        // fire and forget; connect() awaits via openSocket catch
        void this.reconnectLoop();
      } else {
        this.closeHandlers.forEach(fn => fn());
      }
    }
  
    private setupHeartbeat() {
      // App-level heartbeat: send {type:'ping'} every interval; expect {type:'pong'}
      const interval = this.opts.heartbeatIntervalMs;
      const timeout = this.opts.heartbeatTimeoutMs;
      this.clearHeartbeat();
  
      this.heartbeatTimer = setInterval(() => {
        // If no pong within timeout, force reconnect
        if (Date.now() - this.lastPongAt > interval + timeout) {
          try { this.ws?.close(4001, 'heartbeat-timeout'); } catch {}
          return;
        }
        this.safeSend({ type: 'ping', ts: Date.now() });
      }, interval);
    }
  
    private flushQueue() {
      if (!this.ws) return;
      for (const data of this.messageQueue.splice(0)) {
        try { this.ws.send(data); } catch { /* keep going */ }
      }
    }
  
    private safeSend(obj: any) {
      try { this.send(obj); } catch { /* ignore if not connected */ }
    }
  
    private clearConnectAbort() {
      if (this.connectAbortTimer) { clearTimeout(this.connectAbortTimer); this.connectAbortTimer = null; }
    }
  
    private clearHeartbeat() {
      if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    }
  
    private clearTimers() {
      this.clearHeartbeat();
      this.clearConnectAbort();
    }
  }
  