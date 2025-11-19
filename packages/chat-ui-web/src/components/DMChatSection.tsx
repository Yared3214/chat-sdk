import React from "react";
import { MessageList } from "./MessageList";
import { ChatOptions } from "./DMChatOptions";
import { Composer } from "./Composer";

interface ChatSectionProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  sendDM: (text: string) => void;
  messages: Record<string, any[]>;
  currentUserId: string;
  startCall: () => Promise<void> | void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  otherUsername: string | null;
  showOptions: boolean;
  setShowOptions: (v: boolean) => void;
}

export const ChatSection: React.FC<ChatSectionProps> = ({
  menuRef,
  sendDM,
  messages,
  currentUserId,
  startCall,
  messagesEndRef,
  otherUsername,
  showOptions,
  setShowOptions,
}) => {
  const initial = otherUsername?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-white to-indigo-50 rounded-tl-2xl shadow-xl">
      {/* Chat header */}
      <div className="flex items-center justify-between px-3 md:px-5 py-3 border-b bg-white/80 backdrop-blur-md rounded-tl-2xl">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-indigo-200 grid place-items-center text-indigo-700 font-semibold shadow">
            {initial}
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 text-sm md:text-lg">{otherUsername || "User"}</h2>
            <p className="text-[10px] md:text-xs text-green-500">Online</p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 md:gap-4 text-slate-500 relative">
          <button className="hover:text-indigo-600 transition" title="Search">🔍</button>
          <div className="relative">
            <button
              onClick={() => setShowOptions(!showOptions)}
              className="hover:text-indigo-600 transition"
              aria-haspopup="menu"
              aria-expanded={showOptions}
              title="More"
            >
              ⋮
            </button>
            {showOptions && <ChatOptions menuRef={menuRef} startCall={startCall} />}
          </div>
        </div>
      </div>

      {/* Messages */}
      <MessageList messages={messages} currentUserId={currentUserId} messagesEndRef={messagesEndRef} isChannel={false} />

      {/* Composer */}
      <Composer handleSend={sendDM} />
    </div>
  );
};
