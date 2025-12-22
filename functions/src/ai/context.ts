import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue, Firestore, Timestamp } from "firebase-admin/firestore";
import crypto from "node:crypto";

export type RequestIdentity = { uid: string; claims: Record<string, any> };

export interface DossierContext {
  dossierId: string;
  collection: string;
  dossier: Record<string, any>;
  client: Record<string, any> | null;
  jalons: Record<string, any>;
  activities: Array<{ at: string; action: string }>;
  messages: string[];
  ragPassages: string[];
  metadata: {
    clientId: string | null;
    installerId: string | null;
  };
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "object" && typeof value.toDate === "function") return value.toDate();
  if (typeof value === "object" && typeof value.seconds === "number") return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value: any): string | null => {
  const d = toDate(value);
  return d ? d.toISOString() : null;
};

const truncate = (value: string, max = 1800) => (value.length > max ? `${value.slice(0, max)} …` : value);

const stringify = (value: any, max = 2000) => truncate(JSON.stringify(value ?? null, null, 2), max);

const isAdminClaim = (claims: Record<string, any>) => claims?.admin === true || claims?.role === "admin";
const claimInstallerId = (claims: Record<string, any>) => claims?.installerId || claims?.installer_id || claims?.installer;
const claimClientId = (claims: Record<string, any>) => claims?.client_id || claims?.clientId || null;

const pickClientId = (data: Record<string, any>) =>
  data.client_id || data.clientId || data.clientID || data.client || null;

const pickInstallerId = (data: Record<string, any>) =>
  data.installerId || data.installer_id || data.installer || null;

const buildJalons = (data: Record<string, any>) => ({
  mairie: data.mairieStatus ?? data.steps?.dp_mairie ?? null,
  consuel: data.consuelStatus ?? data.steps?.consuel ?? null,
  enedis: data.enedisStatus ?? data.steps?.enedis ?? null,
  edf: data.edfStatus ?? data.steps?.edf_oa ?? null,
  nextAction: data.nextAction ?? null,
  nextActionDate: formatDate(data.nextActionDate) ?? null,
});

const collectActivities = (data: Record<string, any>) => {
  const now = Date.now();
  const timelines = [
    ...(Array.isArray(data.timeline) ? data.timeline : []),
    ...(Array.isArray(data.history) ? data.history : []),
    ...(Array.isArray(data.events) ? data.events : []),
  ];
  return timelines
    .map((entry: any) => {
      const at = toDate(entry.date || entry.at || entry.created_at || entry.updated_at);
      const label = entry.action || entry.label || entry.status || entry.title || "";
      return { at, label, raw: entry };
    })
    .filter((e) => e.at && now - e.at.getTime() <= THIRTY_DAYS_MS)
    .sort((a, b) => (b.at?.getTime() || 0) - (a.at?.getTime() || 0))
    .slice(0, 10)
    .map((entry) => ({
      at: entry.at?.toISOString() || "",
      action: entry.label || truncate(stringify(entry.raw), 120),
    }));
};

const collectMessages = (data: Record<string, any>) => {
  const notes = Array.isArray(data.notes) ? data.notes : [];
  return notes
    .map((n: any) => n.text || n.note || n.message)
    .filter(Boolean)
    .map((s: string) => truncate(String(s), 240))
    .slice(0, 10);
};

const assertAccess = (
  identity: RequestIdentity,
  meta: { clientId: string | null; installerId: string | null }
) => {
  const admin = isAdminClaim(identity.claims);
  if (admin) return;
  const installerClaim = claimInstallerId(identity.claims);
  if (meta.installerId && installerClaim && installerClaim === meta.installerId) return;
  const clientClaim = claimClientId(identity.claims);
  if (meta.clientId && (identity.uid === meta.clientId || clientClaim === meta.clientId)) return;
  if (!meta.clientId && !meta.installerId) {
    throw new HttpsError("permission-denied", "Accès limité aux admins/installateurs (owner manquant).");
  }
  throw new HttpsError("permission-denied", "Accès au dossier refusé pour cet utilisateur.");
};

export async function loadDossierContext(
  db: Firestore,
  dossierId: string,
  identity: RequestIdentity
): Promise<DossierContext> {
  const dossierRef = db.collection("dossiers").doc(dossierId);
  const dossierSnap = await dossierRef.get();
  let collection = "dossiers";
  let data = dossierSnap.data();
  if (!data) {
    const fallbackRef = db.collection("files").doc(dossierId);
    const fbSnap = await fallbackRef.get();
    collection = "files";
    data = fbSnap.data();
  }
  if (!data) {
    throw new HttpsError("not-found", `Dossier ${dossierId} introuvable`);
  }

  const rawClientId = pickClientId(data);
  const rawInstallerId = pickInstallerId(data);
  const clientId = typeof rawClientId === "string" ? rawClientId : null;
  const installerId = typeof rawInstallerId === "string" ? rawInstallerId : null;
  assertAccess(identity, { clientId, installerId });

  let client: Record<string, any> | null = null;
  if (clientId) {
    const clientSnap = await db.collection("clients").doc(clientId).get();
    client = clientSnap.exists ? clientSnap.data() || null : null;
  }

  return {
    dossierId,
    collection,
    dossier: data,
    client,
    jalons: buildJalons(data),
    activities: collectActivities(data),
    messages: collectMessages(data),
    ragPassages: [],
    metadata: {
      clientId: clientId ?? null,
      installerId: installerId ?? null,
    },
  };
}

export function buildSummaryPrompt(
  context: DossierContext,
  responseTemplate: string
): string {
  return [
    "Contexte dossier (source Firestore) :",
    `• dossier: ${stringify(context.dossier)}`,
    `• client: ${stringify(context.client)}`,
    `• jalons: ${stringify(context.jalons)}`,
    `• activités 30j: ${stringify(context.activities)}`,
    `• messages clés: ${stringify(context.messages)}`,
    `• passages pertinents (RAG): ${stringify(context.ragPassages)}`,
    responseTemplate.trim(),
  ].join("\n");
}

export function buildActionsPrompt(
  context: DossierContext,
  responseTemplate: string
): string {
  return [
    "Contexte dossier (source Firestore) :",
    `• dossier: ${stringify(context.dossier)}`,
    `• client: ${stringify(context.client)}`,
    `• jalons: ${stringify(context.jalons)}`,
    `• activités 30j: ${stringify(context.activities)}`,
    `• messages clés: ${stringify(context.messages)}`,
    `• passages pertinents (RAG): ${stringify(context.ragPassages)}`,
    responseTemplate.trim(),
  ].join("\n");
}

export const hashText = (input: string) =>
  crypto.createHash("sha256").update(input).digest("hex");

export async function logAiEvent(
  db: Firestore,
  log: {
    tool: string;
    promptHash?: string | null;
    latencyMs?: number | null;
    inputTokens?: number | null;
    outputTokens?: number | null;
    metadata?: Record<string, any>;
  }
) {
  const safeMetadata = log.metadata ? JSON.parse(JSON.stringify(log.metadata)) : {};
  await db.collection("ai_logs").add({
    tool: log.tool,
    promptHash: log.promptHash ?? null,
    latencyMs: log.latencyMs ?? null,
    inputTokens: log.inputTokens ?? null,
    outputTokens: log.outputTokens ?? null,
    metadata: safeMetadata,
    createdAt: FieldValue.serverTimestamp(),
  });
}
