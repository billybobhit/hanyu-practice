export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Session {
  id: string;
  materialTitle: string;
  materialContent: string;
  messages: Message[];
  startTime: number;
  endTime?: number;
  grade?: Grade;
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
}

export interface SessionSummary {
  id: string;
  materialTitle: string;
  startTime: number;
  endTime: number;
  overallGrade: string;
  overallScore: number;
  messageCount: number;
}
