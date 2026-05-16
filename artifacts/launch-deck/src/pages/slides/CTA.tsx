export default function CTA() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-paper text-ink">
      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <div className="flex items-center gap-[1vw]">
          <div className="w-[1.6vw] h-[1.6vw] rounded-full bg-ink" />
          <span className="eyebrow text-[1.05vw] text-ink/80">SocialMetaCollector</span>
        </div>
        <span className="eyebrow text-[1.05vw] text-muted">07 · Next</span>
      </div>
      <div className="absolute top-[10.5vh] left-[6vw] right-[6vw] h-px bg-ink/15" />

      <div className="absolute left-[6vw] right-[6vw] top-[24vh]">
        <span className="eyebrow text-[1.05vw] text-accent">Take it for a walk</span>
        <h2 className="mt-[3vh] font-display font-normal tracking-[-0.04em] text-[8.4vw] leading-[0.94]" style={{ textWrap: "balance" }}>
          Connect one account.
          <span className="block italic text-ink/85">See the rest follow.</span>
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[6vw] bottom-[10vh] grid grid-cols-3 gap-[3vw] items-end">
        <div>
          <div className="eyebrow text-[0.9vw] text-muted">Step 01</div>
          <div className="mt-[1vh] font-display text-[1.9vw] text-ink leading-tight">Sign in</div>
          <div className="mt-[0.8vh] font-body text-[1.25vw] text-ink/65">Create a workspace, invite the team.</div>
        </div>
        <div>
          <div className="eyebrow text-[0.9vw] text-muted">Step 02</div>
          <div className="mt-[1vh] font-display text-[1.9vw] text-ink leading-tight">Connect a platform</div>
          <div className="mt-[0.8vh] font-body text-[1.25vw] text-ink/65">One OAuth round-trip per account.</div>
        </div>
        <div>
          <div className="eyebrow text-[0.9vw] text-muted">Step 03</div>
          <div className="mt-[1vh] font-display text-[1.9vw] text-ink leading-tight">Read the room</div>
          <div className="mt-[0.8vh] font-body text-[1.25vw] text-ink/65">Dashboard, comparator, alerts — already lit.</div>
        </div>
      </div>

      <div className="absolute right-[6vw] top-[16vh] text-right">
        <div className="font-display text-[2vw] text-ink leading-tight">socialmetacollector.app</div>
        <div className="eyebrow text-[0.9vw] text-muted mt-[0.6vh]">Volume I · v1.0 · 2026</div>
      </div>
    </div>
  );
}
