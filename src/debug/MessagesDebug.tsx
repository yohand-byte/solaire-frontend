import React, { useEffect, useMemo, useState } from 'react';
import { messagesApi } from '../api/messages';
import { Message } from '../types';
import { io } from 'socket.io-client';

export function MessagesDebug() {
  const [projectId, setProjectId] = useState('smoke');
  const [content, setContent] = useState('Hello');
  const [messages, setMessages] = useState<Message[]>([]);
  const [socketLog, setSocketLog] = useState<string[]>([]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_WS_URL || 'http://localhost:3000', { autoConnect: true });
    socket.on('connect', () => setSocketLog((l) => [...l, 'connected']));
    socket.on('message:new', (msg: Message) => {
      setSocketLog((l) => [...l, `message:new ${msg.id}`]);
      setMessages((prev) => [msg, ...prev]);
    });
    socket.on('message:read', (msg: { id: string }) => setSocketLog((l) => [...l, `message:read ${msg.id}`]));
    return () => socket.disconnect();
  }, []);

  const load = async () => {
    const res = await messagesApi.list(projectId);
    setMessages(res.data.items || []);
  };

  const send = async () => {
    await messagesApi.create({ projectId, content });
    await load();
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Debug Messages</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="projectId" />
        <button onClick={load}>Load</button>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="content" />
        <button onClick={send}>Send</button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <strong>Socket log:</strong>
        <pre style={{ background: '#111', color: '#0f0', padding: 8 }}>{socketLog.join('\n') || '—'}</pre>
      </div>
      <div>
        <strong>Messages ({messages.length}):</strong>
        <ul>
          {messages.map((m) => (
            <li key={m.id}>{m.projectId} · {m.content} · {m.read ? 'read' : 'unread'}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
