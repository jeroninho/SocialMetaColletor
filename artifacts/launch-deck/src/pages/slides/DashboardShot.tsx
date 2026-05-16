export default function DashboardShot() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-cream text-ink">
      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-baseline justify-between">
        <span className="eyebrow text-[1vw] text-muted">04 · Screenshot</span>
        <span className="eyebrow text-[1vw] text-muted">The dashboard</span>
      </div>
      <div className="absolute top-[10.5vh] left-[6vw] right-[6vw] h-px bg-ink/15" />

      <div className="absolute left-[6vw] top-[14vh] w-[28vw]">
        <h2 className="font-display font-normal tracking-[-0.035em] text-[4.6vw] leading-[1]" style={{ textWrap: "balance" }}>
          A calmer
          <span className="block italic text-ink/85">control room.</span>
        </h2>
        <p className="mt-[3vh] font-body text-[1.5vw] leading-[1.5] text-ink/75" style={{ textWrap: "pretty" }}>
          Aggregate reach, engagement and trend lines across every
          connected account — refreshed on the schedule you set.
        </p>
      </div>

      <div className="absolute right-[6vw] top-[14vh] bottom-[8vh] w-[58vw] bg-paper border border-ink/15 shadow-[0_2px_24px_rgba(0,0,0,0.06)]">
        <div className="flex h-full">
          <div className="w-[10vw] border-r border-ink/12 bg-cream/60 px-[1.1vw] py-[2vh]">
            <div className="eyebrow text-[0.75vw] text-muted">Workspace</div>
            <div className="mt-[2vh] font-display text-[1.45vw] text-ink leading-tight">Dashboard</div>
            <div className="mt-[1.4vh] font-body text-[1vw] text-ink/55">YouTube</div>
            <div className="mt-[1.1vh] font-body text-[1vw] text-ink/55">Instagram</div>
            <div className="mt-[1.1vh] font-body text-[1vw] text-ink/55">Facebook</div>
            <div className="mt-[1.1vh] font-body text-[1vw] text-ink/55">TikTok</div>
            <div className="mt-[1.1vh] font-body text-[1vw] text-ink/55">X / Twitter</div>
            <div className="mt-[3vh] h-px bg-ink/15" />
            <div className="mt-[2vh] font-body text-[1vw] text-ink/55">Reports</div>
            <div className="mt-[1.1vh] font-body text-[1vw] text-ink/55">Comparator</div>
            <div className="mt-[1.1vh] font-body text-[1vw] text-ink/55">Alerts</div>
          </div>

          <div className="flex-1 px-[1.6vw] py-[2.4vh]">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="eyebrow text-[0.78vw] text-muted">Last 30 days</div>
                <div className="font-display text-[2.4vw] text-ink leading-tight">Cross-platform summary</div>
              </div>
              <div className="font-mono text-[0.95vw] text-ink/55">May 16, 2026</div>
            </div>

            <div className="mt-[2.4vh] grid grid-cols-4 gap-[1vw]">
              <div className="border border-ink/15 px-[1vw] py-[1.6vh]">
                <div className="eyebrow text-[0.7vw] text-muted">Followers</div>
                <div className="mt-[0.8vh] font-display text-[2vw] text-ink tabular-nums">412.8k</div>
                <div className="font-body text-[0.9vw] text-ink/55">+3.4% vs prior</div>
              </div>
              <div className="border border-ink/15 px-[1vw] py-[1.6vh]">
                <div className="eyebrow text-[0.7vw] text-muted">Impressions</div>
                <div className="mt-[0.8vh] font-display text-[2vw] text-ink tabular-nums">2.41M</div>
                <div className="font-body text-[0.9vw] text-ink/55">+12.6% vs prior</div>
              </div>
              <div className="border border-ink/15 px-[1vw] py-[1.6vh]">
                <div className="eyebrow text-[0.7vw] text-muted">Engagement</div>
                <div className="mt-[0.8vh] font-display text-[2vw] text-ink tabular-nums">4.82%</div>
                <div className="font-body text-[0.9vw] text-ink/55">+0.6 pts</div>
              </div>
              <div className="border border-ink/15 px-[1vw] py-[1.6vh]">
                <div className="eyebrow text-[0.7vw] text-muted">Published</div>
                <div className="mt-[0.8vh] font-display text-[2vw] text-ink tabular-nums">147</div>
                <div className="font-body text-[0.9vw] text-ink/55">38 this week</div>
              </div>
            </div>

            <div className="mt-[2vh] border border-ink/15 px-[1vw] py-[1.6vh]">
              <div className="flex items-baseline justify-between">
                <div className="eyebrow text-[0.78vw] text-muted">Engagement trend</div>
                <div className="font-mono text-[0.8vw] text-ink/50">5 platforms</div>
              </div>
              <svg viewBox="0 0 600 140" className="mt-[1vh] w-full h-[22vh]" preserveAspectRatio="none">
                <path d="M0 110 L60 95 L120 100 L180 78 L240 82 L300 60 L360 64 L420 42 L480 50 L540 30 L600 38" fill="none" stroke="#141414" strokeWidth="2" />
                <path d="M0 120 L60 115 L120 100 L180 105 L240 88 L300 92 L360 78 L420 82 L480 70 L540 74 L600 60" fill="none" stroke="#B23A30" strokeWidth="2" />
                <path d="M0 125 L60 122 L120 118 L180 110 L240 112 L300 100 L360 102 L420 92 L480 95 L540 86 L600 88" fill="none" stroke="#141414" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="4 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
