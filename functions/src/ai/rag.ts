import { FieldValue, Firestore } from "firebase-admin/firestore";
import { Storage } from "firebase-admin/storage";
import { OpenAI } from "openai";
import { hashText, logAiEvent } from "./context.js";

export const chunkText = (text: string, size = 800, overlap = 120) => {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  let index = 0;
  while (index < clean.length) {
    const chunk = clean.slice(index, index + size).trim();
    if (chunk) chunks.push(chunk);
    index += size - overlap;
  }
  return chunks;
};

export async function getRecentChunks(db: Firestore, dossierId: string, limit = 5) {
  const snap = await db
    .collection("ai_chunks")
    .where("dossierId", "==", dossierId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs
    .map((d) => ({
      content: d.get("content") as string | undefined,
      sourcePath: d.get("sourcePath") as string | undefined,
    }))
    .filter((c) => c.content)
    .map((c) => c.content as string);
}

export async function indexFileForRag(params: {
  db: Firestore;
  storage: Storage;
  openai: OpenAI;
  filePath: string;
  bucketName?: string;
  dossierId: string;
  clientId?: string | null;
  installerId?: string | null;
  contentType?: string | null;
  sizeBytes?: number | string | null;
}) {
  const {
    db,
    storage,
    openai,
    filePath,
    bucketName,
    dossierId,
    clientId,
    installerId,
    contentType,
    sizeBytes,
  } = params;

  if (!dossierId) {
    return { skipped: true, reason: "missing dossierId" };
  }

  const parsedSize = typeof sizeBytes === "string" ? parseInt(sizeBytes, 10) : sizeBytes || 0;
  if (parsedSize > 2_500_000) {
    await logAiEvent(db, {
      tool: "indexDossierDoc",
      promptHash: hashText(filePath),
      metadata: { dossierId, sourcePath: filePath, skipped: "file-too-large" },
    });
    return { skipped: true, reason: "file-too-large" };
  }

  const bucket = storage.bucket(bucketName);
  const file = bucket.file(filePath);
  const [buffer] = await file.download();

  let text = "";
  if ((contentType || "").startsWith("text/") || contentType === "application/json") {
    text = buffer.toString("utf8");
  } else {
    const fallback = buffer.toString("utf8");
    if (fallback && /[a-zA-Z0-9]/.test(fallback)) {
      text = fallback;
    }
  }

  if (!text.trim()) {
    await logAiEvent(db, {
      tool: "indexDossierDoc",
      promptHash: hashText(filePath),
      metadata: { dossierId, sourcePath: filePath, skipped: "empty-text" },
    });
    return { skipped: true, reason: "empty-text" };
  }

  const trimmed = text.slice(0, 8000);
  const chunks = chunkText(trimmed).slice(0, 6);
  const createdIds: string[] = [];

  for (const chunk of chunks) {
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunk,
    });
    const embedding = embeddingRes.data?.[0]?.embedding;
    if (!embedding) continue;
    const ref = db.collection("ai_chunks").doc();
    await ref.set({
      dossierId,
      clientId: clientId ?? null,
      installerId: installerId ?? null,
      sourcePath: filePath,
      mimeType: contentType || "text/plain",
      content: chunk,
      embedding,
      tokenCount: chunk.length,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: "indexDossierDoc",
    });
    createdIds.push(ref.id);
  }

  await logAiEvent(db, {
    tool: "indexDossierDoc",
    promptHash: hashText(filePath),
    metadata: { dossierId, sourcePath: filePath, chunks: createdIds.length },
  });

  return { created: createdIds };
}
