import { useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

const KEY = "sf_theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export function getInitialTheme(): Theme {
  const saved = (localStorage.getItem(KEY) || "").toLowerCase();
  if (saved === "dark" || saved === "light") return saved as Theme;
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const isDark = useMemo(() => theme === "dark", [theme]);

  return {
    theme,
    isDark,
    setTheme,
    toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
  };
}
