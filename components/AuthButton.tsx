"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { syncSessionsWithCloud } from "@/lib/supabase/session-sync";
import LoginModal from "@/components/LoginModal";
import RankBadge from "@/components/RankBadge";
import { getUserProgress } from "@/lib/storage";
import SimulateRankModal from "@/components/dev/SimulateRankModal";
import RawEloModal from "@/components/dev/RawEloModal";
import {
  DEV_MODE_KEY,
  DEV_MODE_EVENT,
  setDevMode,
  getDevMode,
  isDev,
} from "@/lib/dev";

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
  const [isDevUser, setIsDevUser] = useState(false);
  const [devModeOn, setDevModeOn] = useState(false);
  const [showSimulate, setShowSimulate] = useState(false);
  const [showRawElo, setShowRawElo] = useState(false);

  const loadDevAccess = async (activeUser: User) => {
    const allowlisted = isDev(activeUser.email);

    const { data: profile } = await supabase!
      .from("user_profiles")
      .select("is_dev")
      .eq("user_id", activeUser.id)
      .maybeSingle();

    setIsDevUser(allowlisted || !!profile?.is_dev);
  };

  const handleSignOut = async () => {
    setShowMenu(false);
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setIsDevUser(false);
    setDevMode(false);
    window.location.href = "/";
  };

  useEffect(() => {
    if (!supabase) return;

    setElo(getUserProgress().currentElo);
    setDevModeOn(getDevMode());

    const syncDevMode = () => setDevModeOn(localStorage.getItem(DEV_MODE_KEY) === "true");
    window.addEventListener(DEV_MODE_EVENT, syncDevMode);

    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user ?? null);
      if (data.user) {
        void syncSessionsWithCloud(supabase);
        await loadDevAccess(data.user);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      setShowLogin(false);
      setShowMenu(false);
      if (session?.user) {
        void syncSessionsWithCloud(supabase);
        await loadDevAccess(session.user);
      } else {
        setIsDevUser(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(DEV_MODE_EVENT, syncDevMode);
    };
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
    <>
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
          {isDevUser && (
            <span className="hidden sm:inline text-gold-400 text-xs font-bold">⚡</span>
          )}
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-ink-500 bg-ink-800 shadow-xl">
            <a
              href="/progress"
              className="block px-4 py-3 text-sm text-cream-300 transition-colors hover:bg-ink-700 hover:text-cream-100"
            >
              My Rank
            </a>
            <a
              href="/history"
              className="block px-4 py-3 text-sm text-cream-300 transition-colors hover:bg-ink-700 hover:text-cream-100"
            >
              Conversation History
            </a>
            <button
              onClick={handleSignOut}
              className="block w-full cursor-pointer px-4 py-3 text-left text-sm text-cream-300 transition-colors hover:bg-ink-700 hover:text-cream-100"
            >
              Sign Out
            </button>

            {isDevUser && (
              <>
                <div className="border-t border-ink-600 px-4 py-2">
                  <p className="text-gold-500 text-xs font-bold tracking-widest uppercase">⚡ Developer Tools</p>
                </div>
                <button
                  onClick={() => { setShowMenu(false); setShowSimulate(true); }}
                  className="block w-full cursor-pointer px-4 py-3 text-left text-sm text-cream-400 transition-colors hover:bg-ink-700 hover:text-cream-200"
                >
                  Simulate Rank
                </button>
                <button
                  onClick={async () => {
                    setShowMenu(false);
                    if (!supabase) return;
                    await fetch("/api/dev/reset-placement", { method: "POST" });
                  }}
                  className="block w-full cursor-pointer px-4 py-3 text-left text-sm text-cream-400 transition-colors hover:bg-ink-700 hover:text-cream-200"
                >
                  Force Placement Reset
                </button>
                <button
                  onClick={() => { setShowMenu(false); setShowRawElo(true); }}
                  className="block w-full cursor-pointer px-4 py-3 text-left text-sm text-cream-400 transition-colors hover:bg-ink-700 hover:text-cream-200"
                >
                  View Raw ELO
                </button>
                <a
                  href="/dev/test-grade-reveal"
                  className="block px-4 py-3 text-sm text-cream-400 transition-colors hover:bg-ink-700 hover:text-cream-200"
                >
                  Test Grade Reveal
                </a>
                <button
                  onClick={() => {
                    setDevModeOn((prev) => {
                      setDevMode(!prev);
                      return !prev;
                    });
                  }}
                  className="block w-full cursor-pointer px-4 py-3 text-left text-sm text-cream-400 transition-colors hover:bg-ink-700 hover:text-cream-200"
                >
                  {devModeOn ? "Dev Mode: ON ✓" : "Dev Mode: OFF"}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showSimulate && <SimulateRankModal onClose={() => setShowSimulate(false)} />}
      {showRawElo && <RawEloModal onClose={() => setShowRawElo(false)} />}
    </>
  );
}
