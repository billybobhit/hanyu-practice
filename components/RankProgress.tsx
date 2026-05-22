import { getRankProgress } from "@/lib/ranks";
import RankBadge from "@/components/RankBadge";

interface RankProgressProps {
  elo: number;
  compact?: boolean;
}

export default function RankProgress({ elo, compact = false }: RankProgressProps) {
  const progress = getRankProgress(elo);

  return (
    <div className="rounded-2xl border border-ink-600 bg-ink-800 p-5">
      <div className="flex items-center gap-4">
        <RankBadge rank={progress.currentRank.name} elo={progress.currentElo} size={compact ? "md" : "lg"} />
        <div className="min-w-0 flex-1">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gold-500">
                Current Rank
              </p>
              <h2
                className="text-2xl font-semibold text-cream-100"
                style={{ fontFamily: "'Cormorant Garamond', serif" }}
              >
                {progress.currentRank.name}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gold-400">
                {progress.currentElo.toLocaleString()}
              </p>
              <p className="text-xs text-cream-600">ELO</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs text-cream-500">
              {progress.isMaxRank ? (
                <span>Max rank reached</span>
              ) : (
                <>
                  <span>
                    {progress.eloIntoRank.toLocaleString()} /{" "}
                    {progress.eloForNextRank.toLocaleString()} to{" "}
                    {progress.nextRank?.name}
                  </span>
                  <span>{Math.round(progress.percentToNextRank)}%</span>
                </>
              )}
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-ink-600">
              <div
                className="h-full rounded-full bg-gradient-to-r from-vermillion-600 via-gold-500 to-gold-300 transition-all duration-700"
                style={{ width: `${progress.percentToNextRank}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
