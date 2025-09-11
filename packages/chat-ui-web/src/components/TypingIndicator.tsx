import React from 'react';

export const TypingIndicator: React.FC<{ users: string[] }> = ({ users }) => {
  if (!users || users.length === 0) return null;
  const label = users.length === 1 ? `${users[0]} is typing...` : `${users.join(', ')} are typing...`;
  return <div className="px-4 py-2 text-sm text-gray-500">{label}</div>;
};