"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NavBar from "../../components/NavBar";
import { api, getCurrentUser } from "../../lib/api";

export default function ListsPage() {
  const router = useRouter();
  const [lists, setLists] = useState([]);
  const [publicLists, setPublicLists] = useState([]);
  const [publicPage, setPublicPage] = useState(1);
  const [publicHasMore, setPublicHasMore] = useState(false);
  const [publicQuery, setPublicQuery] = useState("");
  const [activeTab, setActiveTab] = useState("mine");
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.push("/login"); return; }
    Promise.all([api.myLists(), api.publicLists(1, 12)])
      .then(([mine, pub]) => {
        setLists(mine);
        setPublicLists(pub?.items || []);
        setPublicPage(1);
        setPublicHasMore(Boolean(pub?.pagination?.hasMore));
      })
      .catch(() => {});
  }, [router]);

  async function loadPublic(page = 1, append = false, q = publicQuery) {
    const response = await api.publicLists(page, 12, q);
    const items = response?.items || [];
    setPublicLists((prev) => (append ? [...prev, ...items] : items));
    setPublicPage(page);
    setPublicHasMore(Boolean(response?.pagination?.hasMore));
  }

  async function onCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await api.createList({ title: title.trim(), description, is_public: isPublic });
    const updated = await api.myLists();
    setLists(updated);
    setTitle("");
    setDescription("");
    setIsPublic(true);
    setShowCreate(false);
  }

  async function onDelete(listId) {
    await api.deleteList(listId);
    setLists((prev) => prev.filter((l) => l.id !== listId));
  }

  async function onPublicSearch(e) {
    e.preventDefault();
    await loadPublic(1, false, publicQuery.trim());
  }

  async function onLoadMorePublic() {
    if (!publicHasMore) {
      return;
    }

    await loadPublic(publicPage + 1, true, publicQuery.trim());
  }

  return (
    <main>
      <NavBar />
      <section className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-5xl tracking-wide text-gold">My Lists</h1>
          {activeTab === "mine" ? (
            <button onClick={() => setShowCreate(!showCreate)} className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black">
              {showCreate ? "Cancel" : "+ New List"}
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("mine")}
            className={`rounded-lg px-4 py-2 text-sm transition ${activeTab === "mine" ? "bg-gold text-black" : "border border-white/20 text-mist/75 hover:bg-white/5"}`}
          >
            My Lists
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("public")}
            className={`rounded-lg px-4 py-2 text-sm transition ${activeTab === "public" ? "bg-gold text-black" : "border border-white/20 text-mist/75 hover:bg-white/5"}`}
          >
            Public Lists
          </button>
        </div>

        {showCreate && activeTab === "mine" && (
          <form onSubmit={onCreate} className="mt-4 card-surface rounded-xl p-4 space-y-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="List title..."
              className="w-full rounded-lg border border-white/20 bg-[#102032] px-4 py-2 outline-none focus:border-gold" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)..."
              className="w-full rounded-lg border border-white/20 bg-[#102032] px-4 py-2 outline-none focus:border-gold" rows={2} />
            <label className="flex items-center gap-2 text-sm text-mist/75">
              <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
              Make this list public
            </label>
            <button type="submit" className="rounded-lg bg-ember px-4 py-2 text-sm text-white">Create List</button>
          </form>
        )}

        {activeTab === "mine" ? (
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
        ) : (
          <div className="mt-6">
            <form onSubmit={onPublicSearch} className="flex gap-2">
              <input
                value={publicQuery}
                onChange={(e) => setPublicQuery(e.target.value)}
                placeholder="Search public lists, descriptions, or usernames..."
                className="w-full rounded-lg border border-white/20 bg-[#102032] px-4 py-2 outline-none focus:border-gold"
              />
              <button type="submit" className="rounded-lg bg-ember px-4 py-2 text-sm text-white">Search</button>
            </form>

            <div className="mt-4 space-y-3">
              {publicLists.map((list) => (
                <Link key={list.id} href={`/lists/${list.id}`} className="card-surface block rounded-xl p-4 transition hover:border-gold/40">
                  <p className="font-semibold text-mist">{list.title}</p>
                  <p className="text-xs text-mist/50">by @{list.username} · {list.movie_count} films</p>
                  {list.description && <p className="mt-1 text-sm text-mist/60">{list.description}</p>}
                </Link>
              ))}

              {publicHasMore && (
                <button
                  type="button"
                  onClick={onLoadMorePublic}
                  className="w-full rounded-lg border border-white/20 px-4 py-2 text-sm text-mist/80 hover:bg-white/5"
                >
                  Load More
                </button>
              )}

              {!publicLists.length && (
                <p className="text-center text-sm text-mist/50">No public lists found.</p>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
