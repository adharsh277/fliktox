"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api, getCurrentUser } from "../lib/api";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

function Avatar({ username, photo, size = "h-8 w-8 text-xs" }) {
  if (photo) {
    return <img src={photo} alt={username} className={`${size} rounded-full object-cover`} />;
  }
  return (
    <div className={`${size} flex items-center justify-center rounded-full bg-ember/30 font-bold text-gold`}>
      {username?.[0]?.toUpperCase() || "?"}
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel({ friends = [] }) {
  const [selectedId, setSelectedId] = useState(friends[0]?.id || null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [onlineIds, setOnlineIds] = useState(new Set());
  const [unread, setUnread] = useState({});
  const socketRef = useRef(null);
  const selectedIdRef = useRef(selectedId);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUser = useMemo(() => getCurrentUser(), []);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId && friends.length) {
      setSelectedId(friends[0].id);
    }
  }, [friends, selectedId]);

  const selectedFriend = useMemo(
    () => friends.find((f) => f.id === selectedId),
    [friends, selectedId]
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUser]);

  // Clear unread when selecting a friend
  useEffect(() => {
    if (selectedId) {
      setUnread((prev) => ({ ...prev, [selectedId]: 0 }));
    }
  }, [selectedId]);

  // Fetch messages when friend changes
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    api.messages(selectedId).then(setMessages).catch(() => setMessages([]));
  }, [selectedId]);

  // Socket connection
  useEffect(() => {
    const token = localStorage.getItem("fliktox_token");
    if (!token) return undefined;

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    socket.on("private:message", (msg) => {
      const current = selectedIdRef.current;
      if (msg.sender_id === current || msg.receiver_id === current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      // Unread badge for messages from others not currently selected
      if (msg.sender_id !== currentUser?.id && msg.sender_id !== current) {
        setUnread((prev) => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
      }
    });

    socket.on("user:typing", ({ userId }) => {
      if (userId === selectedIdRef.current) {
        setTypingUser(userId);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2500);
      }
    });

    socket.on("user:online", ({ userId }) => {
      setOnlineIds((prev) => new Set([...prev, userId]));
    });

    socket.on("user:offline", ({ userId }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    });

    socket.on("online:list", (ids) => {
      setOnlineIds(new Set(ids));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser?.id]);

  function emitTyping() {
    if (socketRef.current && selectedId) {
      socketRef.current.emit("typing", { receiverId: selectedId });
    }
  }

  async function onSendMessage(e) {
    e.preventDefault();
    if (!selectedId || !messageInput.trim()) return;

    const sent = await api.sendMessage(selectedId, messageInput.trim());
    setMessages((prev) => {
      if (prev.some((m) => m.id === sent.id)) return prev;
      return [...prev, sent];
    });
    setMessageInput("");
  }

  return (
    <section className="grid gap-3 md:grid-cols-[200px_1fr]">
      {/* Friend sidebar */}
      <aside className="card-surface rounded-2xl p-3">
        <h3 className="mb-2 text-sm uppercase tracking-wider text-mist/75">Friends</h3>
        <div className="space-y-1">
          {friends.map((friend) => {
            const isOnline = onlineIds.has(friend.id);
            const count = unread[friend.id] || 0;
            return (
              <button
                key={friend.id}
                type="button"
                onClick={() => setSelectedId(friend.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  selectedId === friend.id ? "bg-ember text-white" : "bg-white/5 text-mist hover:bg-white/10"
                }`}
              >
                <span className="relative">
                  <Avatar username={friend.username} photo={friend.profile_photo} size="h-7 w-7 text-[10px]" />
                  <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d1b2a] ${isOnline ? "bg-green-400" : "bg-gray-500"}`} />
                </span>
                <span className="flex-1 truncate">{friend.username}</span>
                {count > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ember text-[10px] font-bold text-white">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Chat area */}
      <div className="card-surface flex h-[400px] flex-col rounded-2xl">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          {selectedFriend ? (
            <>
              <Avatar username={selectedFriend.username} photo={selectedFriend.profile_photo} size="h-7 w-7 text-[10px]" />
              <span className="text-sm text-gold">{selectedFriend.username}</span>
              {onlineIds.has(selectedId) && (
                <span className="text-[10px] text-green-400">● online</span>
              )}
            </>
          ) : (
            <span className="text-sm text-mist/50">Select a friend</span>
          )}
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-3">
          {messages.map((msg) => {
            const isMine = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                {!isMine && selectedFriend && (
                  <Avatar username={selectedFriend.username} photo={selectedFriend.profile_photo} size="h-6 w-6 text-[9px]" />
                )}
                <div className={`max-w-[65%] rounded-2xl px-3 py-2 text-sm ${isMine ? "bg-ember text-white" : "bg-white/10 text-mist"}`}>
                  <p>{msg.message}</p>
                  <p className={`mt-0.5 text-[10px] ${isMine ? "text-white/50" : "text-mist/40"}`}>{formatTime(msg.created_at)}</p>
                </div>
                {isMine && currentUser && (
                  <Avatar username={currentUser.username} photo={currentUser.profile_photo} size="h-6 w-6 text-[9px]" />
                )}
              </div>
            );
          })}
          {typingUser && selectedFriend && (
            <div className="flex items-center gap-2 text-xs text-mist/50">
              <Avatar username={selectedFriend.username} photo={selectedFriend.profile_photo} size="h-5 w-5 text-[8px]" />
              {selectedFriend.username} is typing
              <span className="animate-pulse">...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={onSendMessage} className="flex gap-2 border-t border-white/10 p-3">
          <input
            value={messageInput}
            onChange={(e) => {
              setMessageInput(e.target.value);
              emitTyping();
            }}
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
