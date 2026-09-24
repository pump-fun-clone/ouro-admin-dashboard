import { useState } from "react";

import { persistTheme, readStoredTheme, resolveTheme, toggleTheme, type Theme } from "../lib/theme";

export function ThemeToggle({ className = "btn ghost sm" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const resolved = resolveTheme(readStoredTheme());
    persistTheme(resolved);
    return resolved;
  });

  return (
    <button
      type="button"
      className={className}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      onClick={() => setTheme((t) => toggleTheme(t))}
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
