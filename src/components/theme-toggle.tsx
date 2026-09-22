"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

export function ThemeToggle({ className }: { className?: string }) {
  // Le thème réel dépend de localStorage/de l'OS, indisponibles côté serveur
  // — le premier rendu client doit rester identique au rendu serveur (rien),
  // sinon React déclenche un mismatch d'hydratation qui régénère tout
  // l'arbre. On affiche un espace réservé jusqu'au montage, puis on lit la
  // vraie valeur dans l'effet (seul endroit sûr pour ce genre de lecture).
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    const initial = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lecture client-only (localStorage/OS), impossible avant le montage
    setTheme(initial);
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.dataset.theme = next;
  };

  const resolvedClassName = className ?? "flex items-center justify-center rounded-lg border border-line p-1.5 text-muted";

  if (!mounted) return <span className={resolvedClassName} aria-hidden="true" />;

  return (
    <button onClick={toggle} title={theme === "dark" ? "Passer en mode jour" : "Passer en mode nuit"} className={resolvedClassName}>
      {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}
