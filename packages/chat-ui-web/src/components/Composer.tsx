import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';

export const Composer: React.FC<{ onSend: (text: string) => void; onTyping?: () => void }> = ({ onSend, onTyping }) => {
  const [text, setText] = useState('');
  const { theme } = useTheme();

  const submit = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="p-4 border-t flex items-center gap-2 bg-white sticky bottom-0">
      <input
        type="text"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onTyping?.();
        }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        className="flex-1 border rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <button onClick={submit} className="bg-indigo-600 text-white px-6 py-2 rounded-full shadow hover:bg-indigo-700 transition">
        Send
      </button>
    </div>
  );
};