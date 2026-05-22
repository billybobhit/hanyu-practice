@AGENTS.md

## Dev Account Rule

- `is_dev` is a column in `user_profiles` (Supabase). Only service_role can set it — users cannot modify their own `is_dev`.
- All dev API routes (`/api/dev/*`) and dev pages (`/dev/*`) check `is_dev` server-side and return 403 / redirect if false.
- Client-side `isDev()` from `lib/dev.ts` is for UI only (showing the ⚡ badge, dev dropdown). Never gate sensitive operations on it alone.
- Dev mode toggle (`hanyu_dev_mode` localStorage key) only controls the DevOverlay visibility — it is separate from `is_dev`.
