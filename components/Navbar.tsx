"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthButton from "@/components/AuthButton";

export default function Navbar() {
  const router = useRouter();
  const [showChineseModal, setShowChineseModal] = useState(false);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowChineseModal(false);
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
            onClick={() => setShowChineseModal(true)}
            className="cursor-pointer rounded-full bg-vermillion-700 px-4 py-1.5 text-sm text-cream-100 transition-colors hover:bg-vermillion-600"
          >
            Chinese
          </button>
          {["Japanese", "Korean", "Spanish", "French"].map((language) => (
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

      {showChineseModal && (
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowChineseModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-ink-600 bg-ink-900 p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setShowChineseModal(false)}
              className="absolute right-4 top-4 cursor-pointer text-cream-600 transition-colors hover:text-cream-300"
              aria-label="Close Chinese chooser"
            >
              X
            </button>
            <h3
              className="mb-6 text-center text-xl font-semibold text-cream-100"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Choose Your Chinese
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => router.push("/zh-tw")}
                className="cursor-pointer rounded-xl border border-ink-500 bg-ink-800 p-6 text-center transition-all hover:border-vermillion-600"
              >
                <div className="text-sm font-medium text-cream-300">
                  Traditional Chinese
                </div>
                <div
                  className="mt-2 text-3xl text-cream-100"
                  style={{ fontFamily: "'Noto Serif SC', serif" }}
                >
                  繁體中文
                </div>
              </button>
              <button
                onClick={() => router.push("/zh-cn")}
                className="cursor-pointer rounded-xl border border-ink-500 bg-ink-800 p-6 text-center transition-all hover:border-vermillion-600"
              >
                <div className="text-sm font-medium text-cream-300">
                  Simplified Chinese
                </div>
                <div
                  className="mt-2 text-3xl text-cream-100"
                  style={{ fontFamily: "'Noto Serif SC', serif" }}
                >
                  简体中文
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
