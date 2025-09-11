import React, { useEffect, useRef, useState } from 'react';
import { Composer } from './Composer';
import { MessageList } from './MessageList';
import { TopNav } from './TopNav';
import { useDM } from '../hooks/useDM';
import { useTheme } from '../context/ThemeContext';

export const DMChatShell: React.FC<{ client: any; currentUserId: string }> = ({ client, currentUserId }) => {
  // const [messages, setMessages] = useState([
  //   { id: 1, sender: "Alice", text: "Hello, how are you?", type: "received" },
  //   { id: 2, sender: "You", text: "I'm good, thanks! How about you?", type: "sent", status: "delivered" },
  // ]);
  const [newMessage, setNewMessage] = useState("");
  const tabs = ['Users', 'Channels', 'Groups'];
  const [active, setActive] = useState('Users');
  const [users, setUsers] = useState<any[]>([]);
  const [otherUserId, setOtherUserId] = useState('');
  const [otherUsername, setOtherUsername] = useState('');
  const { messages, sendDM, typingUsers, sendTyping } = useDM(client, otherUserId);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // const { theme } = useTheme() as any;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetchedUsers = await client.listAllUsers();
        setUsers(fetchedUsers);
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };
    fetchUsers();
  }, [client]);

  useEffect(()=>{
    const fetchUsername = async(userId: string) => {
      if (!otherUserId) return;
      try{
        const otheruserName = await client.getUsernameById(otherUserId);
        setOtherUsername(otheruserName.username);
      } catch (err) {
        console.error('Failed to fetch username', err);
      }
    }

    fetchUsername(otherUserId);
  },[otherUserId])

    

  const handleSend = () => {
    if (!newMessage.trim()) return;
    sendDM(newMessage.trim())
    setNewMessage('')
  }

  return (
    <div className="h-screen bg-gradient-to-r from-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <div className="p-4 shadow bg-white flex justify-between items-center sticky top-0 z-10">
      <h1 className="text-xl font-bold text-indigo-600">💬 Chat Application</h1>
      <div className="space-x-6 font-medium">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => setActive(t)}
          className={`px-3 py-1 rounded ${active === t ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
          {t}
        </button>
      ))}
    </div>
</div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 border-r bg-white/70 backdrop-blur-md p-4 flex flex-col shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Active Users</h2>
          <ul className="space-y-4 overflow-y-auto pr-2">
            {users.map((user) => (
              <li
                key={user.id}
                onClick={() => setOtherUserId(user.id)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-indigo-50 transition"
              >
                <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full border" />
                <div>
                  <span className="font-medium text-gray-800">{user.username}</span>
                  {/* <span
                    className={`block text-sm ${
                      user.status === "online" ? "text-green-600" : "text-gray-400"
                    }`}
                  >
                    {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                  </span> */}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Chat Section */}
  {active === 'Users' && (
    otherUserId ? (
      <div className="flex-1 flex flex-col bg-white rounded-tl-2xl shadow-lg">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-white rounded-tl-2xl">
          {/* Left: Username */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold">
              {otherUsername?.charAt(0) || "U"}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{otherUsername}</h2>
              <p className="text-xs text-green-500">Online</p>
            </div>
          </div>

          {/* Right: Search + Menu */}
          <div className="flex items-center gap-4 text-gray-500">
            {/* Search Icon */}
            <button className="hover:text-indigo-600 transition">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"
                />
              </svg>
            </button>

            {/* Vertical 3 Dots */}
            <button className="hover:text-indigo-600 transition">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto bg-gradient-to-b from-white to-indigo-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.senderId === currentUserId ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-4 py-2 rounded-2xl max-w-xs shadow-md flex flex-col ${
                  msg.senderId === currentUserId
                    ? "bg-indigo-600 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-900 rounded-bl-none"
                }`}
              >
                <span className="break-words whitespace-pre-wrap">{msg.content}</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs opacity-70">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {msg.senderId === currentUserId && (
                    <span className="text-xs opacity-80 ml-2">
                      ✓ {msg.status === "read" ? "Read" : "Delivered"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="p-4 border-t flex items-center gap-2 bg-white sticky bottom-0">
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={handleSend}
            className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow hover:bg-indigo-700 transition"
          >
            Send
          </button>
        </div>
      </div>
    ) : (
      <div className="p-6 text-gray-500">Select a user to start chatting</div>
    )
  )}
      </div>
    </div>
  );
};