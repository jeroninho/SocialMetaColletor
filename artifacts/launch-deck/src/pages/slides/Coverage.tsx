export default function Coverage() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-paper text-ink">
      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-baseline justify-between">
        <span className="eyebrow text-[1vw] text-muted">03 · Coverage</span>
        <span className="eyebrow text-[1vw] text-muted">Five connected platforms</span>
      </div>
      <div className="absolute top-[10.5vh] left-[6vw] right-[6vw] h-px bg-ink/15" />

      <div className="absolute left-[6vw] top-[15vh] w-[44vw]">
        <h2 className="font-display font-normal tracking-[-0.035em] text-[5.6vw] leading-[1]" style={{ textWrap: "balance" }}>
          Every channel
          <span className="block italic text-ink/85">that matters.</span>
        </h2>
        <p className="mt-[4vh] font-body text-[1.55vw] leading-[1.5] text-ink/75 max-w-[36vw]" style={{ textWrap: "pretty" }}>
          Profile, content list and analytics endpoints for each platform,
          normalised into a single schema so dashboards, comparator and
          alerts all speak the same language.
        </p>

        <div className="mt-[5vh] flex items-center gap-[1.2vw]">
          <span className="font-display text-[4.2vw] leading-none text-accent">5</span>
          <div className="font-body text-[1.2vw] leading-[1.3] text-ink/70">
            platforms unified<br/>under one schema
          </div>
        </div>
      </div>

      <div className="absolute right-[6vw] top-[16vh] bottom-[8vh] w-[42vw] border border-ink/15 bg-cream">
        <div className="px-[2vw] py-[2.2vh] border-b border-ink/15 flex items-center justify-between">
          <span className="eyebrow text-[0.9vw] text-muted">Connected sources</span>
          <span className="font-mono text-[0.95vw] text-ink/60">/auth/status</span>
        </div>

        <div className="px-[2vw] py-[2.4vh] flex items-baseline justify-between border-b border-ink/10">
          <span className="font-display text-[2.1vw] text-ink">YouTube</span>
          <span className="font-mono text-[1vw] text-ink/55">channel · videos · analytics</span>
        </div>
        <div className="px-[2vw] py-[2.4vh] flex items-baseline justify-between border-b border-ink/10">
          <span className="font-display text-[2.1vw] text-ink">Instagram</span>
          <span className="font-mono text-[1vw] text-ink/55">profile · media · analytics</span>
        </div>
        <div className="px-[2vw] py-[2.4vh] flex items-baseline justify-between border-b border-ink/10">
          <span className="font-display text-[2.1vw] text-ink">Facebook</span>
          <span className="font-mono text-[1vw] text-ink/55">page · posts · analytics</span>
        </div>
        <div className="px-[2vw] py-[2.4vh] flex items-baseline justify-between border-b border-ink/10">
          <span className="font-display text-[2.1vw] text-ink">TikTok</span>
          <span className="font-mono text-[1vw] text-ink/55">profile · videos · analytics</span>
        </div>
        <div className="px-[2vw] py-[2.4vh] flex items-baseline justify-between">
          <span className="font-display text-[2.1vw] text-ink">X / Twitter</span>
          <span className="font-mono text-[1vw] text-ink/55">profile · tweets · analytics</span>
        </div>
      </div>
    </div>
  );
}
