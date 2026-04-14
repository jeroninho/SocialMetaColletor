import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, ExternalLink } from "lucide-react";
import { glossaryTerms } from "@/data/glossary";
import { useTheme } from "@/context/theme";

const PURPLE = "#6C63FF";

export default function GlossaryPage() {
  const [search, setSearch] = useState("");
  const { theme } = useTheme();
  const dark = theme === "dark";

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return glossaryTerms;
    return glossaryTerms.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        t.definition.toLowerCase().includes(q)
    );
  }, [search]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof glossaryTerms> = {};
    for (const term of filtered) {
      const letter = term.term[0].toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(term);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const allLetters = useMemo(() => {
    const letters = new Set(glossaryTerms.map((t) => t.term[0].toUpperCase()));
    return Array.from(letters).sort();
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--app-font-heading)" }}
        >
          Glossário
        </h1>
        <p className="text-sm" style={{ color: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)" }}>
          Termos técnicos explicados de forma clara e objetiva.
        </p>
      </div>

      <div
        className="relative mb-6"
      >
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }}
        />
        <input
          type="text"
          placeholder="Buscar termos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
          style={{
            backgroundColor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
            color: dark ? "#fff" : "#1E2A38",
          }}
        />
      </div>

      <div className="flex gap-1 mb-6 flex-wrap">
        {allLetters.map((letter) => {
          const hasResults = grouped.some(([l]) => l === letter);
          return (
            <button
              key={letter}
              onClick={() => {
                const el = document.getElementById(`letter-${letter}`);
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
              style={{
                backgroundColor: hasResults
                  ? dark ? "rgba(108,99,255,0.12)" : "rgba(108,99,255,0.08)"
                  : dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                color: hasResults
                  ? PURPLE
                  : dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
                cursor: hasResults ? "pointer" : "default",
              }}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {grouped.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
            Nenhum termo encontrado para "{search}".
          </p>
        </div>
      )}

      <div className="space-y-8">
        {grouped.map(([letter, terms]) => (
          <div key={letter} id={`letter-${letter}`}>
            <div className="flex items-center gap-3 mb-3">
              <span
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: `${PURPLE}18`, color: PURPLE }}
              >
                {letter}
              </span>
              <div
                className="flex-1 h-px"
                style={{ backgroundColor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}
              />
            </div>

            <div className="space-y-3">
              {terms.map((term) => (
                <div
                  key={term.term}
                  className="p-4 rounded-xl transition-all"
                  style={{
                    backgroundColor: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.015)",
                    border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                  }}
                >
                  <h3
                    className="font-semibold text-sm mb-1.5 tracking-tight"
                    style={{ fontFamily: "var(--app-font-heading)", color: dark ? "#fff" : "#1E2A38" }}
                  >
                    {term.term}
                  </h3>
                  <p className="text-sm leading-relaxed mb-2" style={{ color: dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>
                    {term.definition}
                  </p>
                  {term.relatedLink && (
                    <Link href={term.relatedLink.href}>
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                        style={{ color: PURPLE }}
                      >
                        <ExternalLink size={12} />
                        {term.relatedLink.label}
                      </span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
