import { useEffect, useRef, useState} from 'react'

export type ISocketClient = {
    joinChannelRoom: (channelId: string) => Promise<any[]>;
    createChannel: (name: string) => Promise<any[]>;
    joinChannel: (channelId: string) => Promise<any[]>;
    leaveChannel: (channelId: string) => Promise<any[]>;
    getChannelHistory: (channelId: string) => Promise<any[]>;
    inviteUser: (channelId: string, userId: string) => Promise<any[]>;
    makeChannelPrivate: (channelId: string) => Promise<any[]>;
    promoteToAdmin: (channelId: string, userId: string) => Promise<any[]>;
    sendMessage: (channelId: string, content: string) => Promise<any[]>;
    onNewMessage: (handler: (msg: any) => void) => (() => void) | void;
}

export function useChannel (client: ISocketClient | null, channelId: string | null, currentUserId: string | null) {
    const [messages, setMessages] = useState<any[]>([]);
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        if (!client || !channelId) return;
      
        // Reset messages when switching user
        setMessages([]);
      
        const normalize = (m: any) => ({
          id: m.id ?? m.messageId ?? m._id ?? `${m.senderId}-${m.createdAt || Date.now()}`,
          content: m.content ?? m.text ?? m.body ?? '',
          senderId: m.senderId ?? m.from ?? m.sender,
          senderName: m.senderName ?? m.fromName ?? m.senderUsername ?? m.sender,
          createdAt: m.createdAt ?? m.ts ?? new Date().toISOString(),
          status: m.status ?? 'sent', // new
        });
      
        let unsubscribeNew: (() => void) | void;
        // let unsubscribeTyping: (() => void) | void;

        client.joinChannelRoom(channelId)
        .then((history) => {
          if (!mounted.current) return;
          const normalized = (Array.isArray(history) ? history : []).map(normalize);
          setMessages(
            normalized.sort(
              (a: any, b: any) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
          );
        })
        .catch(() => {});
    
      
        const handleNew = (raw: any) => {
          // Ignore if it's my own message (already added optimistically)
          if (raw.senderId === 'me' || raw.senderId === currentUserId) return;
          const m = normalize(raw);
          setMessages((prev) => {
            if (prev.some((x) => x.id === m.id)) return prev;
            return [...prev, m];
          });
        };
      
        unsubscribeNew = client.onNewMessage ? client.onNewMessage(handleNew) : undefined;
      
      
        return () => {
          mounted.current = false;
          if (typeof unsubscribeNew === 'function') unsubscribeNew();
        };
      }, [client, channelId]);

      const sendMessage = async (text: string) => {
        if (!client || !channelId) return;
      
        const tempMsg = {
          id: `temp-${Date.now()}`,
          appId: 'temp',
          content: text,
          channelId: channelId,
          senderId: 'me',
          senderName: 'You',
          createdAt: new Date().toISOString(),
          status: 'sending', // 👈 new
        };
      
        setMessages((prev) => [...prev, tempMsg]);
      
        try {
          const res = await client.sendMessage(channelId, text) as any;
      
          if (res && res.id) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempMsg.id ? { ...m, 
                  id: res.id,
                  appId: res.appId ?? m.appId, 
                  senderId: res.senderId ?? m.senderId, 
                  senderName: res.senderName ?? m.senderName,
                  createdAt: res.createdAt ?? m.createdAt,
                  status: 'sent' } : m
              )
            );
          }
          return res;
        } catch (err) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempMsg.id ? { ...m, status: 'failed' } : m
            )
          );
          throw err;
        }
      };
      
      

      return {messages, sendMessage};
}
