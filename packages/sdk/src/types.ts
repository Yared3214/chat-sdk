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

  export interface ReconnectOptions {
    enabled: boolean;
    maxAttempts: number; // 0 = unlimited
    backoffInitialMs: number;
    backoffMaxMs: number;
    backoffMultiplier: number;
    jitterRatio: number;
  }

  export interface ConnectOptions {
    serverUrl: string;
    appId?: string;
    reconnect?: Partial<ReconnectOptions>;
    clientInfo?: Record<string, any>;
  }

  export interface LoginResponse {
    accessToken: string;
    refreshToken?: string;
  }

  export interface CreateUserResponse {
    userId: string, 
    username: string, 
    createdAt: string
  }
  
  export type MessageCallback = (message: Message) => void;

  // export type WebSocketLike = {
  //   // Current ready state
  //   readyState: number;
  
  //   // ReadyState constants
  //   CONNECTING: number; // 0
  //   OPEN: number;       // 1
  //   CLOSING: number;    // 2
  //   CLOSED: number;     // 3
  
  //   // Core API
  //   send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
  //   close(code?: number, reason?: string): void;
  
  //   // Events
  //   addEventListener(
  //     type: 'open' | 'message' | 'error' | 'close',
  //     listener: (ev: Event | MessageEvent<any> | CloseEvent) => void
  //   ): void;
  
  //   removeEventListener(
  //     type: 'open' | 'message' | 'error' | 'close',
  //     listener: (ev: Event | MessageEvent<any> | CloseEvent) => void
  //   ): void;
  // };

// type TokenProvider = string | (() => Promise<string> | string);

export type MessageHandler = (msg: any) => void;
export type EventHandler = () => void;
  