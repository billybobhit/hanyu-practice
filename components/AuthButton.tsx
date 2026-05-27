"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { syncSessionsWithCloud } from "@/lib/supabase/session-sync";
import LoginModal from "@/components/LoginModal";
import RankBadge from "@/components/RankBadge";
import { getUserProgress, setStorageUserId } from "@/lib/storage";
import { RANK_UPDATED_EVENT, type RankUpdatedDetail } from "@/lib/rank-events";
import { getBestAccountElo } from "@/lib/supabase/client-rank";
import SimulateRankModal from "@/components/dev/SimulateRankModal";
import RawEloModal from "@/components/dev/RawEloModal";
import SetEloModal from "@/components/dev/SetEloModal";
import {
  DEV_MODE_KEY,
  DEV_MODE_EVENT,
  setDevMode,
  getDevMode,
  isDev,
  setDevModeManuallyOff,
  getPersistedDevUser,
  setPersistedDevUser,
} from "@/lib/dev";
import { replaceSessions } from "@/lib/storage";

function getFirstName(user: User) {
  const metadataName =
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name;
  const fallback = user.email?.split("@")[0] ?? "User";
  return String(metadataName || fallback).split(" ")[0];
}

function isSupabaseAuthKey(key: string) {
  return key.startsWith("sb-") && key.includes("auth-token");
}

function clearSupabaseAuthStorage() {
  localStorage.removeItem("hanyu_user_id");

  [localStorage, sessionStorage].forEach((storage) => {
    Object.keys(storage)
      .filter(isSupabaseAuthKey)
      .forEach((key) => storage.removeItem(key));
  });

  document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name && isSupabaseAuthKey(name)))
    .forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    });
}

export default function AuthButton() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [supabase] = useState(() => createClient());
  const [elo, setElo] = useState(() =>
    typeof window === "undefined" ? 0 : getUserProgress().currentElo
  );
  const [isDevUser, setIsDevUser] = useState(() =>
    typeof window === "undefined" ? false : getPersistedDevUser()
  );
  const [devModeOn, setDevModeOn] = useState(() =>
    typeof window === "undefined" ? false : getDevMode()
  );
  const [showSimulate, setShowSimulate] = useState(false);
  const [showRawElo, setShowRawElo] = useState(false);
  const [showSetElo, setShowSetElo] = useState(false);

  const loadDevAccess = useCallback(async (activeUser: User) => {
    // Allowlisted emails are granted synchronously — no async needed
    if (isDev(activeUser.email)) {
      setIsDevUser(true);
      setPersistedDevUser(true);
      setDevMode(true);
      setDevModeOn(true);
      return;
    }

    if (!supabase) return;
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("is_dev")
      .eq("user_id", activeUser.id)
      .maybeSingle();

    const allowed = !!profile?.is_dev;
    setIsDevUser(allowed);
    setPersistedDevUser(allowed);

    if (allowed) {
      setDevMode(true);
      setDevModeOn(true);
    } else {
      setDevMode(false);
      setDevModeManuallyOff(false);
      setDevModeOn(false);
    }
  }, [supabase]);

  const refreshElo = useCallback(async () => {
    if (!supabase) return;
    const accountElo = await getBestAccountElo(supabase);
    if (accountElo !== null) setElo(accountElo);
  }, [supabase]);

  const handleSignOut = async () => {
    setShowMenu(false);
    setUser(null);
    setIsDevUser(false);
    setPersistedDevUser(false);
    setStorageUserId("guest");
    setElo(getUserProgress().currentElo);

    if (supabase) {
      void Promise.race([
        supabase.auth.signOut({ scope: "global" }),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]).finally(() => {
        clearSupabaseAuthStorage();
        window.location.replace("/");
      });
      return;
    }

    clearSupabaseAuthStorage();
    window.location.replace("/");
  };

  useEffect(() => {
    if (!supabase) {
      setAuthResolved(true);
      return;
    }

    const syncDevMode = () => setDevModeOn(localStorage.getItem(DEV_MODE_KEY) === "true");
    const syncRank = (event: Event) => {
      const detail = (event as CustomEvent<RankUpdatedDetail>).detail;
      if (typeof detail?.elo === "number") {
        setElo(detail.elo);
        return;
      }
      void refreshElo();
    };
    window.addEventListener(DEV_MODE_EVENT, syncDevMode);
    window.addEventListener(RANK_UPDATED_EVENT, syncRank);

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        const sessionUser = data.session?.user ?? null;
        console.log("[auth-button] initial-session", {
          hasUser: Boolean(sessionUser),
          userId: sessionUser?.id ?? null,
        });
        setUser(sessionUser);
        setAuthResolved(true);
        if (sessionUser) {
          setStorageUserId(sessionUser.id);
          void syncSessionsWithCloud(supabase);
          await loadDevAccess(sessionUser);
          await refreshElo();
        } else {
          setStorageUserId("guest");
          setElo(getUserProgress().currentElo);
          setIsDevUser(false);
          setPersistedDevUser(false);
        }
      })
      .catch((error) => {
        console.log("[auth-button] initial-session-error", error);
        setUser(null);
        setAuthResolved(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (_event === "INITIAL_SESSION") return;

      console.log("[auth-button] auth-event", {
        event: _event,
        hasUser: Boolean(session?.user),
        userId: session?.user?.id ?? null,
      });
      setAuthResolved(true);
      setUser(session?.user ?? null);
      setShowLogin(false);
      setShowMenu(false);
      if (session?.user) {
        setStorageUserId(session.user.id);
        void syncSessionsWithCloud(supabase);
        await loadDevAccess(session.user);
        await refreshElo();
        if (_event === "SIGNED_IN") {
          const next = sessionStorage.getItem("auth_next");
          if (next) {
            sessionStorage.removeItem("auth_next");
            router.push(next);
          }
        }
      } else {
        if (_event === "SIGNED_OUT") {
          setStorageUserId("guest");
          setIsDevUser(false);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(DEV_MODE_EVENT, syncDevMode);
      window.removeEventListener(RANK_UPDATED_EVENT, syncRank);
    };
  }, [loadDevAccess, refreshElo, router, supabase]);

  if (!authResolved) {
    return (
      <div className="h-10 w-24 animate-pulse rounded-full bg-ink-800" />
    );
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setShowLogin(true)}
          className="cursor-pointer rounded-full bg-vermillion-600 px-4 py-2 text-sm font-medium text-cream-100 transition-colors hover:bg-vermillion-500"
        >
          Login
        </button>
        {showLogin && createPortal(<LoginModal onClose={() => setShowLogin(false)} />, document.body)}
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
          <div className="absolute right-0 top-full z-[80] mt-2 w-56 overflow-hidden rounded-xl border border-ink-500 bg-ink-800 shadow-xl">
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
              type="button"
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
                  type="button"
                  onClick={() => { setShowMenu(false); setShowSimulate(true); }}
                  className="block w-full cursor-pointer px-4 py-3 text-left text-sm text-cream-400 transition-colors hover:bg-ink-700 hover:text-cream-200"
                >
                  Simulate Rank
                </button>
                <button
                  type="button"
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
                  type="button"
                  onClick={async () => {
                    setShowMenu(false);
                    await fetch("/api/dev/reset-rank", { method: "POST" });
                    replaceSessions([]);
                    window.dispatchEvent(new CustomEvent(RANK_UPDATED_EVENT, { detail: { elo: 0 } }));
                    window.location.reload();
                  }}
                  className="block w-full cursor-pointer px-4 py-3 text-left text-sm text-cream-400 transition-colors hover:bg-ink-700 hover:text-cream-200"
                >
                  Reset Rank (Full)
                </button>
                <button
                  type="button"
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
                  type="button"
                  onClick={() => {
                    const newState = !devModeOn;
                    setDevModeOn(newState);
                    setDevMode(newState);
                    setDevModeManuallyOff(!newState);
                  }}
                  className="block w-full cursor-pointer px-4 py-3 text-left text-sm text-cream-400 transition-colors hover:bg-ink-700 hover:text-cream-200"
                >
                  {devModeOn ? "Dev Mode: ON ✓" : "Dev Mode: OFF"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    replaceSessions([]);
                    window.location.reload();
                  }}
                  className="block w-full cursor-pointer px-4 py-3 text-left text-sm text-cream-400 transition-colors hover:bg-ink-700 hover:text-cream-200"
                >
                  Clear Local Sessions
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); setShowSetElo(true); }}
                  className="block w-full cursor-pointer px-4 py-3 text-left text-sm text-cream-400 transition-colors hover:bg-ink-700 hover:text-cream-200"
                >
                  Set Exact ELO
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {showSimulate && createPortal(<SimulateRankModal onClose={() => setShowSimulate(false)} />, document.body)}
      {showRawElo && createPortal(<RawEloModal onClose={() => setShowRawElo(false)} />, document.body)}
      {showSetElo && createPortal(<SetEloModal onClose={() => setShowSetElo(false)} />, document.body)}
    </>
  );
}
