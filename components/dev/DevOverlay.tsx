"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { eloToRank } from "@/lib/elo";
import { RANK_UPDATED_EVENT, type RankUpdatedDetail } from "@/lib/rank-events";
import { DEV_MODE_KEY, DEV_MODE_EVENT, isDev, setDevMode } from "@/lib/dev";
import { getSessions } from "@/lib/storage";

interface LanguageElo {
  language_code: string;
  elo: number;
  has_completed_placement: boolean;
}

async function currentUserCanUseDevOverlay() {
  const supabase = createClient();
  if (!supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;
  if (isDev(user.email)) return true;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("is_dev")
    .eq("user_id", user.id)
    .maybeSingle();

  return !!profile?.is_dev;
}

export default function DevOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [langElos, setLangElos] = useState<LanguageElo[]>([]);
  const [accountElo, setAccountElo] = useState<number | null>(null);

  const displayedElo = accountElo ?? 0;
  const displayedRank = eloToRank(displayedElo);

  const activeLanguage = pathname.startsWith("/zh-tw")
    ? "zh-tw"
    : pathname.startsWith("/zh-cn")
      ? "zh-cn"
      : pathname.startsWith("/fr")
        ? "fr"
        : pathname.startsWith("/es")
          ? "es"
          : "—";

  useEffect(() => {
    let cancelled = false;

    async function syncVisible() {
      const requested = localStorage.getItem(DEV_MODE_KEY) === "true";
      if (!requested) {
        setVisible(false);
        return;
      }

      const allowed = await currentUserCanUseDevOverlay();
      if (cancelled) return;

      setVisible(allowed);
      if (!allowed) setDevMode(false);
    }

    void syncVisible();
    window.addEventListener(DEV_MODE_EVENT, syncVisible);

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase?.auth.onAuthStateChange(() => {
      void syncVisible();
    }) ?? { data: { subscription: null } };

    return () => {
      cancelled = true;
      window.removeEventListener(DEV_MODE_EVENT, syncVisible);
      subscription?.unsubscribe();
    };
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
        .select("language_code, elo, has_completed_placement")
        .eq("user_id", user.id);
      const { data: profile } = await supabase
        .from("user_account_elo")
        .select("elo")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setLangElos(data);
        setAccountElo(typeof profile?.elo === "number" ? profile.elo : null);
      }
    }
    void fetchLangElos();
    const syncRank = (event: Event) => {
      const detail = (event as CustomEvent<RankUpdatedDetail>).detail;
      if (typeof detail?.elo === "number") setAccountElo(detail.elo);
      void fetchLangElos();
    };
    window.addEventListener(RANK_UPDATED_EVENT, syncRank);
    return () => window.removeEventListener(RANK_UPDATED_EVENT, syncRank);
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
          <span className="text-cream-600">Account ELO</span>
          <span className="text-gold-300">{displayedElo.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-cream-600">Rank</span>
          <span className="text-cream-200">{displayedRank}</span>
        </div>
        {langElos.map((r) => {
          const languageRank = eloToRank(r.elo);
          return (
            <div key={r.language_code} className="flex justify-between">
              <span className="text-cream-600">{r.language_code}</span>
              <span className="text-cream-300">
                local:{r.elo.toLocaleString()} · {languageRank}{" "}
                <span className={r.has_completed_placement ? "text-green-400" : "text-vermillion-400"}>
                  {r.has_completed_placement ? "✓" : "✗"}
                </span>
              </span>
            </div>
          );
        })}
        <div className="flex justify-between">
          <span className="text-cream-600">Sessions</span>
          <span className="text-cream-300">{getSessions().length}</span>
        </div>
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
