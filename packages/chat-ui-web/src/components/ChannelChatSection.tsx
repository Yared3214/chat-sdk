import React from "react";
import { MessageList } from "./MessageList";
import { ChatOptions } from "./ChannelChatOptions";
import { Composer } from "./Composer";

export const ChannelChatSection: React.FC<{
    messages: any, 
    // channelId: string,
    sendMessage: any,
    currentUserId: string,
    messagesEndRef: React.RefObject<HTMLDivElement | null>,
    channelName: string,
    showOptions: boolean,
    setShowOptions: any,
    menuRef: React.RefObject<HTMLDivElement | null>,
}> = ({
    messages, 
    // channelId,
    sendMessage,
    currentUserId,
    messagesEndRef,
    channelName,
    showOptions,
    setShowOptions,
    menuRef
}) => {
    return (
        <div className="flex-1 flex flex-col bg-gradient-to-b from-white to-indigo-50 rounded-tl-2xl shadow-xl">
            {/* Chat header */}
            <div className="flex items-center justify-between px-3 md:px-5 py-3 border-b bg-white/80 backdrop-blur-md rounded-tl-2xl">
            {/* Left */}
            <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 font-bold shadow">
                {channelName?.charAt(0) || "U"}
                </div>
                <div>
                <h2 className="font-semibold text-gray-900 text-sm md:text-lg">
                    {channelName}
                </h2>
                <p className="text-[10px] md:text-xs text-green-500">2 Online</p>
                </div>
            </div>
                
            {/* Right */}
            <div className="flex items-center gap-2 md:gap-4 text-gray-500 relative">
                <button className="hover:text-indigo-600 transition">🔍</button>
                <div className="relative">
                <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="hover:text-indigo-600 transition"
                >
                    ⋮
                </button>
                {showOptions && (
                    <ChatOptions menuRef={menuRef}/>
                )}
                </div>
            </div>
            </div>
                
            {/* Messages */}
            <MessageList 
            messages={messages}
            currentUserId={currentUserId}
            messagesEndRef={messagesEndRef}
            isChannel={true} />
                
            {/* Composer */}
            <Composer handleSend={sendMessage}/>
        </div>
    )
}