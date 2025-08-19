import { ChatClient } from "./client";

export function initMessaging(client: ChatClient) {
  return {
    send: (content: string) => client.sendMessage(content),
    onMessage: (cb: any) => client.onMessage(cb),
  };
}
