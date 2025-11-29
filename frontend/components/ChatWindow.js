import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5000';

export default function ChatWindow({ userId, otherUserId }){
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const socketRef = useRef();

  useEffect(() => {
    socketRef.current = io(WS_URL);
    socketRef.current.on(`message:${userId}`, (msg) => {
      setMessages(m => [...m, msg]);
    });
    return () => { socketRef.current.disconnect(); };
  }, [userId]);

  const send = () => {
    if (!text) return;
    const payload = { from: userId, to: otherUserId, text };
    socketRef.current.emit('private_message', payload);
    setMessages(m => [...m, { ...payload, createdAt: new Date().toISOString() }]);
    setText('');
  };

  return (
    <div className="border rounded p-4 bg-white">
      <div className="h-60 overflow-auto space-y-2 mb-3">
        {messages.map((m,i) => (
          <div key={i} className={`p-2 rounded ${m.from===userId ? 'bg-blue-100 self-end' : 'bg-gray-100'}`}>
            <div className="text-sm">{m.text}</div>
            <div className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={e=>setText(e.target.value)} className="flex-1 border px-3 py-2 rounded" />
        <button onClick={send} className="bg-blue-600 text-white px-4 rounded">Send</button>
      </div>
    </div>
  );
}
