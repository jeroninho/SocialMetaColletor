import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, Clock, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { articles, categoryLabels } from "@/data/articles";
import { useTheme } from "@/context/theme";

const PURPLE = "#6C63FF";

const categoryColors: Record<string, string> = {
  oauth: "#6C63FF",
  security: "#FF6F91",
  "best-practices": "#4CAF50",
};

export function ArticleDetailPage({ articleId }: { articleId: string }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const article = articles.find((a) => a.id === articleId);

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-sm" style={{ color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
          Artigo não encontrado.
        </p>
        <Link href="/articles">
          <span className="inline-flex items-center gap-2 mt-4 text-sm font-medium" style={{ color: PURPLE }}>
            <ArrowLeft size={16} /> Voltar aos artigos
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/articles">
        <span
          className="flex items-center gap-2 text-sm font-medium mb-6 transition-colors cursor-pointer"
          style={{ color: PURPLE }}
        >
          <ArrowLeft size={16} />
          Voltar aos artigos
        </span>
      </Link>

      <div className="mb-6">
        <span
          className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3"
          style={{
            backgroundColor: `${categoryColors[article.category]}18`,
            color: categoryColors[article.category],
          }}
        >
          {categoryLabels[article.category]}
        </span>
        <h1
          className="text-3xl font-bold tracking-tight mb-3"
          style={{ fontFamily: "var(--app-font-heading)" }}
        >
          {article.title}
        </h1>
        <div className="flex items-center gap-2 text-sm" style={{ color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
          <Clock size={14} />
          <span>{article.readTime} de leitura</span>
        </div>
      </div>

      <article
        className="prose prose-sm max-w-none"
        style={{
          fontFamily: "var(--app-font-body, 'Inter', sans-serif)",
          color: dark ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.85)",
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({ children }) => (
              <h2
                className="text-xl font-bold mt-8 mb-4 tracking-tight"
                style={{ fontFamily: "var(--app-font-heading)", color: dark ? "#fff" : "#1E2A38" }}
              >
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3
                className="text-lg font-semibold mt-6 mb-3 tracking-tight"
                style={{ fontFamily: "var(--app-font-heading)", color: dark ? "#fff" : "#1E2A38" }}
              >
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-4 leading-relaxed text-sm" style={{ color: dark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)" }}>
                {children}
              </p>
            ),
            strong: ({ children }) => (
              <strong style={{ color: dark ? "#fff" : "#1E2A38", fontWeight: 600 }}>{children}</strong>
            ),
            ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1.5">{children}</ol>,
            li: ({ children }) => (
              <li className="text-sm" style={{ color: dark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)" }}>{children}</li>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-4 rounded-lg" style={{ border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}>
                <table className="w-full text-sm">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead style={{ backgroundColor: dark ? "rgba(108,99,255,0.1)" : "rgba(108,99,255,0.06)" }}>{children}</thead>
            ),
            th: ({ children }) => (
              <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={{ color: PURPLE }}>{children}</th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2.5 text-sm" style={{ borderTop: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`, color: dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.65)" }}>{children}</td>
            ),
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || "");
              const inline = !match;
              if (inline) {
                return (
                  <code
                    className="px-1.5 py-0.5 rounded text-xs font-mono"
                    style={{
                      backgroundColor: dark ? "rgba(108,99,255,0.15)" : "rgba(108,99,255,0.1)",
                      color: PURPLE,
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              }
              return (
                <SyntaxHighlighter
                  style={oneDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{ borderRadius: 12, fontSize: 13, margin: "16px 0" }}
                >
                  {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
              );
            },
          }}
        >
          {article.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}

export default function ArticlesPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { theme } = useTheme();
  const dark = theme === "dark";

  const categories = ["all", ...Object.keys(categoryLabels)];
  const filtered = activeCategory === "all"
    ? articles
    : articles.filter((a) => a.category === activeCategory);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--app-font-heading)" }}
        >
          Artigos Técnicos
        </h1>
        <p className="text-sm" style={{ color: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)" }}>
          Aprenda sobre OAuth 2.0, segurança e boas práticas para APIs sociais.
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          const label = cat === "all" ? "Todos" : categoryLabels[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: isActive ? PURPLE : dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                color: isActive ? "#fff" : dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4">
        {filtered.map((article) => (
          <Link key={article.id} href={`/articles/${article.id}`}>
            <div
              className="text-left p-5 rounded-2xl transition-all hover:scale-[1.01] group cursor-pointer"
              style={{
                backgroundColor: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${categoryColors[article.category]}18`,
                        color: categoryColors[article.category],
                      }}
                    >
                      {categoryLabels[article.category]}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)" }}>
                      <Clock size={11} /> {article.readTime}
                    </span>
                  </div>
                  <h3
                    className="font-semibold text-base mb-1.5 tracking-tight"
                    style={{ fontFamily: "var(--app-font-heading)" }}
                  >
                    {article.title}
                  </h3>
                  <p className="text-sm line-clamp-2" style={{ color: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)" }}>
                    {article.description}
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-1 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${categoryColors[article.category]}15` }}
                >
                  <BookOpen size={18} style={{ color: categoryColors[article.category] }} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
