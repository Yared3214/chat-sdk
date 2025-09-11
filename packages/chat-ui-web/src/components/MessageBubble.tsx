import React from 'react';
import { useTheme } from '../context/ThemeContext';

export const MessageBubble: React.FC<{ message: any; isOwn: boolean }> = ({ message, isOwn }) => {
  const { theme } = useTheme();
  return (
    <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div className={`px-4 py-2 rounded-2xl max-w-xs shadow-md ${isOwn ? theme.outgoing : theme.incoming}`}>
        {message.content}
        {new Date(message.createdAt).toLocaleTimeString()}
        {message.type === "sent" && (
          <p className="text-xs text-gray-200 mt-1 text-right">
            {message.status === "read" ? "✓ Read" : "✓ Delivered"}
          </p>
        )}
      </div>
    </div>
  );
};