"use client";

import { useMemo, useState } from "react";

function buildUrl(path) {
  if (typeof window === "undefined") {
    return "";
  }

  if (!path) {
    return window.location.href;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${normalizedPath}`;
}

export default function ShareMenu({
  title,
  text,
  path,
  disabled = false,
  disabledMessage = "This item cannot be shared right now."
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");

  const shareUrl = useMemo(() => buildUrl(path), [path]);

  async function copyLink() {
    if (!shareUrl) {
      setStatus("Unable to build share link.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus("Link copied.");
      setOpen(false);
    } catch {
      setStatus("Could not copy link.");
    }
  }

  function openSocial(base) {
    if (!shareUrl) {
      setStatus("Unable to build share link.");
      return;
    }

    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(text || title || "Check this out on Fliktox");
    const url = base
      .replace("{url}", encodedUrl)
      .replace("{text}", encodedText)
      .replace("{title}", encodeURIComponent(title || "Fliktox"));

    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  async function onShareClick() {
    if (disabled) {
      setStatus(disabledMessage);
      return;
    }

    if (!shareUrl) {
      setStatus("Unable to build share link.");
      return;
    }

    try {
      if (navigator.share) {
        await navigator.share({
          title: title || "Fliktox",
          text: text || "Check this out on Fliktox",
          url: shareUrl
        });
        setStatus("Shared.");
        return;
      }
    } catch {
      // Continue to menu fallback when native share is cancelled or unavailable.
    }

    setOpen((prev) => !prev);
  }

  return (
    <div className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onClick={onShareClick}
        className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-1.5 text-xs text-mist/80 hover:bg-white/5"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
          <path d="M8 12h8" strokeLinecap="round" />
          <path d="M12 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="5" cy="12" r="2" />
          <circle cx="19" cy="6" r="2" />
          <circle cx="19" cy="18" r="2" />
          <path d="M6.8 10.9l10.2-3.8" strokeLinecap="round" />
          <path d="M6.8 13.1l10.2 3.8" strokeLinecap="round" />
        </svg>
        Share
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-white/10 bg-[#0d1b2a] p-2 shadow-xl">
          <button
            type="button"
            onClick={copyLink}
            className="block w-full rounded-lg px-3 py-2 text-left text-xs text-mist/80 hover:bg-white/5"
          >
            Copy Link
          </button>
          <button
            type="button"
            onClick={() => openSocial("https://twitter.com/intent/tweet?text={text}&url={url}")}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-xs text-mist/80 hover:bg-white/5"
          >
            Share to X
          </button>
          <button
            type="button"
            onClick={() => openSocial("https://www.facebook.com/sharer/sharer.php?u={url}")}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-xs text-mist/80 hover:bg-white/5"
          >
            Share to Facebook
          </button>
          <button
            type="button"
            onClick={() => openSocial("https://wa.me/?text={text}%20{url}")}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-xs text-mist/80 hover:bg-white/5"
          >
            Share to WhatsApp
          </button>
          <button
            type="button"
            onClick={() => openSocial("https://t.me/share/url?url={url}&text={text}")}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-xs text-mist/80 hover:bg-white/5"
          >
            Share to Telegram
          </button>
        </div>
      )}

      {status && <p className="mt-1 text-[11px] text-gold">{status}</p>}
    </div>
  );
}
