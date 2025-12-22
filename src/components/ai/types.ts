import type { Timestamp } from "firebase/firestore";

export type AiRisk = {
  label: string;
  evidence: string;
  severity: "low" | "medium" | "high";
};

export type AiAction = {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected" | "done" | string;
  createdAt?: Timestamp;
  approvedAt?: Timestamp | null;
};

export type AiSummary = {
  id: string;
  summary: string;
  confidence: number;
  risks: AiRisk[];
  createdAt?: Timestamp;
  source?: string;
};
