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
  
  export type MessageCallback = (message: Message) => void;
  