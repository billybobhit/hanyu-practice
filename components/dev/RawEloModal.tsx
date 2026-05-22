"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getUserProgress } from "@/lib/storage";
import { eloToRank, getBestLanguageRank } from "@/lib/elo";

interface LanguageRow {
  language_code: string;
  elo: number;
  has_completed_placement: boolean;
  session_count?: number;
}

interface RawEloModalProps {
  onClose: () => void;
}

export default function RawEloModal({ onClose }: RawEloModalProps) {
  const [rows, setRows] = useState<LanguageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const localElo = getUserProgress().currentElo;

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      if (!supabase) { setLoading(false); return; }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from("user_language_elo")
        .select("language_code, elo, has_completed_placement")
        .eq("user_id", user.id);

      setRows(data ?? []);
      setLoading(false);
    }
    void load();
  }, []);

  const globalElo = rows.reduce((sum, r) => sum + r.elo, 0);
  const bestLang = getBestLanguageRank(rows);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gold-700/50 bg-ink-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-cream-100 font-semibold">⚡ Raw ELO Data</h2>
          <button onClick={onClose} className="text-cream-600 hover:text-cream-300 cursor-pointer text-sm">✕</button>
        </div>

        {loading ? (
          <p className="text-cream-500 text-sm">Loading...</p>
        ) : (
          <div className="space-y-4">
            {/* Language table */}
            <div className="overflow-hidden rounded-xl border border-ink-600">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-ink-700 text-cream-500 uppercase tracking-wider">
                    <th className="px-3 py-2 text-left">Language</th>
                    <th className="px-3 py-2 text-right">Hidden ELO</th>
                    <th className="px-3 py-2 text-left">Rank</th>
                    <th className="px-3 py-2 text-center">Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-3 text-center text-cream-600">No rows yet</td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.language_code} className="border-t border-ink-600">
                        <td className="px-3 py-2 text-cream-300 font-mono">{r.language_code}</td>
                        <td className="px-3 py-2 text-right text-gold-300 font-mono">{r.elo.toLocaleString()}</td>
                        <td className="px-3 py-2 text-cream-400">{eloToRank(r.elo)}</td>
                        <td className="px-3 py-2 text-center">{r.has_completed_placement ? "✅" : "❌"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="rounded-xl border border-ink-600 bg-ink-700/50 px-4 py-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-cream-500">Global ELO (Supabase sum)</span>
                <span className="text-gold-300 font-mono">{globalElo.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cream-500">Local ELO (localStorage)</span>
                <span className="text-gold-300 font-mono">{localElo.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cream-500">Best Language Rank</span>
                <span className="text-cream-200">{bestLang ? `${bestLang.rankName} (${bestLang.languageCode})` : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-cream-500">Displayed Rank (local)</span>
                <span className="text-cream-200">{eloToRank(localElo)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
