import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getClientIdentifier,
  MAX_SESSIONS_ANON,
  MAX_SESSIONS_PER_DAY,
  MAX_VISIBLE_EXCHANGES_PER_SESSION,
} from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isAuthenticated = !!user;
  const maxSessions = isAuthenticated ? MAX_SESSIONS_PER_DAY : MAX_SESSIONS_ANON;
  const identifier = user ? `uid:${user.id}` : getClientIdentifier(req);

  const { data } = await supabase.rpc("get_chat_session_count", {
    p_identifier: identifier,
    p_date: today,
  });

  const sessionsToday = Number(data ?? 0);

  return Response.json({
    sessionsToday,
    sessionsRemaining: Math.max(0, maxSessions - sessionsToday),
    maxSessions,
    maxExchanges: MAX_VISIBLE_EXCHANGES_PER_SESSION,
    isAuthenticated,
  });
}
