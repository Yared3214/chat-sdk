import React, { createContext, useContext, useEffect, useState } from "react";
import { SocketClient } from "../../sdk/src/client";

type ChatContextType = {
  client: SocketClient | null;
  isConnected: boolean;
};

const ChatContext = createContext<ChatContextType>({
  client: null,
  isConnected: false,
});

export function ChatProvider({
  serverUrl,
  appId,
  token,
  children,
}: {
  serverUrl: string;
  appId?: string;
  token: string;
  children: React.ReactNode;
}) {
  const [client, setClient] = useState<SocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const c = new SocketClient({ serverUrl, appId });
    setClient(c);

    c.connect(token);

    c.onConnect(() => setIsConnected(true));
    c.onDisconnect(() => setIsConnected(false));

    return () => {
      c.disconnect();
    };
  }, [serverUrl, appId, token]);

  return (
    <ChatContext.Provider value={{ client, isConnected }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatClient() {
  return useContext(ChatContext);
}
