"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evitar error de hidratación
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full transition-all duration-300 hover:bg-gray-100 dark:hover:bg-slate-800 border border-transparent dark:border-slate-700"
      aria-label="Cambiar tema"
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5 text-yellow-400 fill-yellow-400 animate-in spin-in-180 duration-500" />
      ) : (
        <Moon className="w-5 h-5 text-slate-600 fill-slate-600 animate-in spin-in-180 duration-500" />
      )}
    </button>
  );
}