import React from "react";

interface ChatOptionsProps {
  menuRef: React.RefObject<HTMLDivElement | null>;
  startCall: () => Promise<void> | void;
}

export const ChatOptions: React.FC<ChatOptionsProps> = ({ menuRef, startCall }) => {
  const Item: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = "", children, ...props }) => (
    <button
      {...props}
      className={
        "block w-full px-4 py-2 text-left text-slate-700 hover:bg-indigo-50 transition rounded-lg " +
        className
      }
    >
      {children}
    </button>
  );

  return (
    <div
      ref={menuRef}
      className="absolute right-0 mt-2 w-44 md:w-52 bg-white shadow-xl rounded-xl border border-slate-200 py-2 z-20 animate-fadeIn"
      role="menu"
    >
      <Item>View Profile</Item>
      <Item>Mute Notifications</Item>
      <Item onClick={() => startCall()}>📞 Call</Item>
      <Item>Clear Chat</Item>
      <Item className="text-red-600 hover:bg-red-50">Block User</Item>
    </div>
  );
};
