"use client";

import { useEffect, useState } from "react";
import RankBadge from "@/components/RankBadge";
import RankProgress from "@/components/RankProgress";
import { RANKS } from "@/lib/ranks";
import { getSessionSummaries, getUserProgress } from "@/lib/storage";
import { createClient } from "@/lib/supabase/client";
import { getBestAccountElo } from "@/lib/supabase/client-rank";
import { RANK_UPDATED_EVENT, type RankUpdatedDetail } from "@/lib/rank-events";
import type { SessionSummary } from "@/lib/types";

export default function ProgressPage() {
  const [elo, setElo] = useState(() =>
    typeof window === "undefined" ? 0 : getUserProgress().currentElo
  );
  const [summaries, setSummaries] = useState<SessionSummary[]>(() =>
    typeof window === "undefined" ? [] : getSessionSummaries()
  );

  useEffect(() => {
    const refresh = async () => {
      const supabase = createClient();
      if (!supabase) return;
      const accountElo = await getBestAccountElo(supabase);
      if (accountElo !== null) setElo(accountElo);
    };

    const syncRank = (event: Event) => {
      const detail = (event as CustomEvent<RankUpdatedDetail>).detail;
      if (typeof detail?.elo === "number") setElo(detail.elo);
      setSummaries(getSessionSummaries());
      void refresh();
    };

    void refresh();
    window.addEventListener(RANK_UPDATED_EVENT, syncRank);
    return () => window.removeEventListener(RANK_UPDATED_EVENT, syncRank);
  }, []);

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
