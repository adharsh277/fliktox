"use client";

import { useRouter } from "next/navigation";

export default function BackButton({ fallbackHref = "/dashboard", label = "Go Back" }) {
  const router = useRouter();

  function onGoBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={onGoBack}
      className="rounded-lg border border-white/20 px-3 py-1.5 text-xs text-mist/80 hover:bg-white/5"
    >
      {`<- ${label}`}
    </button>
  );
}
