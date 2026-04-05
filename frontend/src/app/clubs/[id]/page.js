"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import NavBar from "../../../components/NavBar";
import { api, getCurrentUser } from "../../../lib/api";
import { getSocket } from "../../../lib/socket";

function formatTime(dateStr) {
  if (!dateStr) {
    return "";
  }

  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ClubDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const currentUser = useMemo(() => getCurrentUser(), []);
  const [club, setClub] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [memberQuery, setMemberQuery] = useState("");
  const [memberResults, setMemberResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [memberActionLoading, setMemberActionLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [typingUser, setTypingUser] = useState("");
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const chatEndRef = useRef(null);
  const clubId = Number(params?.id);
  const isOwner = Boolean(club && currentUser && club.owner_id === currentUser.id);

  async function loadClub() {
    const data = await api.club(clubId);
    setClub(data);
  }

  async function loadChat() {
    if (!clubId) {
      return;
    }

    setChatLoading(true);
    setChatError("");
    try {
      const rows = await api.clubMessages(clubId, 60);
      setChatMessages(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setChatError(err?.message || "Failed to load club chat");
      setChatMessages([]);
    } finally {
      setChatLoading(false);
    }
  }

  useEffect(() => {
    if (!currentUser) {
      router.push("/login");
      return;
    }

    if (!clubId) {
      setError("Invalid club id");
      setLoading(false);
      return;
    }

    loadClub()
      .catch((err) => setError(err?.message || "Failed to load club"))
      .finally(() => setLoading(false));
  }, [router, clubId, currentUser]);

  useEffect(() => {
    if (!club?.is_member) {
      setChatMessages([]);
      setChatError("");
      return;
    }

    loadChat().catch(() => {});
  }, [club?.id, club?.is_member]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages.length, typingUser]);

  async function onJoin() {
    try {
      await api.joinClub(clubId);
      await loadClub();
    } catch (err) {
      setError(err?.message || "Failed to join club");
    }
  }

  async function onSearchUsers(event) {
    event.preventDefault();
    setError("");

    if (!memberQuery.trim()) {
      setMemberResults([]);
      return;
    }

    setMemberSearchLoading(true);
    try {
      const rows = await api.searchUsers(memberQuery.trim());
      const memberIds = new Set((club?.members || []).map((member) => member.user_id));
      setMemberResults((rows || []).filter((user) => !memberIds.has(user.id)));
    } catch (err) {
      setError(err?.message || "Failed to search users");
      setMemberResults([]);
    } finally {
      setMemberSearchLoading(false);
    }
  }

  async function onAddMember(userId) {
    setError("");
    setMemberActionLoading(true);
    try {
      await api.addClubMember(clubId, userId);
      await loadClub();
      setMemberResults((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      setError(err?.message || "Failed to add member");
    } finally {
      setMemberActionLoading(false);
    }
  }

  async function onRemoveMember(userId) {
    setError("");
    setMemberActionLoading(true);
    try {
      await api.removeClubMember(clubId, userId);
      await loadClub();
    } catch (err) {
      setError(err?.message || "Failed to remove member");
    } finally {
      setMemberActionLoading(false);
    }
  }

  useEffect(() => {
    if (!club?.is_member) {
      return undefined;
    }

    const socket = getSocket();
    if (!socket) {
      return undefined;
    }

    socketRef.current = socket;
    socket.emit("club:join", { clubId });

    function onClubMessage(message) {
      if (Number(message.club_id) !== clubId) {
        return;
      }

      setChatMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    }

    function onClubTyping(event) {
      if (Number(event?.clubId) !== clubId) {
        return;
      }

      if (Number(event?.userId) === currentUser?.id) {
        return;
      }

      setTypingUser(event?.username || "Someone");
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(""), 1800);
    }

    socket.on("club:message", onClubMessage);
    socket.on("club:typing", onClubTyping);

    return () => {
      socket.emit("club:leave", { clubId });
      socket.off("club:message", onClubMessage);
      socket.off("club:typing", onClubTyping);
      socketRef.current = null;
    };
  }, [club?.is_member, clubId, currentUser?.id]);

  async function onSendChat(event) {
    event.preventDefault();

    const message = chatInput.trim();
    if (!message) {
      return;
    }

    setChatError("");
    try {
      const sent = await api.sendClubMessage(clubId, message);
      setChatMessages((prev) => {
        if (prev.some((item) => item.id === sent.id)) {
          return prev;
        }
        return [...prev, sent];
      });
      setChatInput("");
      setTypingUser("");
    } catch (err) {
      setChatError(err?.message || "Failed to send message");
    }
  }

  function emitTyping() {
    if (socketRef.current && club?.is_member) {
      socketRef.current.emit("club:typing", { clubId });
    }
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
        {error ? (
          <div className="rounded-xl border border-red-400/40 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-mist/60">Loading club...</p>
        ) : club ? (
          <>
            <h1 className="font-display text-5xl tracking-wide text-gold">{club.name}</h1>
            <p className="mt-1 text-sm text-mist/75">Owner: @{club.owner_username}</p>
            {club.description ? <p className="mt-4 text-mist/85">{club.description}</p> : null}

            <div className="mt-5">
              {club.is_member ? (
                <p className="inline-flex rounded-full border border-emerald-400/50 px-3 py-1 text-xs text-emerald-300">
                  You are a member ({club.my_role})
                </p>
              ) : (
                <button
                  type="button"
                  onClick={onJoin}
                  className="rounded-lg bg-ember px-4 py-2 text-sm text-white"
                >
                  Join Club
                </button>
              )}
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-mist">Members</h2>

              {isOwner ? (
                <form onSubmit={onSearchUsers} className="mt-3 flex gap-2">
                  <input
                    value={memberQuery}
                    onChange={(event) => setMemberQuery(event.target.value)}
                    placeholder="Search users to add"
                    className="w-full rounded-lg border border-white/20 bg-[#102032] px-3 py-2 text-sm outline-none focus:border-ember"
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-ember px-4 py-2 text-xs text-white"
                    disabled={memberSearchLoading || memberActionLoading}
                  >
                    {memberSearchLoading ? "Searching..." : "Search"}
                  </button>
                </form>
              ) : null}

              {isOwner && memberResults.length > 0 ? (
                <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                  {memberResults.slice(0, 6).map((user) => (
                    <div key={user.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-mist">@{user.username}</span>
                      <button
                        type="button"
                        onClick={() => onAddMember(user.id)}
                        className="rounded-lg border border-emerald-400/50 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-400/10"
                        disabled={memberActionLoading}
                      >
                        Add to Club
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 space-y-2">
                {club.members?.map((member) => (
                  <div key={member.user_id} className="card-surface flex items-center justify-between rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      {member.profile_photo ? (
                        <img src={member.profile_photo} alt={member.username} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ember/30 text-xs font-bold text-gold">
                          {member.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-mist">@{member.username}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-mist/60">{member.role}</span>
                      {isOwner && member.user_id !== club.owner_id ? (
                        <button
                          type="button"
                          onClick={() => onRemoveMember(member.user_id)}
                          className="rounded-lg border border-red-400/40 px-2 py-1 text-[11px] text-red-300 hover:bg-red-400/10"
                          disabled={memberActionLoading}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {club.is_member ? (
              <div className="mt-8">
                <h2 className="text-xl font-semibold text-mist">Group Chat</h2>
                <p className="mt-1 text-xs text-mist/60">Real-time chat for all club members.</p>

                <div className="mt-3 card-surface flex h-[420px] flex-col rounded-xl">
                  <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
                    {chatLoading ? (
                      <p className="text-sm text-mist/60">Loading chat...</p>
                    ) : chatMessages.length ? (
                      chatMessages.map((msg) => {
                        const isMine = msg.sender_id === currentUser?.id;
                        return (
                          <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${isMine ? "bg-ember text-white" : "bg-white/10 text-mist"}`}>
                              <p className="text-xs opacity-80">@{msg.username}</p>
                              <p className="mt-1 text-sm">{msg.message}</p>
                              <p className="mt-1 text-[10px] opacity-70">{formatTime(msg.created_at)}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-mist/60">No messages yet. Start the conversation.</p>
                    )}

                    {typingUser ? <p className="text-xs text-mist/50">{typingUser} is typing...</p> : null}
                    <div ref={chatEndRef} />
                  </div>

                  {chatError ? (
                    <p className="border-t border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">{chatError}</p>
                  ) : null}

                  <form onSubmit={onSendChat} className="flex gap-2 border-t border-white/10 p-3">
                    <input
                      value={chatInput}
                      onChange={(event) => {
                        setChatInput(event.target.value);
                        emitTyping();
                      }}
                      placeholder="Send a message to the club"
                      className="w-full rounded-lg border border-white/20 bg-[#102032] px-3 py-2 text-sm outline-none focus:border-ember"
                    />
                    <button type="submit" className="rounded-lg bg-ember px-4 py-2 text-sm text-white">
                      Send
                    </button>
                  </form>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-mist/60">Club not found.</p>
        )}
      </section>
    </main>
  );
}