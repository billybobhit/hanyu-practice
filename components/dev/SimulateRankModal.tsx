"use client";

import { useState } from "react";
import { RANK_THRESHOLDS } from "@/lib/elo";
import { dispatchRankUpdated } from "@/lib/rank-events";
import type { RankEvent } from "@/lib/types";
import EloProgressAnimation from "@/components/EloProgressAnimation";

interface SimulateRankModalProps {
  onClose: () => void;
}

export default function SimulateRankModal({ onClose }: SimulateRankModalProps) {
  const [rankName, setRankName] = useState("Pro");
  const [languageCode, setLanguageCode] = useState<"zh-tw" | "zh-cn">("zh-tw");
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rankEvent, setRankEvent] = useState<RankEvent | null>(null);

  const apply = async () => {
    setLoading(true);
    setConfirm(null);
    setError(null);
    try {
      const res = await fetch("/api/dev/simulate-rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rankName, languageCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      if (data.rankEvent) {
        dispatchRankUpdated({
          elo: data.rankEvent.eloAfter,
          languageCode: data.languageCode,
          rankEvent: data.rankEvent,
        });
        setRankEvent(data.rankEvent);
      }
      setConfirm(`✓ Rank set to ${data.rankSet} (${data.eloSet} ELO) for ${languageCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  if (rankEvent) {
    return (
      <EloProgressAnimation
        event={rankEvent}
        onComplete={() => {
          dispatchRankUpdated({ elo: rankEvent.eloAfter, languageCode, rankEvent });
          onClose();
        }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-visible bg-[rgba(0,0,0,0.8)] px-4 pb-4 pt-16"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-gold-700/50 bg-ink-800 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-cream-100 font-semibold">⚡ Simulate Rank</h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-cream-500 hover:bg-ink-700 hover:text-cream-200 cursor-pointer"
            aria-label="Close simulate rank"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-cream-500 text-xs uppercase tracking-[0.15em] block mb-1.5">Rank</label>
            <select
              value={rankName}
              onChange={(e) => setRankName(e.target.value)}
              className="w-full bg-ink-700 border border-ink-500 rounded-xl px-3 py-2 text-cream-200 text-sm focus:outline-none focus:border-gold-600"
            >
              {RANK_THRESHOLDS.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name} ({r.minElo.toLocaleString()} ELO)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-cream-500 text-xs uppercase tracking-[0.15em] block mb-1.5">Language</label>
            <select
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value as "zh-tw" | "zh-cn")}
              className="w-full bg-ink-700 border border-ink-500 rounded-xl px-3 py-2 text-cream-200 text-sm focus:outline-none focus:border-gold-600"
            >
              <option value="zh-tw">Traditional Chinese (zh-tw)</option>
              <option value="zh-cn">Simplified Chinese (zh-cn)</option>
            </select>
          </div>

          {confirm && (
            <p className="text-xs text-green-400 bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2">
              {confirm}
            </p>
          )}
          {error && (
            <p className="text-xs text-vermillion-400 bg-vermillion-900/20 border border-vermillion-700/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={apply}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gold-600 hover:bg-gold-500 disabled:opacity-50 text-ink-900 text-sm font-bold transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
