# Google Sign-In Bug — Debug History

## App

**HanYu Practice** — Next.js 16.2.6 (App Router, Turbopack), hosted on Vercel.  
Supabase for auth (`@supabase/ssr` v0.10.3, `@supabase/supabase-js` v2.106.1).  
Production URL: https://hanyu-practice.vercel.app

---

## The Problem

Clicking **"Continue with Google"** in the login modal opens Google's sign-in page correctly. The user enters their credentials and completes Google auth. After that, they are redirected back to the app's homepage **without being signed in** — as if the auth never happened.

Email + password sign-in works fine. The problem is specific to Google OAuth.

---

## What We Know

### 1. The OAuth flow starts correctly
Confirmed in browser: clicking "Continue with Google" navigates to:
```
https://accounts.google.com/v3/signin/identifier?...&response_type=code&...
```
`response_type=code` means PKCE is being used at the Google↔Supabase level. The Google sign-in page renders correctly.

### 2. The `/auth/callback` route IS being hit
Vercel runtime logs confirm multiple `GET /auth/callback → 307` entries every time a sign-in is attempted.

### 3. The callback has no `?code=` parameter
After adding logging to the callback handler, the logs showed:
```
[auth/callback] No code param
```
This means Supabase is **not** sending `?code=...` in the redirect back to the app. Instead, it appears to be using the **implicit flow**, sending tokens in the URL hash (`#access_token=...&refresh_token=...`).

### 4. Server route handler cannot read URL hash fragments
A server-side route handler only sees the path + query params. URL hash fragments (`#...`) are **never sent to the server** — they are client-side only. So the server receives `/auth/callback` with no params, the session exchange never happens, and the user lands on `/` unauthenticated.

---

## Files Involved

| File | Purpose |
|------|---------|
| `components/LoginModal.tsx` | Calls `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "${origin}/auth/callback" } })` |
| `app/auth/callback/page.tsx` | Client-side page that handles OAuth return (currently deployed) |
| `lib/supabase/client.ts` | `createBrowserClient(url, anonKey)` from `@supabase/ssr` |
| `lib/supabase/server.ts` | `createServerClient` for server-side Supabase usage |

---

## Everything We Tried

### Attempt 1 — `getSession()` instead of `getUser()`
Not related to Google auth directly. Was fixing the PlacementBanner not showing on initial load.

### Attempt 2 — Add `?next=` param to redirectTo
```typescript
redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(pathname)}`
```
**This broke things further.** Supabase validates the `redirectTo` URL against a whitelist. Adding query params caused the URL to not match the whitelisted `https://hanyu-practice.vercel.app/auth/callback`, so Supabase redirected to the site homepage instead of running the callback at all. Reverted.

### Attempt 3 — `sessionStorage` for post-auth redirect
Before calling `signInWithOAuth`, save the current pathname:
```typescript
sessionStorage.setItem("auth_next", window.location.pathname);
```
Reverted `redirectTo` to just `${origin}/auth/callback`. This fixed the redirect destination issue but did NOT fix the sign-in itself.

### Attempt 4 — Set cookies directly on the response object
Suspected that `cookies().set()` in a Next.js route handler doesn't carry over to `NextResponse.redirect()`. Changed callback route to:
```typescript
const response = NextResponse.redirect(...);
// createServerClient with cookies set directly on `response.cookies`
const supabase = createServerClient(url, key, {
  cookies: {
    getAll() { return request.cookies.getAll(); },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
    },
  },
});
await supabase.auth.exchangeCodeForSession(code);
return response;
```
Still didn't work — logs still showed "No code param".

### Attempt 5 — Convert to client-side page (current state)
Deleted `app/auth/callback/route.ts`.  
Created `app/auth/callback/page.tsx` as a client component:

```tsx
"use client";
// ...
useEffect(() => {
  async function finish() {
    const code = searchParams.get("code");
    if (code) {
      await supabase.auth.exchangeCodeForSession(code); // PKCE
    } else {
      await supabase.auth.getSession(); // implicit — auto-detects hash
    }
    const next = sessionStorage.getItem("auth_next") ?? "/";
    sessionStorage.removeItem("auth_next");
    router.replace(next);
  }
  void finish();
}, []);
```

**Still not working.** The user reports being redirected back to the homepage without being signed in.

---

## Current Hypothesis

Supabase is using the **implicit flow** for the redirect back to the app even though PKCE is used between the app and Google. This means:

1. Supabase receives the Google code, exchanges it internally for Google tokens
2. Supabase redirects to `https://hanyu-practice.vercel.app/auth/callback#access_token=...`
3. The client page loads, `createBrowserClient` should auto-detect the hash
4. But for some reason, the session is not persisting

### Possible remaining causes

1. **Supabase project is configured for implicit flow only** — the Supabase Auth settings may have "Flow type" set to `implicit` which means `@supabase/ssr`'s PKCE setup is being ignored or overridden.

2. **`detectSessionInUrl` is disabled or not working in `@supabase/ssr` 0.10.3** — `createBrowserClient` may not auto-detect hash tokens in this version.

3. **Cookie storage failure on client** — `createBrowserClient` uses `document.cookie` for storage. If the session can't be written to cookies (SameSite issues, size limits, etc.), auth won't persist.

4. **Supabase redirect URL whitelist misconfiguration** — The URL `https://hanyu-practice.vercel.app/auth/callback` may not be in the allowed redirect URLs list in the Supabase dashboard, causing Supabase to redirect to the Site URL (`https://hanyu-practice.vercel.app`) with no tokens at all — bypassing `/auth/callback` entirely.

---

## Supabase Project Info

- Project ref: `dqxhdsbvjjkykakpagzg` (visible in OAuth URLs)
- Supabase project URL: `https://dqxhdsbvjjkykakpagzg.supabase.co`
- Google OAuth client ID: `381734048097-l0q3bjgelhjjsb0l1atcue0n5bv1c3mk.apps.googleusercontent.com`

---

## Things to Check in Supabase Dashboard

1. **Authentication → URL Configuration**
   - Site URL: should be `https://hanyu-practice.vercel.app`
   - Redirect URLs: must include `https://hanyu-practice.vercel.app/auth/callback`

2. **Authentication → Providers → Google**
   - Must be enabled
   - Client ID and Client Secret must be filled in

3. **Authentication → Settings (Advanced)**
   - Flow type: should be `PKCE` (not `Implicit`)

---

## Current Code State

### `components/LoginModal.tsx` (relevant part)
```typescript
const handleGoogle = async () => {
  sessionStorage.setItem("auth_next", window.location.pathname);
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
};
```

### `app/auth/callback/page.tsx` (current)
```tsx
"use client";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { router.replace("/"); return; }

    async function finish() {
      const code = searchParams.get("code");
      if (code) {
        await supabase!.auth.exchangeCodeForSession(code);
      } else {
        await supabase!.auth.getSession();
      }
      const next = sessionStorage.getItem("auth_next") ?? "/";
      sessionStorage.removeItem("auth_next");
      router.replace(next);
    }
    void finish();
  }, [router, searchParams]);

  return <LoadingScreen />;
}
```

### `lib/supabase/client.ts`
```typescript
import { createBrowserClient } from "@supabase/ssr";

export const createClient = (): SupabaseClient | null => {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  if (!isValidSupabaseUrl(supabaseUrl) || !supabaseAnonKey) return null;
  return createBrowserClient(supabaseUrl, supabaseAnonKey!);
};
```
