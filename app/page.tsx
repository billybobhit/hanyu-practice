"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const languagePods = [
  {
    label: "🇨🇳 Chinese",
    variants: [
      { title: "Traditional", subtitle: "繁體中文", path: "/zh-tw" },
      { title: "Simplified", subtitle: "简体中文", path: "/zh-cn" },
    ],
  },
  {
    label: "🇫🇷 French",
    variants: [
      { title: "French", subtitle: "Français", path: "/fr" },
    ],
  },
];

export default function HomePage() {
  const router = useRouter();
  const featuresRef = useRef<HTMLElement>(null);
  const [bannerDismissed, setBannerDismissed] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    setBannerDismissed(localStorage.getItem("hanyu_login_banner_dismissed") === "1");
  }, []);

  const dismissBanner = () => {
    localStorage.setItem("hanyu_login_banner_dismissed", "1");
    setBannerDismissed(true);
  };

  return (
    <main className="min-h-screen bg-ink-900 pt-16">
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(circle, #CC2218, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full opacity-[0.03]"
            style={{ background: "radial-gradient(circle, #BA8820, transparent 70%)" }}
          />
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage:
                "linear-gradient(#EDE4D4 1px, transparent 1px), linear-gradient(90deg, #EDE4D4 1px, transparent 1px)",
              backgroundSize: "60px 60px",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-6 text-center animate-ink-reveal">
          <div className="mb-6 inline-flex items-center rounded-full border border-ink-500 bg-ink-800 px-4 py-1 text-xs text-cream-400">
            <span className="mr-2">🏆</span>
            AI Language Practice
          </div>

          <h1
            className="text-5xl font-bold leading-tight text-cream-100 md:text-7xl"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            Master Any Language
          </h1>

          <p className="mx-auto mt-4 max-w-xl text-xl leading-relaxed text-cream-400">
            Upload your study materials. Have deep AI conversations. Get graded
            and earn your rank.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setShowLanguageModal(true)}
              className="cursor-pointer rounded-xl bg-vermillion-600 px-8 py-4 text-lg font-semibold text-cream-100 transition-colors hover:bg-vermillion-500"
            >
              Start Practicing →
            </button>
            <button
              onClick={() => featuresRef.current?.scrollIntoView({ behavior: "smooth" })}
              className="cursor-pointer rounded-xl border border-ink-500 px-8 py-4 text-lg text-cream-400 transition-colors hover:border-cream-400 hover:text-cream-100"
            >
              Learn More
            </button>
          </div>

          {!bannerDismissed && (
            <div className="mx-auto mt-6 flex max-w-xl items-center justify-between gap-4 rounded-xl border border-gold-700 bg-ink-800 px-6 py-3 text-sm text-gold-400">
              <span>🏆 Login to save your progress and earn your rank!</span>
              <button
                onClick={dismissBanner}
                className="cursor-pointer text-gold-600 transition-colors hover:text-gold-300"
                aria-label="Dismiss progress reminder"
              >
                X
              </button>
            </div>
          )}
        </div>
      </section>

      <section ref={featuresRef} id="features" className="px-6 py-24">
        <h2 className="mb-4 text-center text-3xl font-bold text-cream-100">
          Everything you need to master a language
        </h2>
        <p className="mb-12 text-center text-cream-400">
          Powered by AI, designed for real learning
        </p>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              icon: "📚",
              title: "Smart Material Upload",
              body: "Drop in PDFs, images, text, or URLs. Our AI reads everything.",
            },
            {
              icon: "🎙",
              title: "Voice Conversation",
              body: "Speak and listen naturally. Practice pronunciation in real time.",
            },
            {
              icon: "🏆",
              title: "Earn Your Rank",
              body: "Climb from Noob to Eternal based on your performance.",
            },
          ].map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-ink-500 bg-ink-800 p-8"
            >
              <div className="mb-4 text-4xl">{feature.icon}</div>
              <h3 className="mb-2 text-xl font-semibold text-cream-100">
                {feature.title}
              </h3>
              <p className="leading-relaxed text-cream-500">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-ink-900/50 px-6 py-24">
        <h2 className="mb-12 text-center text-3xl font-bold text-cream-100">
          How it works
        </h2>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3">
          {[
            {
              number: "01",
              title: "Upload Materials",
              body: "Add your study notes, textbook pages, or any learning content",
            },
            {
              number: "02",
              title: "Practice Conversation",
              body: "Your AI tutor asks deep questions to test your understanding",
            },
            {
              number: "03",
              title: "Earn Your Rank",
              body: "Get graded, earn ELO, and climb from Noob to Eternal",
            },
          ].map((step) => (
            <div key={step.number} className="text-center">
              <div className="mb-4 text-3xl font-bold text-vermillion-500">
                {step.number}
              </div>
              <h3 className="mb-3 text-lg font-semibold text-cream-100">
                {step.title}
              </h3>
              <p className="text-sm leading-6 text-cream-500">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-ink-600 px-6 py-12 text-sm text-cream-600">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-center md:flex-row">
          <span>HanYu © 2026</span>
          <span>Built for learners worldwide</span>
          <div className="flex gap-5">
            <a href="#" className="transition-colors hover:text-cream-300">
              Privacy
            </a>
            <a href="#" className="transition-colors hover:text-cream-300">
              Terms
            </a>
          </div>
        </div>
      </footer>

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
              {languagePods.map((pod) => (
                <div key={pod.label} className="rounded-xl border border-ink-500 bg-ink-800 p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-cream-500">
                    {pod.label}
                  </div>
                  <div className="flex gap-2">
                    {pod.variants.map((v) => (
                      <button
                        key={v.path}
                        onClick={() => router.push(v.path)}
                        className="flex-1 cursor-pointer rounded-lg border border-ink-600 bg-ink-700 px-4 py-3 text-center transition-all hover:border-vermillion-600 hover:bg-ink-600"
                      >
                        <div className="text-sm font-medium text-cream-100">{v.title}</div>
                        <div className="mt-1 text-xs text-cream-500">{v.subtitle}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
