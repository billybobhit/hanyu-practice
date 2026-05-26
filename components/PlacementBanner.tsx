"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getSessions } from "@/lib/storage";
import { getProgressFromSessions } from "@/lib/ranks";

interface PlacementBannerProps {
  languageCode: "zh-tw" | "zh-cn";
}

export default function PlacementBanner({ languageCode }: PlacementBannerProps) {
  const pathname = usePathname();
  const [isNoob, setIsNoob] = useState(false);

  useEffect(() => {
    function check() {
      const progress = getProgressFromSessions(getSessions());
      setIsNoob(progress.currentElo < 250);
    }
    check();
  }, [pathname]);

  if (!isNoob) return null;
  if (pathname === `/${languageCode}/placement`) return null;

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
