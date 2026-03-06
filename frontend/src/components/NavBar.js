"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getCurrentUser } from "../lib/api";

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = typeof window !== "undefined" ? getCurrentUser() : null;

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/discover", label: "Discover" },
    { href: user ? `/user/${user.username}` : "/login", label: "Profile" }
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
            <button
              type="button"
              onClick={() => {
                clearSession();
                router.push("/login");
              }}
              className="rounded-full border border-ember/50 px-3 py-1 text-ember hover:bg-ember/15"
            >
              Logout
            </button>
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
