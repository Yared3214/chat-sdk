import { Check, CheckCheck, Loader2, XCircle } from "lucide-react";
import React from "react";

export const MessageBubble: React.FC<{ msg: any; currentUserId: string, isChannel: boolean }> = ({
  msg,
  currentUserId,
  isChannel
}) => {
  const isCurrentUser = msg.senderId === currentUserId;

  return (
    <div
      key={msg.id}
      className={`flex mb-3 ${(isCurrentUser || msg.senderId === 'me') ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`px-4 py-2 rounded-2xl max-w-xs shadow-md flex flex-col ${
          (isCurrentUser || msg.senderId === 'me')
            ? "bg-indigo-600 text-white rounded-br-none"
            : "bg-gray-100 text-gray-900 rounded-bl-none"
        }`}
      >
        {/* Username */}
        {(!isCurrentUser && isChannel && msg.senderId !== 'me') && (
          <span className="text-xs font-semibold text-indigo-700 mb-1">
            {msg.senderName || "Unknown User"}
          </span>
        )}

        {/* Message content */}
        <span className="break-words whitespace-pre-wrap">{msg.content}</span>

        {/* Time + status */}
        <div className="flex justify-between items-center mt-1 text-xs opacity-70">
  {     new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}

        {(isCurrentUser || msg.senderId === "me") && (
          <span className="ml-2 flex items-center gap-1">
      {     msg.status === "sending" && (
              <Loader2 size={14} className="animate-spin" />
            )}
            {msg.status === "sent" && <Check size={14} />}
            {msg.status === "delivered" && <CheckCheck size={14} />}
            {msg.status === "read" && (
              <CheckCheck size={14} className="text-blue-400" />
            )}
            {msg.status === "failed" && (
              <XCircle size={14} className="text-red-500" />
            )}
          </span>
        )}
      </div>

      </div>
    </div>
  );
};
