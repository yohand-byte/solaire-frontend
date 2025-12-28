import { useEffect, useMemo, useState } from "react";

function getInitialTheme() {
  const saved = localStorage.getItem("sf_theme");
  if (saved === "light" || saved === "dark") return saved;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
  return prefersDark ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">(() => getInitialTheme());
  const isDark = theme === "dark";

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "light" ? "light" : "dark";
    localStorage.setItem("sf_theme", theme);
  }, [theme]);

  const label = useMemo(() => (isDark ? "Mode clair" : "Mode sombre"), [isDark]);

  return (
    <button
      type="button"
      className="btn btn-pill"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      aria-label={label}
      title={label}
    >
      <span className="btn-dot" aria-hidden="true" />
      {label}
    </button>
  );
}
