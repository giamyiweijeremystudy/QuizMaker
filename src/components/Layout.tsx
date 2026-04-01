import { Outlet, Link } from "react-router-dom";
import { GraduationCap, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

export function Layout() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" || 
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans transition-colors duration-300">
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <GraduationCap className="w-8 h-8 text-blue-600" />
            <span>QuizMaker</span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link to="/?enterKey=true" className="text-sm font-medium hover:text-blue-600 transition-colors">
              Enter Quiz Key
            </Link>
            <Link to="/create" className="text-sm font-medium hover:text-blue-600 transition-colors">
              Create Quiz
            </Link>
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-8 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
          &copy; 2026 QuizMaker. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
