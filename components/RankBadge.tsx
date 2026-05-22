import { getRankForElo, type RankName, RANKS } from "@/lib/ranks";

interface RankBadgeProps {
  rank?: RankName | string;
  elo?: number;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-9 w-9 text-xs",
  md: "h-14 w-14 text-sm",
  lg: "h-20 w-20 text-xl",
};

export default function RankBadge({ rank, elo = 0, size = "md" }: RankBadgeProps) {
  const rankConfig =
    RANKS.find((entry) => entry.name === rank) ?? getRankForElo(elo);
  const premium = rankConfig.minElo >= 3300;
  const elite = rankConfig.name === "Master" || rankConfig.name === "Eternal";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center rounded-2xl border font-bold ${sizeClasses[size]} ${rankConfig.tone} ${rankConfig.glow}`}
      style={{ fontFamily: "'Cormorant Garamond', serif" }}
      aria-label={`${rankConfig.name} rank badge`}
    >
      {premium && (
        <span className="absolute inset-[-3px] -z-10 rounded-[1.1rem] bg-current opacity-10 blur-md" />
      )}
      {elite && (
        <span className="absolute inset-[-6px] -z-10 animate-pulse rounded-[1.3rem] bg-gold-400/20 blur-xl" />
      )}
      <span className="tracking-wide">{rankConfig.badge}</span>
    </div>
  );
}
