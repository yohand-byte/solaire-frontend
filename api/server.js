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
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN,
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-ADMIN-KEY"],
  })
);

app.post("/api/leads", async (req, res) => {
  try {
    const { email, name, company, phone, cguAccepted } = req.body || {};
    if (!email) return res.status(400).json({ error: "email required" });
    const ref = await db.collection("leads").add({
      email,
      name: name || "",
      company: company || "",
      phone: phone || "",
      cguAccepted: !!cguAccepted,
      status: "new",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ ok: true, id: ref.id });
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

    await db.collection("leads").doc(leadId).update({
      status: "approved",
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
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
    await ref.update({
      status: "rejected",
      rejectReason: reason || "",
      rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`API running on :${PORT}`));
