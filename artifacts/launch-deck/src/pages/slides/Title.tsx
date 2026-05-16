export default function Title() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-paper text-ink">
      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <div className="flex items-center gap-[1vw]">
          <div className="w-[1.6vw] h-[1.6vw] rounded-full bg-ink" />
          <span className="eyebrow text-[1.05vw] text-ink/80">SocialMetaCollector</span>
        </div>
        <span className="eyebrow text-[1.05vw] text-muted">Launch Deck · 2026</span>
      </div>

      <div className="absolute top-[6vh] left-[6vw] right-[6vw] h-px bg-ink/15 mt-[3.5vh]" />

      <div className="absolute left-[6vw] right-[6vw] top-[30vh]">
        <span className="eyebrow text-[1.1vw] text-accent">Issue No. 01 — A new release</span>
        <h1 className="mt-[3vh] font-display font-normal tracking-[-0.04em] text-[10.5vw] leading-[0.92] text-ink" style={{ textWrap: "balance" }}>
          Five platforms.
          <span className="block italic text-ink/85">One quiet desk.</span>
        </h1>
      </div>

      <div className="absolute left-[6vw] right-[40vw] bottom-[8vh]">
        <p className="font-body text-[1.65vw] leading-[1.45] text-ink/75" style={{ textWrap: "pretty" }}>
          An editorial workspace for collecting, comparing and reporting on
          YouTube, Instagram, Facebook, TikTok and X — without juggling six dashboards.
        </p>
      </div>

      <div className="absolute right-[6vw] bottom-[8vh] text-right">
        <div className="eyebrow text-[0.95vw] text-muted">Volume I</div>
        <div className="font-display text-[2.2vw] text-ink mt-[0.6vh]">v1.0</div>
      </div>
    </div>
  );
}
