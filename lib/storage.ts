import type { Session, SessionSummary } from "./types";
import { getProgressFromSessions, getRankEventsForSessions } from "@/lib/ranks";

let currentUserId = "guest";
const CURRENT_ID_KEY = "hanyu_current_id";

export function setStorageUserId(id: string): void {
  currentUserId = id;
}

function getSessionsKey(): string {
  return `hanyu_sessions_${currentUserId}`;
}

export function saveSession(session: Session): void {
  const sessions = getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.push(session);
  }
  localStorage.setItem(getSessionsKey(), JSON.stringify(sessions));
}

export function getSessions(): Session[] {
  try {
    const raw = localStorage.getItem(getSessionsKey());
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
  localStorage.setItem(getSessionsKey(), JSON.stringify(Array.from(unique.values())));
}

export function getSession(id: string): Session | null {
  return getSessions().find((s) => s.id === id) ?? null;
}

export function deleteSession(id: string): void {
  const filtered = getSessions().filter((s) => s.id !== id);
  localStorage.setItem(getSessionsKey(), JSON.stringify(filtered));
}

export function getSessionSummaries(): SessionSummary[] {
  const sessions = getSessions();
  const rankEvents = getRankEventsForSessions(sessions);

  return sessions
    .filter((s) => s.endTime && s.grade)
    .map((s) => {
      const rankEvent = rankEvents.get(s.id);

      return {
        id: s.id,
        materialTitle: s.materialTitle,
        startTime: s.startTime,
        endTime: s.endTime!,
        overallGrade: s.grade!.overallGrade,
        overallScore: s.grade!.overallScore,
        messageCount: s.messages.length,
        difficulty: s.difficulty ?? "hard",
        eloChange: rankEvent?.eloChange,
        eloAfter: rankEvent?.eloAfter,
      };
    })
    .sort((a, b) => b.startTime - a.startTime);
}

export function getUserProgress() {
  return getProgressFromSessions(getSessions());
}

export function getUserProgressForLanguage(languageCode: string) {
  return getProgressFromSessions(
    getSessions().filter((s) => s.languageCode === languageCode)
  );
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
