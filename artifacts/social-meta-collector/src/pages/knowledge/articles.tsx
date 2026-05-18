import { useState } from "react";
import { Link } from "wouter";
import { BookOpen, Clock, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { articles, categoryLabels } from "@/data/articles";

export function ArticleDetailPage({ articleId }: { articleId: string }) {
  const article = articles.find((a) => a.id === articleId);

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <p className="text-sm text-muted-foreground">Artigo não encontrado.</p>
        <Link href="/articles">
          <span className="inline-flex items-center gap-2 mt-4 text-sm font-medium text-foreground hover:underline">
            <ArrowLeft size={16} /> Voltar aos artigos
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/articles">
        <span className="flex items-center gap-2 text-sm font-medium mb-6 cursor-pointer text-foreground hover:underline">
          <ArrowLeft size={16} />
          Voltar aos artigos
        </span>
      </Link>

      <div className="mb-6">
        <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3 bg-muted text-muted-foreground">
          {categoryLabels[article.category]}
        </span>
        <h1
          className="text-3xl font-semibold tracking-tight mb-3"
          style={{ fontFamily: "var(--app-font-heading)" }}
        >
          {article.title}
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock size={14} />
          <span>{article.readTime} de leitura</span>
        </div>
      </div>

      <article
        className="prose prose-sm max-w-none text-foreground"
        style={{ fontFamily: "var(--app-font-body, 'Inter', sans-serif)" }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({ children }) => (
              <h2
                className="text-xl font-semibold mt-8 mb-4 tracking-tight text-foreground"
                style={{ fontFamily: "var(--app-font-heading)" }}
              >
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3
                className="text-lg font-semibold mt-6 mb-3 tracking-tight text-foreground"
                style={{ fontFamily: "var(--app-font-heading)" }}
              >
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-4 leading-relaxed text-sm text-muted-foreground">{children}</p>
            ),
            strong: ({ children }) => (
              <strong className="text-foreground font-semibold">{children}</strong>
            ),
            ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1.5">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1.5">{children}</ol>,
            li: ({ children }) => <li className="text-sm text-muted-foreground">{children}</li>,
            table: ({ children }) => (
              <div className="overflow-x-auto my-4 rounded-md border border-border">
                <table className="w-full text-sm">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
            th: ({ children }) => (
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2.5 text-sm border-t border-border text-muted-foreground">
                {children}
              </td>
            ),
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || "");
              const inline = !match;
              if (inline) {
                return (
                  <code
                    className="px-1.5 py-0.5 rounded text-xs font-mono bg-muted text-foreground"
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
                  customStyle={{ borderRadius: 8, fontSize: 13, margin: "16px 0" }}
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

  const categories = ["all", ...Object.keys(categoryLabels)];
  const filtered = activeCategory === "all"
    ? articles
    : articles.filter((a) => a.category === activeCategory);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl font-semibold tracking-tight mb-2"
          style={{ fontFamily: "var(--app-font-heading)" }}
        >
          Artigos Técnicos
        </h1>
        <p className="text-sm text-muted-foreground">
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
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4">
        {filtered.map((article) => (
          <Link key={article.id} href={`/articles/${article.id}`}>
            <div className="text-left p-5 rounded-md border border-border bg-card transition-colors hover:bg-muted/40 cursor-pointer">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
                      {categoryLabels[article.category]}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock size={11} /> {article.readTime}
                    </span>
                  </div>
                  <h3
                    className="font-semibold text-base mb-1.5 tracking-tight text-foreground"
                    style={{ fontFamily: "var(--app-font-heading)" }}
                  >
                    {article.title}
                  </h3>
                  <p className="text-sm line-clamp-2 text-muted-foreground">
                    {article.description}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 mt-1 bg-muted">
                  <BookOpen size={18} className="text-foreground" />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
