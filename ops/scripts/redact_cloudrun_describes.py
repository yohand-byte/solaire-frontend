#!/usr/bin/env python3
import argparse, glob, json, os, re, sys
from typing import Any, Dict, List, Tuple

SENSITIVE_NAME_RE = re.compile(r"(KEY|TOKEN|SECRET|PASSWORD|PRIVATE|BEARER|AUTH)", re.I)

DEFAULT_EXPLICIT = {
  "API_KEY",
  "API_PROXY_TOKEN",
  "FIREBASE_WEB_API_KEY",
  "ADMIN_API_KEY",
  "GOOGLE_API_KEY",
  "API_TOKEN",
  "FIREBASE_CONFIG",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "MISTRAL_API_KEY",
}

def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path: str, obj: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2, ensure_ascii=False)
        f.write("\n")

def iter_env_entries(obj: Dict[str, Any]) -> List[Dict[str, Any]]:
    containers = (
        obj.get("spec", {})
           .get("template", {})
           .get("spec", {})
           .get("containers", [])
    )
    if not isinstance(containers, list):
        return []
    out: List[Dict[str, Any]] = []
    for c in containers:
        if not isinstance(c, dict):
            continue
        env = c.get("env", [])
        if not isinstance(env, list):
            continue
        for e in env:
            if isinstance(e, dict):
                out.append(e)
    return out

def redact_file(path: str, explicit: set) -> Tuple[bool, List[Tuple[str, str]]]:
    try:
        d = load_json(path)
    except Exception:
        return (False, [])

    if not isinstance(d, dict):
        return (False, [])

    before = json.dumps(d, sort_keys=True, ensure_ascii=False)
    hits: List[Tuple[str, str]] = []
    changed = False

    for e in iter_env_entries(d):
        name = str(e.get("name", "") or "")
        if not name:
            continue
        if "value" not in e:
            continue
        val = e.get("value", None)
        if val in (None, "", "REDACTED"):
            continue

        if (name in explicit) or SENSITIVE_NAME_RE.search(name):
            e["value"] = "REDACTED"
            changed = True
            hits.append((path, name))

    after = json.dumps(d, sort_keys=True, ensure_ascii=False)
    if changed and before != after:
        save_json(path, d)
        return (True, hits)

    return (False, [])

def main() -> int:
    ap = argparse.ArgumentParser(description="Redact env.value in Cloud Run describe snapshots (ops/snapshots/**/run/*/describes/*.json).")
    ap.add_argument("--root", default="ops/snapshots", help="Root folder that contains snapshots (default: ops/snapshots).")
    ap.add_argument("--snapshot", default="", help="Snapshot date folder (e.g. 2026-01-18). If empty, scan all snapshots under root.")
    ap.add_argument("--dry-run", action="store_true", help="Do not modify files; only report.")
    ap.add_argument("--explicit", default="", help="Comma-separated extra explicit env var names to redact.")
    args = ap.parse_args()

    explicit = set(DEFAULT_EXPLICIT)
    if args.explicit.strip():
        explicit |= {x.strip() for x in args.explicit.split(",") if x.strip()}

    if args.snapshot.strip():
        base = os.path.join(args.root, args.snapshot.strip(), "run")
    else:
        base = os.path.join(args.root, "*", "run")

    pattern = os.path.join(base, "*", "describes", "*.json")
    files = sorted(glob.glob(pattern))
    if not files:
        print(f"No files found for pattern: {pattern}")
        return 0

    total_files = 0
    changed_files = 0
    hit_count = 0
    hit_samples: List[Tuple[str, str]] = []

    for p in files:
        total_files += 1
        if args.dry_run:
            try:
                d = load_json(p)
            except Exception:
                continue
            if not isinstance(d, dict):
                continue
            for e in iter_env_entries(d):
                name = str(e.get("name", "") or "")
                if not name or "value" not in e:
                    continue
                val = e.get("value", None)
                if val in (None, "", "REDACTED"):
                    continue
                if (name in explicit) or SENSITIVE_NAME_RE.search(name):
                    hit_count += 1
                    if len(hit_samples) < 200:
                        hit_samples.append((p, name))
            continue

        changed, hits = redact_file(p, explicit)
        if changed:
            changed_files += 1
            hit_count += len(hits)
            if len(hit_samples) < 200:
                hit_samples.extend(hits[: max(0, 200 - len(hit_samples))])

    print(f"files_scanned={total_files}")
    print(f"files_changed={changed_files}" if not args.dry_run else "files_changed=0 (dry-run)")
    print(f"redacted_values={hit_count}")
    for path, name in hit_samples[:200]:
        print(f"{path}\t{name}")

    return 0

if __name__ == "__main__":
    raise SystemExit(main())
