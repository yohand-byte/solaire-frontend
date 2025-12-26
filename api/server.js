import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";

dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();
const auth = admin.auth();

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
    await ref.set({ ...payload, createdAt: now });
    return ref;
  }
  await snap.ref.set(payload, { merge: true });
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
    await ref.set({
      ...payload,
      clientId,
      status: "en_cours",
      source: "landing",
      createdAt: now,
    });
    return ref;
  }
  const ref = existingSnap.docs[0].ref;
  await ref.set(payload, { merge: true });
  return ref;
};

// CORS: Autoriser Firebase Hosting + localhost dev
const allowedOrigins = [
  "https://solaire-frontend.web.app",
  "https://solaire-frontend.firebaseapp.com",
  "https://solaire-frontend-828508661560.europe-west1.run.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn("CORS blocked:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-ADMIN-KEY", "X-Requested-With"],
  credentials: true,
};

const requireAdminKey = (req, res, next) => {
  const key = req.header("X-ADMIN-KEY");
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
};

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(cors(corsOptions));
app.use((req, _res, next) => {
  if (req.path.startsWith("/api/admin/leads")) {
    console.log("HIT", req.method, req.path);
  }
  next();
});

app.post(["/api/leads","/leads"], async (req, res) => {
  try {
    const { email, name, company, phone, cguAccepted, source, pack, packCode, packLabel, packPrice, price } = req.body || {};
    if (!email) return res.status(400).json({ error: "email required" });
    const now = admin.firestore?.FieldValue?.serverTimestamp?.() || Date.now();
    const normalizedSource = source === "landing" ? "landing" : "api";
    const resolvedPack = pack || packCode || packLabel || "";
    const resolvedPackPrice = packPrice ?? price;
    const clientRef = await upsertClient({
      email,
      phone,
      company,
      pack: resolvedPack,
      packCode: packCode || resolvedPack,
      packLabel,
      packPrice: resolvedPackPrice,
    });
    const clientId = clientRef.id;
    await upsertFileForClient({
      clientId,
      clientEmail: normalizeEmail(email),
      pack: resolvedPack,
      packCode: packCode || resolvedPack,
      packLabel,
      packPrice: resolvedPackPrice,
    });
    const ref = await db.collection("leads").add({
      email,
      name: name || "",
      company: company || "",
      phone: phone || "",
      cguAccepted: !!cguAccepted,
      status: "new",
      source: normalizedSource,
      clientId,
      pack: resolvedPack || "",
      packCode: packCode || resolvedPack || "",
      packLabel: packLabel || "",
      packPrice: resolvedPackPrice ?? "",
      createdAt: now,
    });
    res.json({ ok: true, id: ref.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/admin/leads", requireAdminKey, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status || undefined;
    const email = req.query.email || undefined;

    let q = db.collection("leads").orderBy("createdAt", "desc");
    if (status) {
      q = q.where("status", "==", status);
    }
    if (email) {
      q = q.where("email", ">=", email).where("email", "<=", email + "\uf8ff");
    }

    const snap = await q.offset(offset).limit(limit).get();
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    let total = null;
    try {
      const aggregate = await q.count().get();
      total = aggregate.data().count || 0;
    } catch (_err) {
      total = null;
    }

    res.json({ ok: true, total, limit, offset, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/approve-lead", requireAdminKey, async (req, res) => {
  try {
    const { leadId, installerId, role = "installer" } = req.body || {};
    if (!leadId || !installerId) return res.status(400).json({ error: "leadId and installerId required" });
    const snap = await db.collection("leads").doc(leadId).get();
    if (!snap.exists) return res.status(404).json({ error: "lead not found" });
    const lead = snap.data();
    const email = lead?.email;
    if (!email) return res.status(400).json({ error: "lead missing email" });

    let user;
    try {
      user = await auth.getUserByEmail(email);
    } catch {
      user = await auth.createUser({ email, displayName: lead.name || "", emailVerified: false });
    }

    await auth.setCustomUserClaims(user.uid, { role, installerId });

    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    const continueUrl = process.env.CONTINUE_URL;
    if (!apiKey || !continueUrl) return res.status(500).json({ error: "Missing FIREBASE_WEB_API_KEY or CONTINUE_URL" });

    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: "EMAIL_SIGNIN",
        email,
        continueUrl,
        canHandleCodeInApp: true,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      return res.status(502).json({ error: body?.error?.message || "sendOobCode failed" });
    }

    const approvedAt = admin.firestore?.FieldValue?.serverTimestamp?.() || Date.now();
    await db.collection("leads").doc(leadId).update({
      status: "approved",
      approvedAt,
      authUid: user.uid,
      role,
      installerId,
    });

    res.json({ ok: true, email, uid: user.uid, role, installerId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/reject-lead", requireAdminKey, async (req, res) => {
  try {
    const { leadId, reason } = req.body || {};
    if (!leadId) return res.status(400).json({ error: "leadId required" });
    const ref = db.collection("leads").doc(leadId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ error: "lead not found" });
    const rejectedAt = admin.firestore?.FieldValue?.serverTimestamp?.() || Date.now();
    await ref.update({
      status: "rejected",
      rejectReason: reason || "",
      rejectedAt,
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback JSON 404 for missing /api routes (avoid HTML responses)
app.use("/api", (_req, res) => res.status(404).json({ error: "not_found" }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API running on :${PORT}`));
