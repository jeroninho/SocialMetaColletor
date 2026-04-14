import { useState, useCallback } from "react";
import { Check, Copy, ChevronRight, ChevronLeft } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { guideSteps } from "@/data/guide-steps";
import type { CodeSnippet } from "@/data/guide-steps";
import { useTheme } from "@/context/theme";

const PURPLE = "#6C63FF";

const langIcons: Record<string, string> = {
  javascript: "JS",
  python: "PY",
  curl: "cURL",
};

const langColors: Record<string, string> = {
  javascript: "#F7DF1E",
  python: "#3776AB",
  curl: "#4CAF50",
};

function CodeBlock({ snippet }: { snippet: CodeSnippet }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [snippet.code]);

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          backgroundColor: copied ? "rgba(74,207,80,0.2)" : "rgba(255,255,255,0.1)",
          color: copied ? "#4CAF50" : "rgba(255,255,255,0.7)",
        }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copiado!" : "Copiar"}
      </button>
      <SyntaxHighlighter
        style={oneDark}
        language={snippet.language === "curl" ? "bash" : snippet.language}
        customStyle={{
          borderRadius: 12,
          fontSize: 13,
          margin: 0,
          paddingTop: 20,
          paddingRight: 100,
        }}
      >
        {snippet.code}
      </SyntaxHighlighter>
    </div>
  );
}

export default function GuidePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [activeLang, setActiveLang] = useState<string>("javascript");
  const { theme } = useTheme();
  const dark = theme === "dark";

  const step = guideSteps[currentStep];
  const activeSnippet = step.snippets.find((s) => s.language === activeLang) || step.snippets[0];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--app-font-heading)" }}
        >
          Guia Interativo
        </h1>
        <p className="text-sm" style={{ color: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)" }}>
          Siga o passo-a-passo para integrar APIs sociais na sua aplicação.
        </p>
      </div>

      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {guideSteps.map((s, i) => {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <button
              key={s.id}
              onClick={() => setCurrentStep(i)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex-shrink-0"
              style={{
                backgroundColor: isActive
                  ? `${PURPLE}20`
                  : isCompleted
                    ? dark ? "rgba(74,207,80,0.1)" : "rgba(74,207,80,0.08)"
                    : dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                border: `1px solid ${isActive ? `${PURPLE}40` : "transparent"}`,
                color: isActive
                  ? PURPLE
                  : isCompleted
                    ? "#4CAF50"
                    : dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
              }}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{
                  backgroundColor: isActive
                    ? PURPLE
                    : isCompleted
                      ? "#4CAF50"
                      : dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                  color: isActive || isCompleted ? "#fff" : dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
                }}
              >
                {isCompleted ? <Check size={12} /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.title}</span>
            </button>
          );
        })}
      </div>

      <div
        className="rounded-2xl p-6 mb-6"
        style={{
          backgroundColor: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
          border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: PURPLE, color: "#fff" }}
          >
            {step.id}
          </span>
          <h2
            className="text-lg font-bold tracking-tight"
            style={{ fontFamily: "var(--app-font-heading)" }}
          >
            {step.title}
          </h2>
        </div>
        <p className="text-sm mb-6 leading-relaxed" style={{ color: dark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.6)" }}>
          {step.description}
        </p>

        <div className="flex gap-1.5 mb-4">
          {step.snippets.map((snippet) => {
            const isActive = snippet.language === activeLang;
            const color = langColors[snippet.language] || PURPLE;
            return (
              <button
                key={snippet.language}
                onClick={() => setActiveLang(snippet.language)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  backgroundColor: isActive ? `${color}20` : dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  color: isActive ? color : dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)",
                  border: `1px solid ${isActive ? `${color}40` : "transparent"}`,
                }}
              >
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
                  style={{
                    backgroundColor: `${color}25`,
                    color: color,
                  }}
                >
                  {langIcons[snippet.language]}
                </span>
                {snippet.label}
              </button>
            );
          })}
        </div>

        <CodeBlock snippet={activeSnippet} />
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-30"
          style={{
            backgroundColor: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
            color: dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
          }}
        >
          <ChevronLeft size={16} />
          Anterior
        </button>

        <span className="text-xs font-medium" style={{ color: dark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.35)" }}>
          Passo {currentStep + 1} de {guideSteps.length}
        </span>

        <button
          onClick={() => setCurrentStep((s) => Math.min(guideSteps.length - 1, s + 1))}
          disabled={currentStep === guideSteps.length - 1}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30"
          style={{
            backgroundColor: PURPLE,
            color: "#fff",
          }}
        >
          Próximo
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
