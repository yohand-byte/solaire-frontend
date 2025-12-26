import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const dryRun = process.argv.includes("--dry-run");

const normalizeEmail = (email) => (email || "").trim().toLowerCase();
const normalizePhone = (phone) => String(phone || "").replace(/\D/g, "");

const findClient = async ({ emailLower, phoneNorm }) => {
  const clients = db.collection("clients");
  if (emailLower) {
    const byEmailLower = await clients.where("emailLower", "==", emailLower).limit(1).get();
    if (!byEmailLower.empty) return byEmailLower.docs[0];
    const byEmail = await clients.where("email", "==", emailLower).limit(1).get();
    if (!byEmail.empty) return byEmail.docs[0];
  }
  if (phoneNorm) {
    const byPhoneNorm = await clients.where("phoneNorm", "==", phoneNorm).limit(1).get();
    if (!byPhoneNorm.empty) return byPhoneNorm.docs[0];
    const byPhone = await clients.where("phone", "==", phoneNorm).limit(1).get();
    if (!byPhone.empty) return byPhone.docs[0];
  }
  return null;
};

const upsertClient = async ({ email, phone, company, pack, packCode, packLabel, packPrice }) => {
  const emailLower = normalizeEmail(email);
  const phoneNorm = normalizePhone(phone);
  const snap = await findClient({ emailLower, phoneNorm });
  const now = admin.firestore?.FieldValue?.serverTimestamp?.() || Date.now();
  const payload = {
    ...(email ? { email } : {}),
    ...(emailLower ? { emailLower } : {}),
    ...(phone ? { phone } : {}),
    ...(phoneNorm ? { phoneNorm } : {}),
    ...(company ? { company } : {}),
    ...(pack ? { pack } : {}),
    ...(packCode ? { packCode } : {}),
    ...(packLabel ? { packLabel } : {}),
    ...(packPrice !== undefined ? { packPrice, price: packPrice } : {}),
    updatedAt: now,
  };
  if (!snap) {
    const ref = db.collection("clients").doc();
    if (!dryRun) await ref.set({ ...payload, createdAt: now });
    return ref;
  }
  if (!dryRun) await snap.ref.set(payload, { merge: true });
  return snap.ref;
};

const upsertFileForClient = async ({ clientId, clientEmail, pack, packCode, packLabel, packPrice }) => {
  const hasPackInfo = pack || packCode || packLabel || packPrice !== undefined;
  if (!clientId || !hasPackInfo) return null;
  const now = admin.firestore?.FieldValue?.serverTimestamp?.() || Date.now();
  const files = db.collection("files");
  const existingSnap = await files.where("clientId", "==", clientId).orderBy("createdAt", "desc").limit(1).get();
  const payload = {
    ...(pack ? { pack } : {}),
    ...(packCode ? { packCode } : {}),
    ...(packLabel ? { packLabel } : {}),
    ...(packPrice !== undefined ? { packPrice, price: packPrice } : {}),
    ...(clientEmail ? { clientEmail } : {}),
    updatedAt: now,
  };
  if (existingSnap.empty) {
    const ref = files.doc();
    if (!dryRun) {
      await ref.set({
        ...payload,
        clientId,
        status: "en_cours",
        source: "backfill",
        createdAt: now,
      });
    }
    return ref;
  }
  const ref = existingSnap.docs[0].ref;
  if (!dryRun) await ref.set(payload, { merge: true });
  return ref;
};

let lastDoc = null;
let processed = 0;
let updated = 0;

while (true) {
  let q = db.collection("leads").orderBy("createdAt", "desc").limit(200);
  if (lastDoc) q = q.startAfter(lastDoc);
  const snap = await q.get();
  if (snap.empty) break;
  for (const doc of snap.docs) {
    processed += 1;
    const lead = doc.data() || {};
    if (lead.clientId) continue;
    const emailLower = normalizeEmail(lead.email);
    const phoneNorm = normalizePhone(lead.phone || lead.telephone || lead.téléphone);
    const resolvedPack = lead.pack || lead.packCode || lead.packLabel || "";
    const resolvedPackPrice = lead.packPrice ?? lead.price;
    const clientRef = await upsertClient({
      email: lead.email || "",
      phone: lead.phone || lead.telephone || lead.téléphone || "",
      company: lead.company || "",
      pack: resolvedPack,
      packCode: lead.packCode || resolvedPack,
      packLabel: lead.packLabel || "",
      packPrice: resolvedPackPrice,
    });
    await upsertFileForClient({
      clientId: clientRef.id,
      clientEmail: emailLower,
      pack: resolvedPack,
      packCode: lead.packCode || resolvedPack,
      packLabel: lead.packLabel || "",
      packPrice: resolvedPackPrice,
    });
    if (!dryRun) {
      await doc.ref.set(
        {
          clientId: clientRef.id,
          pack: resolvedPack || "",
          packCode: lead.packCode || resolvedPack || "",
          packLabel: lead.packLabel || "",
          packPrice: resolvedPackPrice ?? "",
          updatedAt: admin.firestore?.FieldValue?.serverTimestamp?.() || Date.now(),
        },
        { merge: true },
      );
    }
    updated += 1;
  }
  lastDoc = snap.docs[snap.docs.length - 1];
}

console.log(`Backfill done. processed=${processed} updated=${updated} dryRun=${dryRun}`);
