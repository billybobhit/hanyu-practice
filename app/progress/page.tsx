"use client";

import { useEffect, useState } from "react";
import RankBadge from "@/components/RankBadge";
import RankProgress from "@/components/RankProgress";
import { RANKS } from "@/lib/ranks";
import { getSessionSummaries, setStorageUserId } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { getBestAccountElo } from "@/lib/supabase/client-rank";
import { RANK_UPDATED_EVENT, type RankUpdatedDetail } from "@/lib/rank-events";
import type { SessionSummary } from "@/lib/types";

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [elo, setElo] = useState(0);
  const [summaries, setSummaries] = useState<SessionSummary[]>([]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const refresh = async (userId: string) => {
      console.log("[progress] fetch:start", { userId });

      try {
        setStorageUserId(userId);
        setSummaries(getSessionSummaries());
        const accountElo = await getBestAccountElo(supabase);
        if (cancelled) return;
        setElo(accountElo ?? 0);
        console.log("[progress] fetch:success", { accountElo });
      } catch (error) {
        console.log("[progress] fetch:failed-showing-empty", error);
        if (cancelled) return;
        setElo(0);
        setSummaries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const resolveInitialSession = async () => {
      setLoading(true);

      try {
        console.log("[progress] auth:session-check:start");
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        console.log("[progress] auth:session-check:complete", {
          hasUser: Boolean(session?.user),
          userId: session?.user?.id ?? null,
        });

        if (!session?.user) {
          setAuthed(false);
          setElo(0);
          setSummaries([]);
          setLoading(false);
          return;
        }

        setAuthed(true);
        await refresh(session.user.id);
      } catch (error) {
        console.log("[progress] auth:session-check:failed", error);
        if (cancelled) return;
        setAuthed(false);
        setElo(0);
        setSummaries([]);
        setLoading(false);
      }
    };

    const syncRank = (event: Event) => {
      const detail = (event as CustomEvent<RankUpdatedDetail>).detail;
      if (typeof detail?.elo === "number") setElo(detail.elo);
      setSummaries(getSessionSummaries());
    };

    void resolveInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (_event === "INITIAL_SESSION") return;

      console.log("[progress] auth:event", {
        event: _event,
        hasUser: Boolean(session?.user),
        userId: session?.user?.id ?? null,
      });

      if (!session?.user) {
        setAuthed(false);
        setElo(0);
        setSummaries([]);
        setLoading(false);
        return;
      }

      setAuthed(true);
      void refresh(session.user.id);
    });

    window.addEventListener(RANK_UPDATED_EVENT, syncRank);
    return () => {
      cancelled = true;
      subscription.unsubscribe();
      window.removeEventListener(RANK_UPDATED_EVENT, syncRank);
    };
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-900 px-6 pt-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-ink-500 border-t-gold-500" />
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink-900 px-6 pt-24 text-center">
        <div>
          <p className="text-lg font-medium text-cream-300">
            Sign in to view your rank
          </p>
          <p className="mt-2 text-sm text-cream-500">
            Your ELO and rank are saved to your account.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink-900 px-6 pt-24">
      <div className="mx-auto max-w-5xl space-y-8">
        <section className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.18em] text-gold-500">
            HanYu Ranking
          </p>
          <h1
            className="text-4xl font-semibold text-cream-100 md:text-5xl"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            My Progress
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-6 text-cream-500">
            Every graded conversation changes your ELO. Strong scores climb the
            ladder, weak scores can pull you back.
          </p>
        </section>

        <RankProgress elo={elo} />

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-ink-600 bg-ink-800 p-5">
            <h2 className="mb-4 text-sm font-medium text-cream-300">
              Recent ELO Changes
            </h2>
            {summaries.length === 0 ? (
              <p className="text-sm text-cream-500">
                Complete a graded session to start earning ELO.
              </p>
            ) : (
              <div className="space-y-3">
                {summaries.slice(0, 6).map((summary) => (
                  <div
                    key={summary.id}
                    className="flex items-center justify-between rounded-xl bg-ink-900 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-cream-200">
                        {summary.materialTitle}
                      </p>
                      <p className="text-xs text-cream-600">
                        {summary.overallGrade} · {summary.overallScore} pts
                      </p>
                    </div>
                    <div
                      className={`text-sm font-bold ${
                        (summary.eloChange ?? 0) >= 0
                          ? "text-green-400"
                          : "text-vermillion-400"
                      }`}
                    >
                      {(summary.eloChange ?? 0) >= 0 ? "+" : ""}
                      {summary.eloChange ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-ink-600 bg-ink-800 p-5">
            <h2 className="mb-4 text-sm font-medium text-cream-300">
              Rank Ladder
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {RANKS.map((rank) => (
                <div
                  key={rank.name}
                  className="flex items-center gap-3 rounded-xl bg-ink-900 px-3 py-3"
                >
                  <RankBadge rank={rank.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-cream-200">
                      {rank.name}
                    </p>
                    <p className="text-xs text-cream-600">
                      {rank.minElo.toLocaleString()} ELO
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
