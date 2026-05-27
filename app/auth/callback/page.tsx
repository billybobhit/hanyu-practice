"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function Dots() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-900">
      <div className="flex flex-col items-center gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2.5 h-2.5 rounded-full bg-gold-500 animate-bounce"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
        <p className="text-cream-500 text-sm tracking-widest uppercase">Signing in...</p>
      </div>
    </div>
  );
}

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      router.replace("/");
      return;
    }

    async function finish() {
      const code = searchParams.get("code");

      if (code) {
        // PKCE flow: exchange the authorization code for a session
        await supabase!.auth.exchangeCodeForSession(code);
      } else {
        // Implicit flow: tokens are in the URL hash (#access_token=...).
        // createBrowserClient auto-detects the hash and sets the session —
        // getSession() waits for that to settle.
        await supabase!.auth.getSession();
      }

      const next = sessionStorage.getItem("auth_next") ?? "/";
      sessionStorage.removeItem("auth_next");
      window.location.href = next;
    }

    void finish();
  }, [router, searchParams]);

  return <Dots />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Dots />}>
      <CallbackHandler />
    </Suspense>
  );
}
