export type Difficulty = "hard" | "medium" | "easy";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  materialTitle: string;
  materialContent: string;
  difficulty: Difficulty;
  messages: Message[];
  startTime: number;
  endTime?: number;
  grade?: Grade;
  rankEvent?: RankEvent;
}

export interface Grade {
  vocabularyScore: number;
  grammarScore: number;
  comprehensionScore: number;
  overallScore: number;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  strengths: string[];
  improvements: string[];
  studyAreas: string[];
  difficultyNotes?: string;
  nextPracticePlan?: string[];
  rankFeedback?: string;
  referenceLevel?: string;
}

export interface SessionSummary {
  id: string;
  materialTitle: string;
  startTime: number;
  endTime: number;
  overallGrade: string;
  overallScore: number;
  messageCount: number;
  difficulty: Difficulty;
  eloChange?: number;
  eloAfter?: number;
}

export interface RankEvent {
  eloBefore: number;
  eloAfter: number;
  eloChange: number;
  rankBefore: string;
  rankAfter: string;
}
