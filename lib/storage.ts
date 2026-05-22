import type { Session, SessionSummary } from "./types";

const SESSIONS_KEY = "hanyu_sessions";
const CURRENT_ID_KEY = "hanyu_current_id";

export function saveSession(session: Session): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function getSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    const sessions = raw ? JSON.parse(raw) : [];
    return sessions.map((session: Session) => ({
      ...session,
      difficulty: session.difficulty ?? "hard",
    }));
  } catch {
    return [];
  }
}

export function replaceSessions(sessions: Session[]): void {
  const unique = new Map<string, Session>();
  sessions.forEach((session) => {
    unique.set(session.id, {
      ...session,
      difficulty: session.difficulty ?? "hard",
    });
  });
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(Array.from(unique.values())));
}

export function getSession(id: string): Session | null {
  return getSessions().find((s) => s.id === id) ?? null;
}

export function deleteSession(id: string): void {
  const filtered = getSessions().filter((s) => s.id !== id);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
}

export function getSessionSummaries(): SessionSummary[] {
  return getSessions()
    .filter((s) => s.endTime && s.grade)
    .map((s) => ({
      id: s.id,
      materialTitle: s.materialTitle,
      startTime: s.startTime,
      endTime: s.endTime!,
      overallGrade: s.grade!.overallGrade,
      overallScore: s.grade!.overallScore,
      messageCount: s.messages.length,
      difficulty: s.difficulty ?? "hard",
    }))
    .sort((a, b) => b.startTime - a.startTime);
}

export function setCurrentSessionId(id: string): void {
  sessionStorage.setItem(CURRENT_ID_KEY, id);
}

export function getCurrentSessionId(): string | null {
  return sessionStorage.getItem(CURRENT_ID_KEY);
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
