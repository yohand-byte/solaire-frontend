const args = process.argv.slice(2);

const inputUrl = args[0] || process.env.E2E_MAGIC_LINK_URL;
if (!inputUrl) {
  console.error("Missing URL. Provide as arg or E2E_MAGIC_LINK_URL.");
  process.exit(1);
}

const allowedFinalHosts = (process.env.E2E_ALLOWED_FINAL_HOSTS ||
  "solaire-frontend.web.app,solaire-frontend.firebaseapp.com")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const timeoutMs = Number(process.env.E2E_TIMEOUT_MS || 15000);

const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

try {
  const res = await fetch(inputUrl, {
    redirect: "follow",
    signal: controller.signal,
  });

  const finalUrl = res.url || "";
  const finalHost = finalUrl ? new URL(finalUrl).host : "";
  const okHost = finalHost ? allowedFinalHosts.includes(finalHost) : false;

  console.log(
    "[magic-link]",
    JSON.stringify({
      ok: res.ok && okHost,
      status: res.status,
      finalUrl,
      finalHost,
      okHost,
    })
  );

  process.exit(res.ok && okHost ? 0 : 1);
} catch (err) {
  console.error("[magic-link] failed", err?.message || String(err));
  process.exit(1);
} finally {
  clearTimeout(timeoutId);
}
