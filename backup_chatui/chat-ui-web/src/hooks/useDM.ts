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

export function useDM(client: ISocketClient | null, otherUserId: string | null, currentUserId: string | null) {
  const [DMmessages, setDMmessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const mounted = useRef(true);

  const normalize = (m: any) => ({
    id: m.id ?? m.messageId ?? m._id ?? `${m.senderId}-${m.createdAt || Date.now()}`,
    content: m.content ?? m.text ?? m.body ?? '',
    senderId: m.senderId ?? m.from ?? m.sender,
    createdAt: m.createdAt ?? m.ts ?? new Date().toISOString(),
    status: m.status ?? 'sent', // new
  });

  useEffect(() => {
    mounted.current = true;
    if (!client || !otherUserId) return;
  
    // Reset messages when switching user
    setDMmessages([]);
  
    
  
    let unsubscribeNew: (() => void) | void;
    let unsubscribeTyping: (() => void) | void;
  
    client.joinDMRoom(otherUserId)
      .then((history) => {
        if (!mounted.current) return;
        const normalized = (Array.isArray(history) ? history : []).map(normalize);
        setDMmessages(
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
      setDMmessages((prev) => {
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
    const tempMsg = {
      id: `temp-${Date.now()}`,
      appId: 'temp',
      content: text,
      senderId: 'me',
      createdAt: new Date().toISOString(),
      status: 'sending', // 👈 new
    };

    setDMmessages((prev) => [...prev, tempMsg]);

    try {
      const res = await client.sendDM(otherUserId, text) as any;
      if(res && res.id) {
        // Update temp message status
        setDMmessages((prev) =>
          prev.map((m) =>
            m.id === tempMsg.id ? { ...m, 
              id: res.id,
              appId: res.appId ?? m.appId, 
              senderId: res.senderId ?? m.senderId, 
              createdAt: res.createdAt ?? m.createdAt,
              status: 'sent' } : m
          )
        );
      }
      return res;
    } catch (err) {
      setDMmessages((prev) =>
        prev.map((m) =>
          m.id === tempMsg.id ? { ...m, status: 'failed' } : m
        )
      );
      throw err;
  }
}

  const sendTyping = () => {
    if (!client || !otherUserId) return;
    if (client.sendTyping) client.sendTyping(otherUserId);
  };

  const markRead = (messageId: string) => {
    if (!client || !client.markAsRead) return Promise.resolve(null);
    return client.markAsRead(messageId);
  };

  return { DMmessages, sendDM, sendTyping, typingUsers, markRead };
}