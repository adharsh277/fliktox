"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api, getCurrentUser } from "../lib/api";
import { getSocket } from "../lib/socket";

const QUICK_REACTIONS = ["👍", "❤️", "😂"];

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
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMovieId, setShareMovieId] = useState("");
  const [shareMovieTitle, setShareMovieTitle] = useState("");
  const [shareMoviePoster, setShareMoviePoster] = useState("");
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingUser]);

  useEffect(() => {
    if (selectedId) {
      setUnread((prev) => ({ ...prev, [selectedId]: 0 }));
      api.seenMessages(selectedId).catch(() => {});
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.sender_id === selectedId && msg.receiver_id === currentUser?.id) {
            return { ...msg, seen: true, seen_at: new Date().toISOString() };
          }
          return msg;
        })
      );
    }
  }, [selectedId, currentUser?.id]);

  async function loadMessages(friendId, cursor = null, appendOlder = false) {
    if (!friendId) {
      setMessages([]);
      setNextCursor(null);
      return;
    }

    const response = await api.messages(friendId, cursor, 30);
    const incoming = Array.isArray(response?.messages) ? response.messages : [];

    if (appendOlder) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const dedupedIncoming = incoming.filter((m) => !existingIds.has(m.id));
        return [...dedupedIncoming, ...prev];
      });
    } else {
      setMessages(incoming);
    }

    setNextCursor(response?.nextCursor || null);
  }

  useEffect(() => {
    loadMessages(selectedId).catch(() => {
      setMessages([]);
      setNextCursor(null);
    });
  }, [selectedId]);

  useEffect(() => {
    if (!currentUser?.id) {
      return undefined;
    }

    const socket = getSocket();
    if (!socket) {
      return undefined;
    }

    socketRef.current = socket;

    function onPrivateMessage(msg) {
      const current = selectedIdRef.current;
      if (msg.sender_id === current || msg.receiver_id === current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      if (msg.sender_id !== currentUser.id && msg.sender_id !== current) {
        setUnread((prev) => ({ ...prev, [msg.sender_id]: (prev[msg.sender_id] || 0) + 1 }));
      }
    }

    function onTyping({ userId }) {
      if (userId === selectedIdRef.current) {
        setTypingUser(userId);
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 2500);
      }
    }

    function onOnline({ userId }) {
      setOnlineIds((prev) => new Set([...prev, userId]));
    }

    function onOffline({ userId }) {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }

    function onOnlineList(ids) {
      setOnlineIds(new Set(ids));
    }

    function onSeen({ messageIds }) {
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        return;
      }
      const idSet = new Set(messageIds);
      setMessages((prev) =>
        prev.map((msg) => (idSet.has(msg.id) ? { ...msg, seen: true, seen_at: new Date().toISOString() } : msg))
      );
    }

    function onReaction({ messageId, reactionCounts }) {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, reaction_counts: reactionCounts || {} } : msg))
      );
    }

    socket.on("private:message", onPrivateMessage);
    socket.on("typing", onTyping);
    socket.on("user:typing", onTyping);
    socket.on("online", onOnline);
    socket.on("user:online", onOnline);
    socket.on("offline", onOffline);
    socket.on("user:offline", onOffline);
    socket.on("online:list", onOnlineList);
    socket.on("message:seen", onSeen);
    socket.on("message:reaction", onReaction);

    return () => {
      socket.off("private:message", onPrivateMessage);
      socket.off("typing", onTyping);
      socket.off("user:typing", onTyping);
      socket.off("online", onOnline);
      socket.off("user:online", onOnline);
      socket.off("offline", onOffline);
      socket.off("user:offline", onOffline);
      socket.off("online:list", onOnlineList);
      socket.off("message:seen", onSeen);
      socket.off("message:reaction", onReaction);
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

  async function onLoadOlder() {
    if (!selectedId || !nextCursor || loadingOlder) {
      return;
    }

    setLoadingOlder(true);
    try {
      await loadMessages(selectedId, nextCursor, true);
    } finally {
      setLoadingOlder(false);
    }
  }

  async function onReact(messageId, reaction) {
    try {
      const updated = await api.reactMessage(messageId, reaction);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, reaction_counts: updated.reactionCounts || {} } : msg))
      );
    } catch {
      // Ignore reaction errors to keep chat flow smooth.
    }
  }

  async function onRemoveReaction(messageId) {
    try {
      const updated = await api.removeReaction(messageId);
      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, reaction_counts: updated.reactionCounts || {} } : msg))
      );
    } catch {
      // Ignore reaction errors to keep chat flow smooth.
    }
  }

  async function onShareMovie(e) {
    e.preventDefault();

    const movieId = Number(shareMovieId);
    if (!selectedId || !movieId) {
      return;
    }

    const sent = await api.sendMessage(selectedId, `🎬 ${shareMovieTitle || `Movie #${movieId}`}`, {
      type: "movie",
      movieId,
      movieTitle: shareMovieTitle || null,
      moviePoster: shareMoviePoster || null
    });

    setMessages((prev) => {
      if (prev.some((m) => m.id === sent.id)) return prev;
      return [...prev, sent];
    });

    setShareMovieId("");
    setShareMovieTitle("");
    setShareMoviePoster("");
    setShareOpen(false);
  }

  return (
    <section className="grid gap-3 md:grid-cols-[200px_1fr]">
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

      <div className="card-surface flex h-[460px] flex-col rounded-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          {selectedFriend ? (
            <div className="flex items-center gap-2">
              <Avatar username={selectedFriend.username} photo={selectedFriend.profile_photo} size="h-7 w-7 text-[10px]" />
              <span className="text-sm text-gold">{selectedFriend.username}</span>
              <span className={`text-[10px] ${onlineIds.has(selectedId) ? "text-green-400" : "text-mist/45"}`}>
                {onlineIds.has(selectedId) ? "● online" : "○ offline"}
              </span>
            </div>
          ) : (
            <span className="text-sm text-mist/50">Select a friend</span>
          )}

          <button
            type="button"
            onClick={() => setShareOpen((prev) => !prev)}
            className="rounded-lg border border-white/20 px-3 py-1 text-xs text-mist/80 hover:bg-white/5"
          >
            Share movie
          </button>
        </div>

        {shareOpen && (
          <form onSubmit={onShareMovie} className="grid gap-2 border-b border-white/10 bg-white/5 p-3 md:grid-cols-4">
            <input
              value={shareMovieId}
              onChange={(e) => setShareMovieId(e.target.value)}
              placeholder="Movie ID"
              className="rounded-lg border border-white/20 bg-[#102032] px-3 py-2 text-xs outline-none focus:border-ember"
            />
            <input
              value={shareMovieTitle}
              onChange={(e) => setShareMovieTitle(e.target.value)}
              placeholder="Title (optional)"
              className="rounded-lg border border-white/20 bg-[#102032] px-3 py-2 text-xs outline-none focus:border-ember"
            />
            <input
              value={shareMoviePoster}
              onChange={(e) => setShareMoviePoster(e.target.value)}
              placeholder="Poster URL (optional)"
              className="rounded-lg border border-white/20 bg-[#102032] px-3 py-2 text-xs outline-none focus:border-ember"
            />
            <button type="submit" className="rounded-lg bg-ember px-3 py-2 text-xs text-white">
              Send
            </button>
          </form>
        )}

        <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-3">
          {nextCursor && (
            <button
              type="button"
              onClick={onLoadOlder}
              disabled={loadingOlder}
              className="mx-auto mb-2 rounded-lg border border-white/20 px-3 py-1 text-xs text-mist/70 hover:bg-white/5 disabled:opacity-60"
            >
              {loadingOlder ? "Loading..." : "Load older messages"}
            </button>
          )}

          {messages.map((msg) => {
            const isMine = msg.sender_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
                {!isMine && selectedFriend && (
                  <Avatar username={selectedFriend.username} photo={selectedFriend.profile_photo} size="h-6 w-6 text-[9px]" />
                )}

                <div className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${isMine ? "bg-ember text-white" : "bg-white/10 text-mist"}`}>
                  {msg.message_type === "movie" && msg.movie_id ? (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-gold/90">Movie shared</p>
                      {msg.movie_poster ? (
                        <img src={msg.movie_poster} alt={msg.movie_title || "Shared movie"} className="h-36 w-24 rounded-lg object-cover" />
                      ) : null}
                      <Link href={`/movie/${msg.movie_id}`} className="block text-sm font-semibold text-gold hover:underline">
                        🎬 {msg.movie_title || `Movie #${msg.movie_id}`}
                      </Link>
                    </div>
                  ) : (
                    <p>{msg.message}</p>
                  )}

                  <div className={`mt-1 flex items-center justify-between gap-2 text-[10px] ${isMine ? "text-white/60" : "text-mist/45"}`}>
                    <span>{formatTime(msg.created_at)}</span>
                    {isMine && <span>{msg.seen ? "✔✔ Seen" : "✔ Sent"}</span>}
                  </div>

                  <div className="mt-2 flex items-center gap-1">
                    {QUICK_REACTIONS.map((reaction) => (
                      <button
                        key={`${msg.id}-${reaction}`}
                        type="button"
                        onClick={() => onReact(msg.id, reaction)}
                        className="rounded-md border border-white/20 px-1.5 py-0.5 text-xs hover:bg-white/10"
                      >
                        {reaction}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => onRemoveReaction(msg.id)}
                      className="rounded-md border border-white/20 px-1.5 py-0.5 text-[10px] text-mist/60 hover:bg-white/10"
                    >
                      clear
                    </button>
                  </div>

                  {msg.reaction_counts && Object.keys(msg.reaction_counts).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 text-xs">
                      {Object.entries(msg.reaction_counts).map(([reaction, count]) => (
                        <span key={`${msg.id}-${reaction}`} className="rounded-full bg-white/10 px-2 py-0.5 text-mist/80">
                          {reaction} {count}
                        </span>
                      ))}
                    </div>
                  )}
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
              {selectedFriend.username} is typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

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
