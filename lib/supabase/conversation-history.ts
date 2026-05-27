import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Grade, Message, Session } from "@/lib/types";

export interface ConversationHistoryRow {
  id: string;
  user_id: string;
  language_code: string;
  material_title: string | null;
  difficulty: string | null;
  messages: Message[];
  grade: Grade | null;
  elo_change: number | null;
  elo_after: number | null;
  created_at: string;
}

const MAX_PER_LANGUAGE = 10;

async function getConfirmedUser(supabase: SupabaseClient) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.user ?? null;
}

async function trimConversationHistory(
  supabase: SupabaseClient,
  userId: string,
  languageCode: string
) {
  const { data: rows, error } = await supabase
    .from("conversation_history")
    .select("id")
    .eq("user_id", userId)
    .eq("language_code", languageCode)
    .order("created_at", { ascending: false });

  if (error || !rows || rows.length <= MAX_PER_LANGUAGE) return;

  const toDelete = rows.slice(MAX_PER_LANGUAGE).map((r: { id: string }) => r.id);

  await supabase
    .from("conversation_history")
    .delete()
    .eq("user_id", userId)
    .eq("language_code", languageCode)
    .in("id", toDelete);
}

export async function addConversationHistory(
  session: Session
): Promise<boolean> {
  if (!session.grade) return false;

  const supabase = createClient();
  if (!supabase) return false;

  const user = await getConfirmedUser(supabase);
  if (!user) return false;

  const languageCode = session.languageCode ?? "general";

  const { error } = await supabase.from("conversation_history").insert({
    user_id: user.id,
    language_code: languageCode,
    material_title: session.materialTitle,
    difficulty: session.difficulty,
    messages: session.messages,
    grade: session.grade,
    elo_change: session.rankEvent?.eloChange ?? null,
    elo_after: session.rankEvent?.eloAfter ?? null,
  });

  if (error) {
    console.error("Failed to save conversation history", error);
    return false;
  }

  await trimConversationHistory(supabase, user.id, languageCode);
  return true;
}

export async function getConversationHistory(
  supabase: SupabaseClient
): Promise<ConversationHistoryRow[]> {
  const user = await getConfirmedUser(supabase);
  if (!user) return [];

  const { data, error } = await supabase
    .from("conversation_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Failed to load conversation history", error);
    return [];
  }

  return data as ConversationHistoryRow[];
}

export async function deleteConversationHistoryEntry(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const user = await getConfirmedUser(supabase);
  if (!user) return;

  await supabase
    .from("conversation_history")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id);
}
