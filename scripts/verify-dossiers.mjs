import admin from "firebase-admin";
import { readFileSync } from "node:fs";

function initApp() {
  if (admin.apps.length > 0) return admin.app();
  const pathFromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (pathFromEnv) {
    const saJson = JSON.parse(readFileSync(pathFromEnv, "utf8"));
    console.log("USING_CREDENTIAL", pathFromEnv);
    console.log("PROJECT_ID", saJson.project_id);
    return admin.initializeApp({
      credential: admin.credential.cert(saJson),
      projectId: saJson.project_id,
    });
  }
  const fallbackPath = new URL("../secrets/firebase-admin.json", import.meta.url).pathname;
  const fbJson = JSON.parse(readFileSync(fallbackPath, "utf8"));
  console.log("USING_CREDENTIAL", fallbackPath);
  console.log("PROJECT_ID", fbJson.project_id);
  return admin.initializeApp({
    credential: admin.credential.cert(fbJson),
    projectId: fbJson.project_id,
  });
}

async function main() {
  const app = initApp();
  const db = admin.firestore(app);
  const snap = await db.collection("dossiers").orderBy("createdAt", "desc").limit(20).get();
  const ids = snap.docs.map((d) => d.id);
  console.log("DOC_COUNT", snap.size);
  console.log("DOC_IDS", ids);
  const testIds = ids.filter((id) => id.startsWith("TEST_"));
  if (testIds.length === 0) {
    console.error("MISSING_TEST_DOSSIER TEST_* in last 20 docs");
    process.exit(1);
  }
  console.log("FOUND_TEST", testIds);
}

main().catch((err) => {
  console.error("VERIFY_ERROR", err);
  process.exit(1);
});
