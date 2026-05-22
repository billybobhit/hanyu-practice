"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getUserProgress } from "@/lib/storage";
import { eloToRank } from "@/lib/elo";
import { DEV_MODE_KEY, DEV_MODE_EVENT } from "@/lib/dev";

interface LanguageElo {
  language_code: string;
  elo: number;
}

export default function DevOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [langElos, setLangElos] = useState<LanguageElo[]>([]);

  const localElo = typeof window !== "undefined" ? getUserProgress().currentElo : 0;
  const displayedRank = eloToRank(localElo);

  const activeLanguage = pathname.startsWith("/zh-tw")
    ? "zh-tw"
    : pathname.startsWith("/zh-cn")
      ? "zh-cn"
      : "—";

  useEffect(() => {
    const check = () => {
      setVisible(localStorage.getItem(DEV_MODE_KEY) === "true");
    };
    check();
    window.addEventListener(DEV_MODE_EVENT, check);
    return () => window.removeEventListener(DEV_MODE_EVENT, check);
  }, []);

  useEffect(() => {
    if (!visible) return;
    async function fetchLangElos() {
      const supabase = createClient();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_language_elo")
        .select("language_code, elo")
        .eq("user_id", user.id);
      if (data) setLangElos(data);
    }
    void fetchLangElos();
  }, [visible, pathname]);

  if (!visible) return null;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 left-4 z-[500] rounded-lg border border-gold-700 bg-ink-900 px-2 py-1 text-xs text-gold-400 shadow-xl cursor-pointer"
        aria-label="Open developer overlay"
      >
        ⚡
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[500] max-h-[40vh] w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gold-700 bg-ink-900/95 p-3 text-xs shadow-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gold-400 font-bold tracking-wider">⚡ DEV</span>
        <button
          onClick={() => setMinimized(true)}
          className="rounded-md px-2 py-1 text-cream-500 hover:bg-ink-700 hover:text-cream-200 cursor-pointer"
          aria-label="Minimize developer overlay"
        >
          ✕
        </button>
      </div>
      <div className="max-h-[calc(40vh-3rem)] space-y-1 overflow-y-auto pr-1 text-cream-400 font-mono">
        <div className="flex justify-between">
          <span className="text-cream-600">Global ELO</span>
          <span className="text-gold-300">{localElo.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-600">Rank</span>
          <span className="text-cream-200">{displayedRank}</span>
        </div>
        {langElos.map((r) => (
          <div key={r.language_code} className="flex justify-between">
            <span className="text-cream-600">{r.language_code}</span>
            <span className="text-cream-300">{r.elo.toLocaleString()} · {eloToRank(r.elo)}</span>
          </div>
        ))}
        <div className="flex justify-between">
          <span className="text-cream-600">Active Lang</span>
          <span className="text-cream-300">{activeLanguage}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-600">is_dev</span>
          <span className="text-green-400">true</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-600">Path</span>
          <span className="text-cream-500 truncate max-w-[120px]">{pathname}</span>
        </div>
      </div>
    </div>
  );
}
