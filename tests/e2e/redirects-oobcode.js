const args = process.argv.slice(2);

const allowedContinueUrls = (process.env.E2E_ALLOWED_CONTINUE_URLS ||
  "https://solaire-frontend.web.app/client/login,https://solaire-frontend.web.app/admin/login")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

const inputUrls = args.length
  ? args
  : (process.env.E2E_MAGIC_LINK_URLS || "").split(",").map((v) => v.trim()).filter(Boolean);

if (!inputUrls.length) {
  console.error("No URLs provided. Use args or E2E_MAGIC_LINK_URLS.");
  process.exit(1);
}

const results = [];
let hasError = false;

for (const raw of inputUrls) {
  try {
    const url = new URL(raw);
    const mode = url.searchParams.get("mode");
    const oobCode = url.searchParams.get("oobCode");
    const apiKey = url.searchParams.get("apiKey");
    const continueUrl = url.searchParams.get("continueUrl");

    const okMode = !mode || mode === "signIn";
    const okOob = Boolean(oobCode);
    const okApiKey = Boolean(apiKey);
    const okContinue = continueUrl && allowedContinueUrls.includes(continueUrl);

    if (!okMode || !okOob || !okApiKey || !okContinue) {
      hasError = true;
    }

    results.push({
      url: raw,
      okMode,
      okOob,
      okApiKey,
      okContinue,
      continueUrl,
      mode,
    });
  } catch (err) {
    hasError = true;
    results.push({ url: raw, error: err?.message || String(err) });
  }
}

for (const res of results) {
  if (res.error) {
    console.error("[oobcode] invalid url", res.url, res.error);
    continue;
  }
  console.log(
    "[oobcode]",
    res.okMode && res.okOob && res.okApiKey && res.okContinue ? "OK" : "FAIL",
    JSON.stringify({
      url: res.url,
      mode: res.mode,
      continueUrl: res.continueUrl,
      okMode: res.okMode,
      okOob: res.okOob,
      okApiKey: res.okApiKey,
      okContinue: res.okContinue,
    })
  );
}

process.exit(hasError ? 1 : 0);
