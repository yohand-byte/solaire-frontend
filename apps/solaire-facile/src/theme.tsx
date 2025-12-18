import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme, manual?: boolean) => void;
  toggle: () => void;
};

const THEME_KEY = "sf_theme_preference";

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  setTheme: () => {},
  toggle: () => {},
});

type Props = { children: React.ReactNode };

function fallbackSunset(): Date {
  const date = new Date();
  date.setHours(19, 30, 0, 0);
  return date;
}

async function computeAutoTheme(): Promise<Theme> {
  const now = new Date();
  const fallback = fallbackSunset();

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return now >= fallback ? "dark" : "light";
  }

  const geoPosition = await new Promise<GeolocationPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { timeout: 3000, enableHighAccuracy: false }
    );
  });

  if (!geoPosition) {
    return now >= fallback ? "dark" : "light";
  }

  const { latitude, longitude } = geoPosition.coords;
  try {
    const response = await fetch(
      `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`
    );
    const data = await response.json();
    const sunsetRaw = data?.results?.sunset;
    if (sunsetRaw) {
      const sunset = new Date(sunsetRaw);
      return now >= sunset ? "dark" : "light";
    }
  } catch (err) {
    console.error("sunset calc", err);
  }

  return now >= fallback ? "dark" : "light";
}

export function ThemeProvider({ children }: Props) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [userChoice, setUserChoice] = useState<Theme | null>(null);

  const applyTheme = (next: Theme, manual?: boolean) => {
    setThemeState(next);
    if (manual) {
      setUserChoice(next);
      localStorage.setItem(THEME_KEY, next);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") {
      applyTheme(stored, true);
      return;
    }

    computeAutoTheme().then((autoTheme) => {
      // Only apply if user hasn't manually picked during async
      if (!userChoice) {
        applyTheme(autoTheme);
      }
    });
  }, [userChoice]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.setProperty("color-scheme", theme);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next: Theme, manual = false) => applyTheme(next, manual),
      toggle: () => applyTheme(theme === "light" ? "dark" : "light", true),
    }),
    [theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label =
    theme === "light" ? "Mode sombre" : "Mode clair";

  return (
    <button
      className="btn btn-ghost theme-toggle"
      type="button"
      onClick={toggle}
      aria-label="Changer de thème"
    >
      <span className="status-dot" />
      {label}
    </button>
  );
}
