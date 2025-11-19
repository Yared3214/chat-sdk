import React from "react";

export const ChatOptions: React.FC<{menuRef: React.RefObject<HTMLDivElement | null>}> = ({ menuRef }) => {
    return(
        <div
        ref={menuRef}
        className="absolute right-0 mt-2 w-40 md:w-48 bg-white shadow-xl rounded-xl border border-gray-200 py-2 z-20 animate-fadeIn"
        >
        {/* <button className="block w-full px-4 py-2 text-left hover:bg-indigo-50 text-gray-700">
            View Profile
        </button> */}
        <button className="block w-full px-4 py-2 text-left hover:bg-indigo-50 text-gray-700">
            Mute Notifications
        </button>
        <button className="block w-full px-4 py-2 text-left hover:bg-indigo-50 text-gray-700">
            Clear Chat
        </button>
        <button className="block w-full px-4 py-2 text-left text-red-500 hover:bg-red-50">
            Leave Channel
        </button>
        </div>
    )
}