import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "light" | "dark";
type Density = "comfortable" | "compact";
type FontScale = "sm" | "md" | "lg";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  density: Density;
  setDensity: (d: Density) => void;
  fontScale: FontScale;
  setFontScale: (f: FontScale) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const FONT_SCALE_PX: Record<FontScale, string> = {
  sm: "14px",
  md: "16px",
  lg: "18px",
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [density, setDensityState] = useState<Density>(() => {
    if (typeof window === "undefined") return "comfortable";
    return (localStorage.getItem("density") as Density) || "comfortable";
  });

  const [fontScale, setFontScaleState] = useState<FontScale>(() => {
    if (typeof window === "undefined") return "md";
    return (localStorage.getItem("fontScale") as FontScale) || "md";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.density = density;
    localStorage.setItem("density", density);
  }, [density]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = FONT_SCALE_PX[fontScale];
    localStorage.setItem("fontScale", fontScale);
  }, [fontScale]);

  const toggleTheme = () => setThemeState((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme: setThemeState,
        density,
        setDensity: setDensityState,
        fontScale,
        setFontScale: setFontScaleState,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};