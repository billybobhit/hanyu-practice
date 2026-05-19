"use client";

import { useState, useCallback, useRef } from "react";
import { parsePDF, parseImageFile, parseURL } from "@/lib/parser";

interface UploadZoneProps {
  onMaterialReady: (content: string, title: string) => void;
}

type Tab = "upload" | "text" | "url";

export default function UploadZone({ onMaterialReady }: UploadZoneProps) {
  const [tab, setTab] = useState<Tab>("upload");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        let content = "";
        if (file.type === "application/pdf") {
          content = await parsePDF(file);
        } else if (file.type.startsWith("image/")) {
          content = await parseImageFile(file);
        } else if (file.type === "text/plain") {
          content = await file.text();
        } else {
          throw new Error("Unsupported file type. Use PDF, image, or .txt");
        }

        if (!content.trim()) throw new Error("No text could be extracted");
        onMaterialReady(content, file.name.replace(/\.[^.]+$/, ""));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process file");
      } finally {
        setLoading(false);
      }
    },
    [onMaterialReady]
  );

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) await handleFile(file);
    },
    [handleFile]
  );

  const handleURL = async () => {
    if (!urlInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const content = await parseURL(urlInput.trim());
      const hostname = new URL(urlInput.trim()).hostname;
      onMaterialReady(content, hostname);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch URL");
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = () => {
    if (!pastedText.trim()) return;
    onMaterialReady(pastedText.trim(), "Pasted material");
  };

  return (
    <div className="w-full">
      {/* Tab selector */}
      <div className="flex gap-1 mb-4 bg-ink-800 rounded-xl p-1">
        {(["upload", "text", "url"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer ${
              tab === t
                ? "bg-ink-500 text-cream-100 shadow-sm"
                : "text-cream-400 hover:text-cream-200"
            }`}
          >
            {t === "upload" ? "📎 File" : t === "text" ? "✏️ Text" : "🔗 Link"}
          </button>
        ))}
      </div>

      {/* Upload tab */}
      {tab === "upload" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 ${
            dragging
              ? "border-vermillion-500 bg-vermillion-700/10"
              : "border-ink-400 hover:border-ink-300 hover:bg-ink-700/30"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.txt,image/*"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="text-5xl mb-4">
            {loading ? "⏳" : dragging ? "📂" : "📚"}
          </div>
          <p className="text-cream-200 font-medium mb-1">
            {loading ? "Processing..." : "Drop a file here, or click to choose"}
          </p>
          <p className="text-cream-400 text-sm">Supports PDF, image, and text files</p>
        </div>
      )}

      {/* Text tab */}
      {tab === "text" && (
        <div className="space-y-3">
          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste or type study material here..."
            className="w-full h-48 bg-ink-800 border border-ink-500 rounded-xl p-4 text-cream-100 placeholder-cream-600 resize-none focus:outline-none focus:border-vermillion-600 transition-colors text-sm leading-relaxed"
          />
          <button
            onClick={handleTextSubmit}
            disabled={!pastedText.trim()}
            className="w-full py-3 bg-vermillion-600 hover:bg-vermillion-500 disabled:bg-ink-500 disabled:cursor-not-allowed text-cream-100 rounded-xl font-medium transition-all duration-200 cursor-pointer"
          >
            Use this material
          </button>
        </div>
      )}

      {/* URL tab */}
      {tab === "url" && (
        <div className="space-y-3">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleURL()}
            placeholder="https://..."
            className="w-full bg-ink-800 border border-ink-500 rounded-xl px-4 py-3 text-cream-100 placeholder-cream-600 focus:outline-none focus:border-vermillion-600 transition-colors text-sm"
          />
          <button
            onClick={handleURL}
            disabled={!urlInput.trim() || loading}
            className="w-full py-3 bg-vermillion-600 hover:bg-vermillion-500 disabled:bg-ink-500 disabled:cursor-not-allowed text-cream-100 rounded-xl font-medium transition-all duration-200 cursor-pointer"
          >
            {loading ? "Fetching..." : "Fetch content"}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 bg-vermillion-700/20 border border-vermillion-700/40 rounded-lg text-vermillion-300 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
