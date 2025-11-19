import { useEffect, useRef, useState } from 'react';

// Minimal client interface (duck-typed)
export type ISocketClient = {
  joinDMRoom: (otherUserId: string) => Promise<any[]>;
  sendDM: (receiverId: string, content: string) => Promise<any>;
  onNewDM: (handler: (msg: any) => void) => (() => void) | void;
  onTyping?: (handler: (payload: any) => void) => (() => void) | void;
  sendTyping?: (otherUserId: string) => void;
  markAsRead?: (messageId: string) => Promise<any>;
};

export function useDM(client: ISocketClient | null, otherUserId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!client || !otherUserId) return;
  
    // Reset messages when switching user
    setMessages([]);
  
    const normalize = (m: any) => ({
      id: m.id ?? m.messageId ?? m._id ?? `${m.senderId}-${m.createdAt || Date.now()}`,
      content: m.content ?? m.text ?? m.body ?? '',
      senderId: m.senderId ?? m.from ?? m.sender,
      createdAt: m.createdAt ?? m.ts ?? new Date().toISOString(),
    });
  
    let unsubscribeNew: (() => void) | void;
    let unsubscribeTyping: (() => void) | void;
  
    client.joinDMRoom(otherUserId)
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
      const m = normalize(raw);
      setMessages((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev;
        return [...prev, m];
      });
    };
  
    unsubscribeNew = client.onNewDM ? client.onNewDM(handleNew) : undefined;
  
    if (client.onTyping) {
      unsubscribeTyping = client.onTyping((p: any) => {
        const who = p.userId ?? p.user ?? '';
        setTypingUsers((prev) => {
          if (!who) return prev;
          if (p.event === 'start') return Array.from(new Set([...prev, who]));
          return prev.filter((u) => u !== who); // stop typing
        });
      });
    }
  
    return () => {
      mounted.current = false;
      if (typeof unsubscribeNew === 'function') unsubscribeNew();
      if (typeof unsubscribeTyping === 'function') unsubscribeTyping();
    };
  }, [client, otherUserId]);
  

  const sendDM = async (text: string) => {
    if (!client || !otherUserId) return;
    const res = await client.sendDM(otherUserId, text);
    return res;
  };

  const sendTyping = () => {
    if (!client || !otherUserId) return;
    if (client.sendTyping) client.sendTyping(otherUserId);
  };

  const markRead = (messageId: string) => {
    if (!client || !client.markAsRead) return Promise.resolve(null);
    return client.markAsRead(messageId);
  };

  return { messages, sendDM, sendTyping, typingUsers, markRead };
}