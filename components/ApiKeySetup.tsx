"use client";

import { useState } from "react";
import { setApiKey } from "@/lib/apikey";

interface ApiKeySetupProps {
  onComplete: () => void;
}

export default function ApiKeySetup({ onComplete }: ApiKeySetupProps) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = key.trim();
    if (!trimmed.startsWith("sk-or-")) {
      setError("Key should start with sk-or-");
      return;
    }
    setTesting(true);
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": trimmed,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Hi" }],
          material: "",
          pinyinMode: false,
        }),
      });

      if (res.status === 401) {
        setError("Invalid API key. Please check and try again.");
        setTesting(false);
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Error ${res.status}`);
        setTesting(false);
        return;
      }

      // Consume and discard stream
      const reader = res.body?.getReader();
      if (reader) await reader.cancel();

      setApiKey(trimmed);
      onComplete();
    } catch {
      setError("Connection failed. Check your key and try again.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md animate-ink-reveal">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 border-2 border-vermillion-600 rounded-sm mb-5 rotate-3 opacity-80">
            <span className="text-xl text-vermillion-500 -rotate-3">钥</span>
          </div>
          <h1
            className="text-3xl font-bold text-cream-100 mb-2"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            漢語練習
          </h1>
          <p className="text-cream-400 text-sm">输入 OpenRouter API 密钥</p>
          <p className="text-gold-500 text-xs mt-1">免费获取 — 只需邮箱，无需信用卡，无年龄限制</p>
        </div>

        {/* Card */}
        <div className="bg-ink-800 border border-ink-500 rounded-2xl p-8 space-y-5">
          <div>
            <label className="block text-cream-300 text-sm font-medium mb-2">
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={key}
              onChange={(e) => { setKey(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="sk-or-..."
              className="w-full bg-ink-900 border border-ink-500 focus:border-vermillion-600 rounded-xl px-4 py-3 text-cream-100 placeholder-cream-700 text-sm focus:outline-none transition-colors font-mono"
            />
            {error && (
              <p className="mt-2 text-vermillion-400 text-xs">{error}</p>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!key.trim() || testing}
            className="w-full py-3 bg-vermillion-600 hover:bg-vermillion-500 disabled:bg-ink-600 disabled:cursor-not-allowed text-cream-100 rounded-xl font-medium transition-all duration-200 cursor-pointer"
          >
            {testing ? "验证中..." : "保存并开始"}
          </button>

          <div className="border-t border-ink-600 pt-4 space-y-2">
            <p className="text-cream-600 text-xs text-center">
              密钥仅存储在您的浏览器本地，不会上传到任何服务器
            </p>
            <p className="text-cream-600 text-xs text-center">
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold-500 hover:text-gold-400 transition-colors"
              >
                前往 OpenRouter 免费获取 →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
