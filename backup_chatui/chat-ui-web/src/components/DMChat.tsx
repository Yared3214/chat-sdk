import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDM } from "../hooks/useDM";
import { ChatSection } from "./DMChatSection";
import { useChannel } from "../hooks/useChannel";
import { ChannelChatSection } from "./ChannelChatSection";
import { useCall } from "../hooks/useCall";
import VideoCall from "./VideoCall";

// Types
type TabKey = "Users" | "Channels" | "Groups";

interface DMChatShellProps {
  client: any;
  currentUserId: string;
}

// Small UI helpers
const PillButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", children, ...props }) => (
  <button
    {...props}
    className={
      "px-3 py-1.5 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400/60 " +
      className
    }
  >
    {children}
  </button>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-base md:text-lg font-semibold mb-4 text-gray-700">{children}</h2>
);

export const DMChatShell: React.FC<DMChatShellProps> = ({ client, currentUserId }) => {
  // UI State
  const [active, setActive] = useState<TabKey>("Users");
  const [showSidebar, setShowSidebar] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);

  // Selection State
  const [otherUserId, setOtherUserId] = useState("");
  const [channelId, setChannelId] = useState("");

  // Display State
  const [users, setUsers] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [otherUsername, setOtherUsername] = useState("");
  const [channelName, setChannelName] = useState("");

  const menuRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Hooks
  const { DMmessages, sendDM } = useDM(client, otherUserId, currentUserId);
  const { messages, sendMessage } = useChannel(client, channelId, currentUserId);
  const {
    incomingCall,
    activeCall,
    isCalling,
    isRinging,
    isOnCall,
    isEnded,
    callHistory,
    startCall,
    answerCall,
    rejectCall,
    endCall,
  } = useCall(client, currentUserId, otherUserId);

  // Derived UI data
  const tabs: TabKey[] = useMemo(() => ["Users", "Channels", "Groups"], []);

  const groupedMessages = useMemo(
    () =>
      DMmessages.reduce((groups: any, msg) => {
        const dateKey = new Date(msg.createdAt).toDateString();
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(msg);
        return groups;
      }, {}),
    [DMmessages]
  );

  const groupedChannelMessages = useMemo(
    () =>
      messages.reduce((groups: any, msg) => {
        const dateKey = new Date(msg.createdAt).toDateString();
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(msg);
        return groups;
      }, {}),
    [messages]
  );

  // Effects: scrolling and click-away
  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [DMmessages, messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowOptions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Effects: fetch lists & display names
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const fetched = await client.listAllUsers();
        setUsers(fetched);
      } catch {}
    };
    const fetchChannels = async () => {
      try {
        const fetched = await client.listChannels();
        setChannels(fetched || []);
      } catch {}
    };
    const fetchGroups = async () => {
      try {
        const fetched = await client.listAllGroups?.();
        setGroups(fetched || []);
      } catch {}
    };
    fetchUsers();
    fetchChannels();
    fetchGroups();
  }, [client]);

  useEffect(() => {
    const run = async () => {
      try {
        if (otherUserId) {
          const res = await client.getUsernameById(otherUserId);
          setOtherUsername(res.username);
        } else {
          setOtherUsername("");
        }
        if (channelId) {
          const res = await client.getChannelName(channelId);
          setChannelName(res.name);
        } else {
          setChannelName("");
        }
      } catch {}
    };
    run();
  }, [otherUserId, channelId, client]);

  // Effects: call UI lifecycle
  useEffect(() => {
    if (!isOnCall) setShowVideoCall(false);
  }, [isOnCall]);

  useEffect(() => {
    if (isOnCall && !showVideoCall) setShowVideoCall(true);
  }, [isOnCall, showVideoCall]);

  // Handlers: calls
  const handleStartCall = async () => {
    try {
      await startCall();
      setShowVideoCall(true);
    } catch (err) {
      console.error("Failed to start call", err);
    }
  };

  const handleAnswerCall = async (callId: string, fromUserId: string) => {
    try {
      await answerCall(callId, fromUserId);
      setShowVideoCall(true);
    } catch (err) {
      console.error("Failed to answer call", err);
    }
  };

  const handleEndCall = async () => {
    try {
      await endCall();
    } catch (err) {
      console.error("Failed to end call", err);
    } finally {
      setShowVideoCall(false);
    }
  };

  // Render
  return (
    <div className="h-screen flex flex-col bg-gradient-to-tr from-indigo-50 via-white to-violet-100">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 grid place-items-center rounded-xl bg-indigo-600 text-white shadow">
              💬
            </div>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight">Chat</h1>
          </div>

          {/* Desktop Tabs */}
          <nav className="hidden sm:flex gap-2">
            {tabs.map((t) => (
              <PillButton
                key={t}
                onClick={() => setActive(t)}
                className={
                  (active === t
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-600 hover:bg-indigo-50 ") + " font-medium"
                }
              >
                {t}
              </PillButton>
            ))}
          </nav>

          {/* Mobile Hamburger */}
          <PillButton onClick={() => setShowSidebar(true)} className="sm:hidden text-slate-700 hover:bg-indigo-50">
            ☰
          </PillButton>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="mx-auto max-w-7xl h-full grid grid-cols-1 md:grid-cols-[18rem_1fr] gap-0">
          {/* Sidebar (desktop) */}
          <aside className="hidden md:flex flex-col border-r bg-white/70 backdrop-blur-md p-4">
            <SectionTitle>{active}</SectionTitle>
            <ul className="space-y-2 overflow-y-auto pr-2">
              {active === "Users" &&
                users.map((u) => (
                  <li
                    key={u.id}
                    onClick={() => setOtherUserId(u.id)}
                    className={
                      "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all " +
                      (otherUserId === u.id ? "bg-indigo-100 shadow" : "hover:bg-indigo-50")
                    }
                  >
                    <img src={u.avatar} alt={u.name} className="w-8 h-8 md:w-10 md:h-10 rounded-full border" />
                    <span className="font-medium text-slate-800 hidden sm:block">{u.username}</span>
                  </li>
                ))}

              {active === "Channels" &&
                channels.map((c) => (
                  <li
                    key={c.id}
                    onClick={() => setChannelId(c.id)}
                    className={
                      "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all " +
                      (channelId === c.id ? "bg-indigo-100 shadow" : "hover:bg-indigo-50")
                    }
                  >
                    <img src={c.avatar} alt={c.name} className="w-8 h-8 md:w-10 md:h-10 rounded-full border" />
                    <span className="font-medium text-slate-800 hidden sm:block">{c.name}</span>
                  </li>
                ))}

              {active === "Groups" &&
                groups.map((g) => (
                  <li key={g.id} className="p-2 rounded-lg hover:bg-indigo-50 cursor-pointer">
                    {g.name}
                  </li>
                ))}
            </ul>
          </aside>

          {/* Conversation Area */}
          <section className="relative overflow-hidden">
            {/* Mobile Sidebar Panel */}
            {showSidebar && (
              <div className="fixed inset-0 z-30 flex">
                <div className="w-72 bg-white shadow-xl p-4 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <SectionTitle>{active}</SectionTitle>
                    <PillButton onClick={() => setShowSidebar(false)} className="text-slate-600 hover:text-red-500">
                      ✕
                    </PillButton>
                  </div>

                  {/* Mobile Tabs */}
                  <div className="flex gap-2 mb-4">
                    {tabs.map((t) => (
                      <PillButton
                        key={t}
                        onClick={() => setActive(t)}
                        className={
                          (active === t
                            ? "bg-indigo-600 text-white shadow"
                            : "bg-gray-100 text-slate-700 hover:bg-indigo-50") + " text-sm"
                        }
                      >
                        {t}
                      </PillButton>
                    ))}
                  </div>

                  {/* Mobile List */}
                  <ul className="space-y-3 overflow-y-auto pr-2 flex-1">
                    {active === "Users" &&
                      users.map((u) => (
                        <li
                          key={u.id}
                          onClick={() => {
                            setOtherUserId(u.id);
                            setShowSidebar(false);
                          }}
                          className={
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all " +
                            (otherUserId === u.id ? "bg-indigo-100 shadow" : "hover:bg-indigo-50")
                          }
                        >
                          <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full border" />
                          <span className="font-medium text-slate-800">{u.username}</span>
                        </li>
                      ))}

                    {active === "Channels" &&
                      channels.map((c) => (
                        <li
                          key={c.id}
                          onClick={() => {
                            setChannelId(c.id);
                            setShowSidebar(false);
                          }}
                          className={
                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all " +
                            (channelId === c.id ? "bg-indigo-100 shadow" : "hover:bg-indigo-50")
                          }
                        >
                          <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-full border" />
                          <span className="font-medium text-slate-800">{c.name}</span>
                        </li>
                      ))}

                    {active === "Groups" &&
                      groups.map((g) => (
                        <li key={g.id} className="p-2 rounded-lg hover:bg-indigo-50 cursor-pointer">
                          {g.name}
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="flex-1 bg-black/40" onClick={() => setShowSidebar(false)} />
              </div>
            )}

            {/* Chat Sections */}
            <div className="h-full overflow-hidden">
              {active === "Users" && (
                <ChatSection
                  menuRef={menuRef}
                  sendDM={sendDM}
                  messages={groupedMessages}
                  currentUserId={currentUserId}
                  startCall={handleStartCall}
                  messagesEndRef={messagesEndRef}
                  otherUsername={otherUsername}
                  showOptions={showOptions}
                  setShowOptions={setShowOptions}
                />
              )}

              {active === "Channels" && (
                <ChannelChatSection
                  messages={groupedChannelMessages}
                  sendMessage={sendMessage}
                  currentUserId={currentUserId}
                  messagesEndRef={messagesEndRef}
                  channelName={channelName}
                  showOptions={showOptions}
                  setShowOptions={setShowOptions}
                  menuRef={menuRef}
                />
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Call Overlay (pre-Video UI states) */}
      {(isCalling || isRinging || isOnCall) && !showVideoCall && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white/95 rounded-2xl shadow-2xl p-6 w-[90%] max-w-sm text-center space-y-4 border border-slate-200">
            {/* Ringing State */}
            {isRinging && (
              <>
                <p className="text-lg font-semibold text-slate-800">Incoming call from {incomingCall?.fromUserId}</p>
                <div className="flex justify-center gap-4">
                  <PillButton
                    onClick={() => handleAnswerCall(incomingCall.id, incomingCall.fromUserId)}
                    className="px-5 py-2 bg-green-600 text-white shadow hover:bg-green-700"
                  >
                    ✅ Accept
                  </PillButton>
                  <PillButton onClick={() => rejectCall()} className="px-5 py-2 bg-red-600 text-white shadow hover:bg-red-700">
                    ❌ Decline
                  </PillButton>
                </div>
              </>
            )}

            {/* Calling State */}
            {isCalling && (
              <>
                <p className="text-lg font-semibold text-slate-800">Calling…</p>
                <PillButton onClick={handleEndCall} className="px-5 py-2 bg-red-600 text-white shadow hover:bg-red-700">
                  Cancel
                </PillButton>
              </>
            )}

            {/* On Call Fallback */}
            {isOnCall && !isRinging && !isCalling && (
              <>
                <p className="text-lg font-semibold text-slate-800">Connecting video…</p>
                <PillButton onClick={() => setShowVideoCall(true)} className="px-5 py-2 bg-indigo-600 text-white shadow hover:bg-indigo-700">
                  Open Video
                </PillButton>
              </>
            )}
          </div>
        </div>
      )}

      {/* Full Video Call UI */}
      {showVideoCall && (
        <VideoCall
          client={client}
          targetUserId={otherUserId || activeCall?.receiverId || incomingCall?.fromUserId}
          onHangup={handleEndCall}
          otherDisplayName={otherUsername}
        />
      )}
    </div>
  );
};
