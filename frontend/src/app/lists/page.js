"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import { api, getCurrentUser } from "../../lib/api";

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.push("/login"); return; }
    api.myLists().then(setLists).catch(() => {});
  }, [router]);

  async function onCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await api.createList({ title: title.trim(), description });
    const updated = await api.myLists();
    setLists(updated);
    setTitle("");
    setDescription("");
    setShowCreate(false);
  }

  async function onDelete(listId) {
    await api.deleteList(listId);
    setLists((prev) => prev.filter((l) => l.id !== listId));
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-5xl tracking-wide text-gold">My Lists</h1>
          <button onClick={() => setShowCreate(!showCreate)} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black">
            {showCreate ? "Cancel" : "+ New List"}
          </button>
        </div>

        {showCreate && (
          <form onSubmit={onCreate} className="mt-4 card-surface rounded-xl p-4 space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="List title..."
              className="w-full rounded-lg border border-white/20 bg-[#102032] px-4 py-2 outline-none focus:border-gold" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)..."
              className="w-full rounded-lg border border-white/20 bg-[#102032] px-4 py-2 outline-none focus:border-gold" rows={2} />
            <button type="submit" className="rounded-lg bg-ember px-4 py-2 text-sm text-white">Create List</button>
          </form>
        )}

        <div className="mt-6 space-y-3">
          {lists.map((list) => (
            <div key={list.id} className="card-surface flex items-center justify-between rounded-xl p-4">
              <Link href={`/lists/${list.id}`} className="flex-1">
                <p className="font-semibold text-mist">{list.title}</p>
                <p className="text-xs text-mist/50">{list.movie_count} films · {list.is_public ? "Public" : "Private"}</p>
                {list.description && <p className="mt-1 text-sm text-mist/60">{list.description}</p>}
              </Link>
              <button onClick={() => onDelete(list.id)} className="ml-4 rounded-lg border border-red-500/30 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10">
                Delete
              </button>
            </div>
          ))}
          {!lists.length && !showCreate && (
            <p className="text-center text-sm text-mist/50">No lists yet. Create your first movie list!</p>
          )}
        </div>
      </section>
    </main>
  );
}
