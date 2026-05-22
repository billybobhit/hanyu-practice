import type { RankEvent } from "@/lib/types";
import RankBadge from "@/components/RankBadge";

interface EloChangeSummaryProps {
  event?: RankEvent;
}

export default function EloChangeSummary({ event }: EloChangeSummaryProps) {
  if (!event) return null;

  const positive = event.eloChange >= 0;
  const promoted = event.rankBefore !== event.rankAfter;

  return (
    <div className="rounded-2xl border border-ink-600 bg-ink-800 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <RankBadge rank={event.rankAfter} elo={event.eloAfter} size="md" />
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
              Ranking Update
            </p>
            <p className="text-lg font-semibold text-cream-100">
              {event.rankAfter}
            </p>
            <p className="text-xs text-cream-600">
              {event.eloBefore.toLocaleString()} →{" "}
              {event.eloAfter.toLocaleString()} ELO
            </p>
          </div>
        </div>
        <div
          className={`text-right text-2xl font-bold ${
            positive ? "text-green-400" : "text-vermillion-400"
          }`}
        >
          {positive ? "+" : ""}
          {event.eloChange}
        </div>
      </div>
      {promoted && (
        <p className="mt-3 rounded-xl border border-gold-700 bg-gold-800/20 px-4 py-2 text-sm text-gold-300">
          Promoted from {event.rankBefore} to {event.rankAfter}
        </p>
      )}
    </div>
  );
}
