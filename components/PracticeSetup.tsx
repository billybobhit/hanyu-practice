"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadZone from "@/components/UploadZone";
import {
  generateSessionId,
  saveSession,
  setCurrentSessionId,
} from "@/lib/storage";
import { pushSessionToCloud } from "@/lib/supabase/session-sync";
import type { Difficulty, Session } from "@/lib/types";

interface PracticeSetupProps {
  basePath: "/zh-cn" | "/zh-tw";
  variantLabel: string;
  variantNative: string;
}

const difficultyOptions: {
  value: Difficulty;
  label: string;
  description: string;
}[] = [
  {
    value: "hard",
    label: "Hard",
    description: "Mandarin-only tutor responses",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Chinese responses with pinyin support",
  },
  {
    value: "easy",
    label: "Easy",
    description: "English explanations with Chinese terms",
  },
];

export default function PracticeSetup({
  basePath,
  variantLabel,
  variantNative,
}: PracticeSetupProps) {
  const router = useRouter();
  const [difficulty, setDifficulty] = useState<Difficulty>("hard");

  const handleMaterialReady = (content: string, title: string) => {
    const id = generateSessionId();
    const session: Session = {
      id,
      materialTitle: title,
      materialContent: content,
      difficulty,
      messages: [],
      startTime: Date.now(),
    };

    saveSession(session);
    void pushSessionToCloud(session);
    setCurrentSessionId(id);
    router.push(`${basePath}/practice`);
  };

  return (
    <main className="min-h-screen bg-ink-900 px-6 py-8 pt-24">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="cursor-pointer text-sm text-cream-500 transition-colors hover:text-cream-300"
          >
            ← Back
          </button>
          <span className="rounded-full border border-gold-700/50 bg-gold-800/20 px-4 py-1.5 text-sm text-gold-300">
            {variantNative}
          </span>
        </header>

        <section className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.18em] text-gold-500">
            {variantLabel}
          </p>
          <h1
            className="text-4xl font-semibold text-cream-100 md:text-5xl"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Start a Practice Session
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-6 text-cream-400">
            Choose a difficulty, add study material, and HanYu will begin a
            guided conversation from that source.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-cream-300">Difficulty</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {difficultyOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setDifficulty(option.value)}
                className={`cursor-pointer rounded-xl border p-4 text-left transition-all ${
                  difficulty === option.value
                    ? "border-vermillion-500 bg-vermillion-700/20"
                    : "border-ink-500 bg-ink-800 hover:border-ink-300"
                }`}
              >
                <div className="text-sm font-semibold text-cream-100">
                  {option.label}
                </div>
                <div className="mt-1 text-xs leading-5 text-cream-500">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-ink-600 bg-ink-800/50 p-5">
          <UploadZone onMaterialReady={handleMaterialReady} />
        </section>
      </div>
    </main>
  );
}
