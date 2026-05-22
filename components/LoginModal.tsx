"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface LoginModalProps {
  onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const [supabase] = useState(() => createClient());
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    setError(null);
    if (!supabase) {
      setError("Authentication is not configured yet.");
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleEmail = async () => {
    setLoading(true);
    setError(null);

    if (!supabase) {
      setLoading(false);
      setError("Authentication is not configured yet.");
      return;
    }

    const response = isSignUp
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
              full_name: displayName,
            },
          },
        })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (response.error) {
      setError(response.error.message);
      return;
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(0,0,0,0.8)] p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[400px] rounded-2xl border border-ink-500 bg-ink-800 p-8 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer text-cream-600 transition-colors hover:text-cream-300"
          aria-label="Close login modal"
        >
          X
        </button>

        <div className="mb-6 text-center">
          <div
            className="text-3xl font-semibold text-cream-100"
            style={{ fontFamily: "'Cormorant Garamond', serif" }}
          >
            HanYu
          </div>
          <h2 className="mt-2 text-xl font-semibold text-cream-100">
            Welcome Back
          </h2>
        </div>

        <button
          onClick={handleGoogle}
          className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-ink-500" />
          <span className="text-xs text-cream-600">or continue with email</span>
          <div className="h-px flex-1 bg-ink-500" />
        </div>

        <div className="space-y-3">
          {isSignUp && (
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Display Name"
              className="w-full rounded-xl border border-ink-500 bg-ink-900 px-4 py-3 text-sm text-cream-100 outline-none transition-colors placeholder:text-cream-600 focus:border-vermillion-600"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-ink-500 bg-ink-900 px-4 py-3 text-sm text-cream-100 outline-none transition-colors placeholder:text-cream-600 focus:border-vermillion-600"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-ink-500 bg-ink-900 px-4 py-3 text-sm text-cream-100 outline-none transition-colors placeholder:text-cream-600 focus:border-vermillion-600"
          />
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-vermillion-700/40 bg-vermillion-700/20 px-3 py-2 text-sm text-vermillion-300">
            {error}
          </p>
        )}

        <button
          onClick={handleEmail}
          disabled={loading || !email || !password || (isSignUp && !displayName)}
          className="mt-4 w-full cursor-pointer rounded-xl bg-vermillion-600 px-4 py-3 text-sm font-semibold text-cream-100 transition-colors hover:bg-vermillion-500 disabled:cursor-not-allowed disabled:bg-ink-500"
        >
          {loading ? "Working..." : isSignUp ? "Sign Up" : "Sign In"}
        </button>

        <button
          onClick={() => {
            setError(null);
            setIsSignUp((value) => !value);
          }}
          className="mt-4 w-full cursor-pointer text-center text-sm text-cream-500 transition-colors hover:text-cream-300"
        >
          {isSignUp
            ? "Already have an account? Sign In"
            : "Don't have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}
