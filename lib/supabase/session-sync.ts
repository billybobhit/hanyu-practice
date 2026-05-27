import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessions, replaceSessions, setStorageUserId } from "@/lib/storage";
import type { Session } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

const TABLE = "practice_sessions";

interface SessionRow {
  id: string;
  session: Session;
  updated_at?: string;
}

function sessionVersion(session: Session) {
  return (
    (session.grade ? 1_000_000_000_000 : 0) +
    (session.endTime ?? session.startTime) +
    session.messages.length
  );
}

function normalizeSession(session: Session): Session {
  return {
    ...session,
    difficulty: session.difficulty ?? "hard",
  };
}

function mergeSessions(localSessions: Session[], remoteSessions: Session[]) {
  const merged = new Map<string, Session>();

  [...remoteSessions, ...localSessions].forEach((session) => {
    const normalized = normalizeSession(session);
    const existing = merged.get(normalized.id);

    if (!existing || sessionVersion(normalized) >= sessionVersion(existing)) {
      merged.set(normalized.id, normalized);
    }
  });

  return Array.from(merged.values()).sort((a, b) => b.startTime - a.startTime);
}

async function getSignedInUser(supabase: SupabaseClient) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
}

export async function syncSessionsWithCloud(
  supabase: SupabaseClient,
  userId?: string
) {
  const user = userId ? { id: userId } : await getSignedInUser(supabase);

  if (!user?.id) {
    setStorageUserId("guest");
    return { ok: true, synced: false, sessions: getSessions() };
  }

  setStorageUserId(user.id);
  const localSessions = getSessions();
  const { data, error } = await supabase
    .from(TABLE)
    .select("id, session, updated_at")
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, synced: false, sessions: localSessions, error };
  }

  const remoteSessions = ((data ?? []) as SessionRow[]).map((row) =>
    normalizeSession(row.session)
  );
  const mergedSessions = mergeSessions(localSessions, remoteSessions);

  replaceSessions(mergedSessions);

  if (mergedSessions.length > 0) {
    const { error: upsertError } = await supabase.from(TABLE).upsert(
      mergedSessions.map((session) => ({
        id: session.id,
        user_id: user.id,
        session,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "user_id,id" }
    );

    if (upsertError) {
      return {
        ok: false,
        synced: false,
        sessions: mergedSessions,
        error: upsertError,
      };
    }
  }

  return { ok: true, synced: true, sessions: mergedSessions };
}

export async function pushSessionToCloud(session: Session) {
  const supabase = createClient();
  if (!supabase) return;

  const user = await getSignedInUser(supabase);
  if (!user) return;

  await supabase.from(TABLE).upsert(
    {
      id: session.id,
      user_id: user.id,
      session: normalizeSession(session),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,id" }
  );
}

export async function deleteSessionFromCloud(id: string) {
  const supabase = createClient();
  if (!supabase) return;

  const user = await getSignedInUser(supabase);
  if (!user) return;

  await supabase.from(TABLE).delete().eq("user_id", user.id).eq("id", id);
}
