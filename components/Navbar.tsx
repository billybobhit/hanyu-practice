"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthButton from "@/components/AuthButton";

export default function Navbar() {
  const router = useRouter();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowLanguageModal(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[rgba(44,58,82,0.4)] bg-[rgba(6,10,20,0.85)] px-6 backdrop-blur-md">
        <button
          onClick={() => router.push("/")}
          className="cursor-pointer text-xl font-semibold text-cream-100"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          HanYu
        </button>

        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={() => setShowLanguageModal(true)}
            className="cursor-pointer rounded-full bg-vermillion-700 px-4 py-1.5 text-sm text-cream-100 transition-colors hover:bg-vermillion-600"
          >
            Languages
          </button>
          {["Japanese", "Korean"].map((language) => (
            <span
              key={language}
              title="Coming Soon"
              className="cursor-not-allowed rounded-full bg-ink-700 px-4 py-1.5 text-sm text-cream-600 opacity-50"
            >
              {language}
            </span>
          ))}
        </div>

        <AuthButton />
      </nav>

      {showLanguageModal && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowLanguageModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-ink-600 bg-ink-900 p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setShowLanguageModal(false)}
              className="absolute right-4 top-4 cursor-pointer text-cream-600 transition-colors hover:text-cream-300"
              aria-label="Close language chooser"
            >
              X
            </button>
            <h3
              className="mb-6 text-center text-xl font-semibold text-cream-100"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Choose a Language
            </h3>
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-ink-500 bg-ink-800 p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-cream-500">
                  🇨🇳 Chinese
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push("/zh-tw")}
                    className="flex-1 cursor-pointer rounded-lg border border-ink-600 bg-ink-700 px-4 py-3 text-center transition-all hover:border-vermillion-600 hover:bg-ink-600"
                  >
                    <div className="text-sm font-medium text-cream-100">Traditional</div>
                    <div className="mt-1 text-xs text-cream-500" style={{ fontFamily: "'Noto Serif SC', serif" }}>繁體中文</div>
                  </button>
                  <button
                    onClick={() => router.push("/zh-cn")}
                    className="flex-1 cursor-pointer rounded-lg border border-ink-600 bg-ink-700 px-4 py-3 text-center transition-all hover:border-vermillion-600 hover:bg-ink-600"
                  >
                    <div className="text-sm font-medium text-cream-100">Simplified</div>
                    <div className="mt-1 text-xs text-cream-500" style={{ fontFamily: "'Noto Serif SC', serif" }}>简体中文</div>
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-ink-500 bg-ink-800 p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-cream-500">
                  🇫🇷 French
                </div>
                <button
                  onClick={() => router.push("/fr")}
                  className="w-full cursor-pointer rounded-lg border border-ink-600 bg-ink-700 px-4 py-3 text-center transition-all hover:border-vermillion-600 hover:bg-ink-600"
                >
                  <div className="text-sm font-medium text-cream-100">French</div>
                  <div className="mt-1 text-xs text-cream-500">Français</div>
                </button>
              </div>
              <div className="rounded-xl border border-ink-500 bg-ink-800 p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-cream-500">
                  🇪🇸 Spanish
                </div>
                <button
                  onClick={() => router.push("/es")}
                  className="w-full cursor-pointer rounded-lg border border-ink-600 bg-ink-700 px-4 py-3 text-center transition-all hover:border-vermillion-600 hover:bg-ink-600"
                >
                  <div className="text-sm font-medium text-cream-100">Spanish</div>
                  <div className="mt-1 text-xs text-cream-500">Español</div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
