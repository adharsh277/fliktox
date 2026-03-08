"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api } from "../lib/api";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export default function ChatPanel({ friends = [] }) {
  const [selectedId, setSelectedId] = useState(friends[0]?.id || null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const socketRef = useRef(null);
  const selectedIdRef = useRef(selectedId);

  // Keep ref in sync so socket callback sees the latest value
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId && friends.length) {
      setSelectedId(friends[0].id);
    }
  }, [friends, selectedId]);

  const selectedFriend = useMemo(
    () => friends.find((friend) => friend.id === selectedId),
    [friends, selectedId]
  );

  // Fetch message history when friend changes
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    api.messages(selectedId).then(setMessages).catch(() => setMessages([]));
  }, [selectedId]);

  // Single socket connection for the entire component lifetime
  useEffect(() => {
    const token = localStorage.getItem("fliktox_token");
    if (!token) {
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    socket.on("private:message", (msg) => {
      const currentFriend = selectedIdRef.current;
      if (msg.sender_id === currentFriend || msg.receiver_id === currentFriend) {
        setMessages((prev) => {
          // Deduplicate by id
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // connect once

  async function onSendMessage(e) {
    e.preventDefault();
    if (!selectedId || !messageInput.trim()) {
      return;
    }

    const sent = await api.sendMessage(selectedId, messageInput.trim());
    setMessages((prev) => {
      if (prev.some((m) => m.id === sent.id)) return prev;
      return [...prev, sent];
    });
    setMessageInput("");
  }

  return (
    <section className="grid gap-3 md:grid-cols-[240px_1fr]">
      <aside className="card-surface rounded-2xl p-3">
        <h3 className="mb-2 text-sm uppercase tracking-wider text-mist/75">Friends</h3>
        <div className="space-y-2">
          {friends.map((friend) => (
            <button
              key={friend.id}
              type="button"
              onClick={() => setSelectedId(friend.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                selectedId === friend.id ? "bg-ember text-white" : "bg-white/5 text-mist hover:bg-white/10"
              }`}
            >
              {friend.username}
            </button>
          ))}
        </div>
      </aside>

      <div className="card-surface flex h-[360px] flex-col rounded-2xl">
        <div className="border-b border-white/10 px-4 py-3 text-sm text-gold">
          {selectedFriend ? `Chat with ${selectedFriend.username}` : "Select a friend"}
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {messages.map((msg) => (
            <div key={msg.id} className="rounded-lg bg-white/5 px-3 py-2 text-sm text-mist">
              {msg.message}
            </div>
          ))}
        </div>
        <form onSubmit={onSendMessage} className="flex gap-2 border-t border-white/10 p-3">
          <input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="flex-1 rounded-lg border border-white/20 bg-[#102032] px-3 py-2 text-sm outline-none focus:border-ember"
            placeholder="Type a message"
          />
          <button type="submit" className="rounded-lg bg-ember px-4 py-2 text-sm text-white">
            Send
          </button>
        </form>
      </div>
    </section>
  );
}
