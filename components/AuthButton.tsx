"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { syncSessionsWithCloud } from "@/lib/supabase/session-sync";
import LoginModal from "@/components/LoginModal";
import RankBadge from "@/components/RankBadge";
import { getUserProgress } from "@/lib/storage";

function getFirstName(user: User) {
  const metadataName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name;
  const fallback = user.email?.split("@")[0] ?? "User";
  return String(metadataName || fallback).split(" ")[0];
}

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [supabase] = useState(() => createClient());
  const [elo, setElo] = useState(0);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    setElo(getUserProgress().currentElo);

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      if (data.user) {
        void syncSessionsWithCloud(supabase);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setShowLogin(false);
      setShowMenu(false);
      if (session?.user) {
        void syncSessionsWithCloud(supabase);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowLogin(true)}
          className="cursor-pointer rounded-full bg-vermillion-600 px-4 py-2 text-sm font-medium text-cream-100 transition-colors hover:bg-vermillion-500"
        >
          Login
        </button>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </>
    );
  }

  const firstName = getFirstName(user);

  return (
    <div className="relative flex items-center gap-2">
      <RankBadge elo={elo} size="sm" />
      <button
        onClick={() => setShowMenu((value) => !value)}
        className="flex cursor-pointer items-center gap-2 rounded-full bg-ink-800 py-1 pl-1 pr-3 text-sm text-cream-200 transition-colors hover:bg-ink-700"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-vermillion-700 text-sm font-semibold text-cream-100">
          {firstName[0]?.toUpperCase()}
        </span>
        <span className="hidden sm:inline">{firstName}</span>
      </button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-ink-500 bg-ink-800 shadow-xl">
          <a
            href="/progress"
            className="block px-4 py-3 text-sm text-cream-300 transition-colors hover:bg-ink-700 hover:text-cream-100"
          >
            My Progress
          </a>
          <a
            href="/history"
            className="block px-4 py-3 text-sm text-cream-300 transition-colors hover:bg-ink-700 hover:text-cream-100"
          >
            Conversation History
          </a>
          <button
            onClick={() => supabase?.auth.signOut()}
            className="block w-full cursor-pointer px-4 py-3 text-left text-sm text-cream-300 transition-colors hover:bg-ink-700 hover:text-cream-100"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
