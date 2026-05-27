"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import LoginModal from "@/components/LoginModal";
import { getUserProgressForLanguage } from "@/lib/storage";

interface PlacementBannerProps {
  languageCode: "zh-tw" | "zh-cn";
}

export default function PlacementBanner({ languageCode }: PlacementBannerProps) {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Auth state: fires INITIAL_SESSION immediately on subscribe (no network call)
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setIsGuest(true);
      setShow(true);
      return;
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsGuest(false);
        setShow(getUserProgressForLanguage(languageCode).currentElo < 250);
      } else {
        setIsGuest(true);
        setShow(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [languageCode]);

  // Re-evaluate ELO on navigation (signed-in users who just completed a session)
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setShow(getUserProgressForLanguage(languageCode).currentElo < 250);
      }
    });
  }, [pathname, languageCode]);

  if (!show) return null;
  if (!isGuest && pathname === `/${languageCode}/placement`) return null;

  if (isGuest) {
    return (
      <>
        <div className="fixed bottom-6 right-6 z-40 animate-fade-up">
          <div className="rounded-2xl border border-ink-500/60 bg-ink-800 shadow-lg px-5 py-4 flex items-center gap-4 max-w-xs">
            <div className="flex-1 min-w-0">
              <p className="text-cream-500 text-xs uppercase tracking-[0.18em] mb-0.5">Rank</p>
              <p className="text-cream-200 text-sm font-medium leading-snug">Sign in to unlock your rank</p>
            </div>
            <button
              onClick={() => setShowLogin(true)}
              className="shrink-0 rounded-full bg-vermillion-600 hover:bg-vermillion-500 text-cream-100 text-xs font-bold px-4 py-2 transition-colors cursor-pointer"
            >
              Sign In →
            </button>
          </div>
        </div>
        {showLogin && createPortal(<LoginModal onClose={() => setShowLogin(false)} />, document.body)}
      </>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-fade-up">
      <div className="rounded-2xl border border-gold-700/50 bg-ink-800 shadow-[0_0_24px_rgba(238,192,80,0.15)] px-5 py-4 flex items-center gap-4 max-w-xs">
        <div className="flex-1 min-w-0">
          <p className="text-gold-400 text-xs uppercase tracking-[0.18em] mb-0.5">Placement</p>
          <p className="text-cream-200 text-sm font-medium leading-snug">Find your starting rank</p>
        </div>
        <Link
          href={`/${languageCode}/placement`}
          className="shrink-0 rounded-full bg-gold-600 hover:bg-gold-500 text-ink-900 text-xs font-bold px-4 py-2 transition-colors"
        >
          Take Test →
        </Link>
      </div>
    </div>
  );
}
