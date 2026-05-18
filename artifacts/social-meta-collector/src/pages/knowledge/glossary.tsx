import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Search, ExternalLink } from "lucide-react";
import { glossaryTerms } from "@/data/glossary";

export default function GlossaryPage() {
  const [search, setSearch] = useState("");

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
          className="text-2xl font-semibold tracking-tight mb-2"
          style={{ fontFamily: "var(--app-font-heading)" }}
        >
          Glossário
        </h1>
        <p className="text-sm text-muted-foreground">
          Termos técnicos explicados de forma clara e objetiva.
        </p>
      </div>

      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          placeholder="Buscar termos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-md text-sm outline-none border border-border bg-background text-foreground focus:border-foreground/40 transition-colors"
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
              disabled={!hasResults}
              className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-bold transition-colors ${
                hasResults
                  ? "bg-muted text-foreground hover:bg-foreground hover:text-background cursor-pointer"
                  : "bg-transparent text-muted-foreground/40 cursor-default"
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {grouped.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">
            Nenhum termo encontrado para "{search}".
          </p>
        </div>
      )}

      <div className="space-y-8">
        {grouped.map(([letter, terms]) => (
          <div key={letter} id={`letter-${letter}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold bg-foreground text-background">
                {letter}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div className="space-y-3">
              {terms.map((term) => (
                <div
                  key={term.term}
                  className="p-4 rounded-md border border-border bg-card"
                >
                  <h3
                    className="font-semibold text-sm mb-1.5 tracking-tight text-foreground"
                    style={{ fontFamily: "var(--app-font-heading)" }}
                  >
                    {term.term}
                  </h3>
                  <p className="text-sm leading-relaxed mb-2 text-muted-foreground">
                    {term.definition}
                  </p>
                  {term.relatedLink && (
                    <Link href={term.relatedLink.href}>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:underline">
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
