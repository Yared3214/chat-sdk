import React, { useState } from "react";

interface ComposerProps {
  handleSend: (text: string) => void | Promise<void>;
}

export const Composer: React.FC<ComposerProps> = ({ handleSend }) => {
  const [newMessage, setNewMessage] = useState("");

  const handleSendMessage = () => {
    const text = newMessage.trim();
    if (!text) return;
    handleSend(text);
    setNewMessage("");
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="p-2 md:p-4 border-t flex items-center gap-2 md:gap-3 bg-white/90 backdrop-blur sticky bottom-0">
      <input
        type="text"
        placeholder="Type a message…"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyDown={onKeyDown}
        className="flex-1 border rounded-full px-3 py-2 md:px-4 shadow-inner text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <button
        onClick={handleSendMessage}
        className="bg-indigo-600 text-white px-4 md:px-6 py-2 rounded-full shadow-md hover:bg-indigo-700 transition"
      >
        Send
      </button>
    </div>
  );
};
