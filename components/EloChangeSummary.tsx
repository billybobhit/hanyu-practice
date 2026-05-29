import type { RankEvent } from "@/lib/types";
import RankBadge from "@/components/RankBadge";

interface EloChangeSummaryProps {
  event?: RankEvent;
}

export default function EloChangeSummary({ event }: EloChangeSummaryProps) {
  if (!event) return null;

  const positive = event.eloChange >= 0;
  const promoted = event.rankBefore !== event.rankAfter;
  const hasScaledGlobal =
    typeof event.sessionEloGain === "number" &&
    typeof event.globalContribution === "number" &&
    event.sessionEloGain !== event.globalContribution;
  const localGain = event.sessionEloGain ?? event.eloChange;
  const globalGain = event.globalContribution ?? event.eloChange;

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
          {hasScaledGlobal ? (
            <div>
              <span className={localGain >= 0 ? "text-green-400" : "text-vermillion-400"}>
                {localGain >= 0 ? "+" : ""}
                {localGain}
              </span>
              <span className="text-base text-cream-500"> local · </span>
              <span className={globalGain >= 0 ? "text-green-400" : "text-vermillion-400"}>
                {globalGain >= 0 ? "+" : ""}
                {globalGain}
              </span>
              <span className="text-base text-cream-500"> global ELO</span>
            </div>
          ) : (
            <>
              {globalGain >= 0 ? "+" : ""}
              {globalGain} ELO
            </>
          )}
        </div>
      </div>
      {hasScaledGlobal && (
        <p className="mt-3 rounded-xl border border-ink-600 bg-ink-900 px-4 py-2 text-sm text-cream-400">
          Global contribution scaled to your {event.languageRank ?? "current"} rank
          in this language
        </p>
      )}
      {promoted && (
        <p className="mt-3 rounded-xl border border-gold-700 bg-gold-800/20 px-4 py-2 text-sm text-gold-300">
          Promoted from {event.rankBefore} to {event.rankAfter}
        </p>
      )}
    </div>
  );
}
