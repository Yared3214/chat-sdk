import React from 'react';

export const TopNav: React.FC<{ active: string; onChange: (key: string) => void }> = ({ active, onChange }) => {
  const tabs = ['Users', 'Channels', 'Groups'];
  return (
    <div className="p-4 shadow bg-white flex justify-between items-center sticky top-0 z-10">
      <h1 className="text-xl font-bold text-indigo-600">💬 Chat Application</h1>
      <div className="space-x-6 font-medium">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3 py-1 rounded ${active === t ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
          {t}
        </button>
      ))}
    </div>
</div>
  );
};