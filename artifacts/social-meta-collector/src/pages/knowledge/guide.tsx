import { useState, useCallback } from "react";
import { Check, Copy, ChevronRight, ChevronLeft } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { guideSteps } from "@/data/guide-steps";
import type { CodeSnippet } from "@/data/guide-steps";
import { Button } from "@/components/ui/button";

const langIcons: Record<string, string> = {
  javascript: "JS",
  python: "PY",
  curl: "cURL",
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
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-background/80 text-foreground border border-border hover:bg-background"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? "Copiado!" : "Copiar"}
      </button>
      <SyntaxHighlighter
        style={oneDark}
        language={snippet.language === "curl" ? "bash" : snippet.language}
        customStyle={{
          borderRadius: 8,
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

  const step = guideSteps[currentStep];
  const activeSnippet = step.snippets.find((s) => s.language === activeLang) || step.snippets[0];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl font-semibold tracking-tight mb-2"
          style={{ fontFamily: "var(--app-font-heading)" }}
        >
          Guia Interativo
        </h1>
        <p className="text-sm text-muted-foreground">
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
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 border ${
                isActive
                  ? "border-foreground bg-foreground text-background"
                  : isCompleted
                    ? "border-border bg-muted text-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                  isActive
                    ? "bg-background text-foreground"
                    : isCompleted
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check size={12} /> : s.id}
              </span>
              <span className="hidden sm:inline">{s.title}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-md p-6 mb-6 border border-border bg-card">
        <div className="flex items-center gap-3 mb-4">
          <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-foreground text-background">
            {step.id}
          </span>
          <h2
            className="text-lg font-semibold tracking-tight"
            style={{ fontFamily: "var(--app-font-heading)" }}
          >
            {step.title}
          </h2>
        </div>
        <p className="text-sm mb-6 leading-relaxed text-muted-foreground">
          {step.description}
        </p>

        <div className="flex gap-1.5 mb-4">
          {step.snippets.map((snippet) => {
            const isActive = snippet.language === activeLang;
            return (
              <button
                key={snippet.language}
                onClick={() => setActiveLang(snippet.language)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold transition-colors border ${
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold ${
                    isActive ? "bg-background text-foreground" : "bg-muted text-muted-foreground"
                  }`}
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft size={16} className="mr-1" />
          Anterior
        </Button>

        <span className="text-xs font-medium text-muted-foreground">
          Passo {currentStep + 1} de {guideSteps.length}
        </span>

        <Button
          size="sm"
          onClick={() => setCurrentStep((s) => Math.min(guideSteps.length - 1, s + 1))}
          disabled={currentStep === guideSteps.length - 1}
        >
          Próximo
          <ChevronRight size={16} className="ml-1" />
        </Button>
      </div>
    </div>
  );
}
