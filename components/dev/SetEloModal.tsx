"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { getRankForElo } from "@/lib/ranks";
import { dispatchRankUpdated } from "@/lib/rank-events";
import type { RankEvent } from "@/lib/types";
import EloProgressAnimation from "@/components/EloProgressAnimation";

interface SetEloModalProps {
  onClose: () => void;
}

export default function SetEloModal({ onClose }: SetEloModalProps) {
  const [languageCode, setLanguageCode] = useState<"zh-tw" | "zh-cn" | "fr">("zh-tw");
  const [eloInput, setEloInput] = useState("1000");
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rankEvent, setRankEvent] = useState<RankEvent | null>(null);

  const parsedElo = Math.max(0, Math.floor(Number(eloInput) || 0));
  const previewRank = getRankForElo(parsedElo).name;

  const apply = async () => {
    setLoading(true);
    setConfirm(null);
    setError(null);
    try {
      const res = await fetch("/api/dev/set-elo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languageCode, elo: parsedElo }),
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
      setConfirm(`✓ ELO set to ${data.eloSet.toLocaleString()} (${previewRank}) for ${languageCode}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  if (rankEvent) {
    return createPortal(
      <EloProgressAnimation
        event={rankEvent}
        onComplete={() => {
          dispatchRankUpdated({ elo: rankEvent.eloAfter, languageCode, rankEvent });
          onClose();
        }}
      />,
      document.body
    );
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-visible bg-[rgba(0,0,0,0.8)] px-4 pb-4 pt-16"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-gold-700/50 bg-ink-800 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-cream-100 font-semibold">⚡ Set Exact ELO</h2>
          <button
            onClick={onClose}
            className="rounded-md px-2 py-1 text-sm text-cream-500 hover:bg-ink-700 hover:text-cream-200 cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-cream-500 text-xs uppercase tracking-[0.15em] block mb-1.5">Language</label>
            <select
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value as "zh-tw" | "zh-cn" | "fr")}
              className="w-full bg-ink-700 border border-ink-500 rounded-xl px-3 py-2 text-cream-200 text-sm focus:outline-none focus:border-gold-600"
            >
              <option value="zh-tw">Traditional Chinese (zh-tw)</option>
              <option value="zh-cn">Simplified Chinese (zh-cn)</option>
              <option value="fr">French (fr)</option>
            </select>
          </div>

          <div>
            <label className="text-cream-500 text-xs uppercase tracking-[0.15em] block mb-1.5">ELO Value</label>
            <input
              type="number"
              min={0}
              value={eloInput}
              onChange={(e) => setEloInput(e.target.value)}
              className="w-full bg-ink-700 border border-ink-500 rounded-xl px-3 py-2 text-cream-200 text-sm focus:outline-none focus:border-gold-600"
              placeholder="e.g. 1250"
            />
            <p className="text-cream-600 text-xs mt-1.5">
              → <span className="text-gold-400">{previewRank}</span> rank ({parsedElo.toLocaleString()} ELO)
            </p>
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
