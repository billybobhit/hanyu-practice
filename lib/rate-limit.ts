import { createClient } from "@/lib/supabase/server";

export const MAX_MESSAGES_PER_SESSION = 7;
export const MAX_SESSIONS_PER_DAY = 3;
export const MAX_SESSIONS_ANON = 1;
export const MAX_VISIBLE_EXCHANGES_PER_SESSION = MAX_MESSAGES_PER_SESSION - 1;

export function countUserMessages(messages: { role: string }[]): number {
  return messages.filter((m) => m.role === "user").length;
}

export function isFirstMessage(messages: { role: string }[]): boolean {
  return countUserMessages(messages) === 1;
}

export function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : (req.headers.get("x-real-ip") ?? "unknown");
  return `ip:${ip}`;
}

export async function checkDailySessionLimit(req: Request): Promise<{
  allowed: boolean;
  remaining: number;
  identifier: string;
  isAuthenticated: boolean;
  maxForUser: number;
}> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;
  const maxForUser = isAuthenticated ? MAX_SESSIONS_PER_DAY : MAX_SESSIONS_ANON;
  const identifier = user ? `uid:${user.id}` : getClientIdentifier(req);

  const { data, error } = await supabase.rpc("get_chat_session_count", {
    p_identifier: identifier,
    p_date: today,
  });

  if (error) {
    return { allowed: true, remaining: maxForUser, identifier, isAuthenticated, maxForUser };
  }

  const count = Number(data ?? 0);
  return {
    allowed: count < maxForUser,
    remaining: Math.max(0, maxForUser - count),
    identifier,
    isAuthenticated,
    maxForUser,
  };
}

export async function incrementDailySessionCount(identifier: string): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();

  // Upsert: insert row or increment count
  await supabase.rpc("increment_chat_session_count", {
    p_identifier: identifier,
    p_date: today,
  });
}
