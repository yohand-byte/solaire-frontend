import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firestore";

const functions = getFunctions(app, "europe-west1");

export const callAiSummarizeDossier = httpsCallable<
  { dossierId: string },
  { ok: boolean; disabled?: boolean; summaryId?: string; actionIds?: string[] }
>(functions, "aiSummarizeDossier");

export const callAiNextBestActions = httpsCallable<
  {
    dossierId: string;
    actionUpdate?: { actionId: string; status: "approved" | "rejected" | "done" };
  },
  { ok: boolean; disabled?: boolean; actionIds?: string[]; updated?: string; dossierId?: string }
>(functions, "aiNextBestActions");
