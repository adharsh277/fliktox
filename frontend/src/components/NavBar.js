"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getCurrentUser } from "../lib/api";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/friends", label: "Friends" },
    { href: "/discover", label: "Discover" },
    { href: "/watchlist", label: "Watchlist" },
    { href: "/lists", label: "Lists" },
    { href: "/stats", label: "Stats" }
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07131f]/70 backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="font-display text-3xl tracking-wide text-gold">
          FLIKTOX
        </Link>
        <nav className="flex items-center gap-4 text-sm md:gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "text-gold" : "text-mist/80 hover:text-mist"}
            >
              {link.label}
            </Link>
          ))}

          {user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-white/10 px-2 py-1 hover:bg-white/5"
              >
                {user.profile_photo ? (
                  <img src={user.profile_photo} alt={user.username} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ember/30 text-xs font-bold text-gold">
                    {user.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <span className="hidden text-sm text-mist md:inline">{user.username}</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3 w-3 text-mist/50">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full z-30 mt-2 w-56 rounded-xl border border-white/10 bg-[#0d1b2a] p-2 shadow-xl">
                  <div className="border-b border-white/10 px-3 py-2">
                    <p className="text-sm font-semibold text-mist">@{user.username}</p>
                    <p className="text-xs text-mist/50">{user.email}</p>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    <Link
                      href={`/profile/${String(user.username || "").trim()}`}
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-mist hover:bg-white/5"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-mist hover:bg-white/5"
                    >
                      Settings
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        clearSession();
                        router.push("/login");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" className="rounded-full bg-ember px-3 py-1 text-white">
              Login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
