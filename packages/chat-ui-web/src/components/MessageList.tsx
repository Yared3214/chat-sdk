import React, { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';

export const MessageList: React.FC<{ messages: any[]; currentUserId: string }> = ({ messages, currentUserId }) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div>
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} isOwn={m.senderId === currentUserId} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
