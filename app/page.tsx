"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadZone from "@/components/UploadZone";
import {
  saveSession,
  setCurrentSessionId,
  generateSessionId,
  getSessionSummaries,
} from "@/lib/storage";

export default function HomePage() {
  const router = useRouter();
  const [material, setMaterial] = useState<{ content: string; title: string } | null>(null);
  const [starting, setStarting] = useState(false);

  const handleMaterialReady = (content: string, title: string) => {
    setMaterial({ content, title });
  };

  const startSession = () => {
    if (!material) return;
    setStarting(true);

    const id = generateSessionId();
    const session = {
      id,
      materialTitle: material.title,
      materialContent: material.content,
      messages: [],
      startTime: Date.now(),
    };

    saveSession(session);
    setCurrentSessionId(id);
    router.push("/practice");
  };

  const summaries = typeof window !== "undefined" ? getSessionSummaries().slice(0, 3) : [];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #CC2218, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-[0.03]"
          style={{ background: "radial-gradient(circle, #BA8820, transparent 70%)" }}
        />
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "linear-gradient(#EDE4D4 1px, transparent 1px), linear-gradient(90deg, #EDE4D4 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <header className="text-center mb-14 animate-ink-reveal">
          {/* Seal decoration */}
          <div className="inline-flex items-center justify-center w-16 h-16 border-2 border-vermillion-600 rounded-sm mb-6 rotate-3 opacity-80">
            <span className="text-2xl text-vermillion-500 -rotate-3">印</span>
          </div>

          <h1
            className="text-5xl font-bold text-cream-100 mb-2 tracking-wider"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            漢語練習
          </h1>
          <p
            className="text-xl text-cream-400 mb-1 tracking-wide"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic" }}
          >
            HanYu — Chinese Practice
          </p>
          <p className="text-cream-500 text-sm max-w-sm mx-auto leading-relaxed mt-3">
            上传学习材料，与AI导师展开深度苏格拉底式对话，掌握汉语精髓
          </p>
        </header>

        {/* Main card */}
        <div
          className="bg-ink-800 border border-ink-500 rounded-2xl p-8 mb-6 animate-ink-reveal"
          style={{ animationDelay: "0.1s" }}
        >
          {!material ? (
            <>
              <h2 className="text-cream-200 font-semibold mb-5 flex items-center gap-2">
                <span className="w-6 h-6 bg-vermillion-700 rounded-md flex items-center justify-center text-xs">
                  1
                </span>
                上传学习材料
              </h2>
              <UploadZone onMaterialReady={handleMaterialReady} />
            </>
          ) : (
            <div className="space-y-5">
              {/* Material preview */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-cream-500 text-xs uppercase tracking-widest mb-1">
                    材料已就绪
                  </p>
                  <h3 className="text-cream-100 font-semibold text-lg">{material.title}</h3>
                  <p className="text-cream-500 text-sm mt-0.5">
                    {material.content.length.toLocaleString()} 个字符
                  </p>
                </div>
                <button
                  onClick={() => setMaterial(null)}
                  className="text-cream-600 hover:text-cream-400 text-sm cursor-pointer transition-colors"
                >
                  更换
                </button>
              </div>

              {/* Content preview */}
              <div className="bg-ink-900 border border-ink-600 rounded-xl p-4 max-h-32 overflow-y-auto">
                <p className="text-cream-400 text-xs leading-relaxed whitespace-pre-wrap">
                  {material.content.slice(0, 500)}
                  {material.content.length > 500 && "…"}
                </p>
              </div>

              <button
                onClick={startSession}
                disabled={starting}
                className="w-full py-4 bg-vermillion-600 hover:bg-vermillion-500 disabled:bg-ink-500 disabled:cursor-not-allowed text-cream-100 rounded-xl font-semibold text-lg transition-all duration-300 cursor-pointer group relative overflow-hidden"
              >
                <span className="relative z-10">
                  {starting ? "开始中..." : "开始对话练习 →"}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
            </div>
          )}
        </div>

        {/* Features row */}
        <div
          className="grid grid-cols-3 gap-3 mb-8 animate-ink-reveal"
          style={{ animationDelay: "0.2s" }}
        >
          {[
            { icon: "🎙️", label: "语音对话", desc: "中文语音输入与朗读" },
            { icon: "📊", label: "智能评分", desc: "词汇·语法·理解力" },
            { icon: "📈", label: "进度追踪", desc: "记录每次练习成果" },
          ].map((f) => (
            <div
              key={f.label}
              className="bg-ink-800/50 border border-ink-600 rounded-xl p-4 text-center"
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="text-cream-300 text-xs font-medium">{f.label}</div>
              <div className="text-cream-600 text-xs mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Recent sessions */}
        {summaries.length > 0 && (
          <div className="animate-ink-reveal" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-cream-400 text-sm font-medium">最近练习</h3>
              <a href="/results" className="text-gold-500 hover:text-gold-400 text-xs transition-colors">
                查看全部 →
              </a>
            </div>
            <div className="space-y-2">
              {summaries.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-ink-800/40 border border-ink-600 rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="text-cream-200 text-sm font-medium">{s.materialTitle}</p>
                    <p className="text-cream-600 text-xs">
                      {new Date(s.startTime).toLocaleDateString("zh-CN")} ·{" "}
                      {s.messageCount} 轮对话
                    </p>
                  </div>
                  <div
                    className="text-2xl font-bold"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      color:
                        s.overallGrade === "A"
                          ? "#EEC050"
                          : s.overallGrade === "B"
                          ? "#86efac"
                          : s.overallGrade === "C"
                          ? "#fde047"
                          : s.overallGrade === "D"
                          ? "#fb923c"
                          : "#F55040",
                    }}
                  >
                    {s.overallGrade}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
