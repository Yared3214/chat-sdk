import React, { useMemo } from "react";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
  messages: Record<string, any[]>;
  currentUserId: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isChannel: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, currentUserId, messagesEndRef, isChannel }) => {
  const sortedKeys = useMemo(() => Object.keys(messages || {}).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()), [messages]);

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="flex-1 p-3 md:p-6 space-y-4 overflow-y-auto">
      {sortedKeys.map((dateKey) => (
        <div key={dateKey}>
          {/* Date Separator */}
          <div className="flex justify-center my-3">
            <span className="text-xs md:text-sm text-slate-600 bg-slate-200/70 px-3 py-1 rounded-full shadow">
              {formatDate(new Date(dateKey))}
            </span>
          </div>

          {/* Messages for this date */}
          {(messages[dateKey] || []).map((msg: any) => (
            <MessageBubble key={msg.id || msg._id || `${msg.createdAt}-${msg.senderId || msg.userId}`} msg={msg} currentUserId={currentUserId} isChannel={isChannel} />
          ))}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
