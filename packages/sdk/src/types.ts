export interface Message {
    id: string;
    from: string;
    content: string;
    timestamp: number;
  }

  export interface User {
    id: string;
    username: string;
  }

  export interface ConnectOptions {
    /** If you pass http(s) it will be converted to ws(s) automatically. */
    serverUrl: string;                          // e.g. https://api.example.com/ws or wss://…
    token: TokenProvider;                       // short-lived JWT or function to fetch one
    protocols?: string[];                       // optional WebSocket subprotocols
    connectTimeoutMs?: number;                  // fail fast if not OPEN within this window
    heartbeatIntervalMs?: number;               // app-level ping interval
    heartbeatTimeoutMs?: number;                // consider dead if no pong within this
    reconnect?: {
      enabled?: boolean;
      maxAttempts?: number;                     // 0/undefined = unlimited
      backoffInitialMs?: number;                // e.g. 500
      backoffMaxMs?: number;                    // e.g. 10_000
      backoffMultiplier?: number;               // e.g. 1.8
      jitterRatio?: number;                     // e.g. 0.2 adds +/-20% jitter
    };
    wsFactory?: (url: string, protocols?: string[]) => WebSocketLike; // env adapter
    // Optional: include any extra client info in first HELLO message
    clientInfo?: Record<string, any>;
  }
  
  export type MessageCallback = (message: Message) => void;

  // export type WebSocketLike = {
  //   readyState: number;
  //   OPEN: number;
  //   CLOSE: number;
  //   send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  //   close(code?: number, reason?: string): void;
  //   addEventListener(type: 'open' | 'message' | 'error' | 'close', listener: (ev: any) => void): void;
  //   removeEventListener(type: 'open' | 'message' | 'error' | 'close', listener: (ev: any) => void): void;
  // };

  export type WebSocketLike = {
    // Current ready state
    readyState: number;
  
    // ReadyState constants
    CONNECTING: number; // 0
    OPEN: number;       // 1
    CLOSING: number;    // 2
    CLOSED: number;     // 3
  
    // Core API
    send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
    close(code?: number, reason?: string): void;
  
    // Events
    addEventListener(
      type: 'open' | 'message' | 'error' | 'close',
      listener: (ev: Event | MessageEvent<any> | CloseEvent) => void
    ): void;
  
    removeEventListener(
      type: 'open' | 'message' | 'error' | 'close',
      listener: (ev: Event | MessageEvent<any> | CloseEvent) => void
    ): void;
  };

type TokenProvider = string | (() => Promise<string> | string);
export type MessageHandler = (msg: any) => void;
export type EventHandler = () => void;
  