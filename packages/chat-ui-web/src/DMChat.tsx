import React, { useState, useEffect } from "react";
import { SocketClient } from "../../sdk/src/client";

type DMChatProps = {
  client: SocketClient;
  otherUserId: string;
};

export const DMChat: React.FC<DMChatProps> = ({ client, otherUserId }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    // Join DM room and load history
    client.joinDMRoom(otherUserId).then((history: any) => {
      setMessages(history);
    });

    // Listen for new DMs
    client.onNewDM((msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      // cleanup listeners if needed
    };
  }, [client, otherUserId]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    await client.sendDM(otherUserId, input);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full border rounded-lg p-4">
      <div className="flex-1 overflow-y-auto space-y-2">
        {messages.map((msg, idx) => (
          <div key={idx} className="p-2 rounded bg-gray-100">
            <strong>{msg.senderId}:</strong> {msg.content}
          </div>
        ))}
      </div>

      <div className="flex mt-2">
        <input
          className="flex-1 border rounded p-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          className="ml-2 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Send
        </button>
      </div>
    </div>
  );
};
