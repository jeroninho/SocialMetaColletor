export default function ComparatorShot() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-paper text-ink">
      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-baseline justify-between">
        <span className="eyebrow text-[1vw] text-muted">05 · Screenshot</span>
        <span className="eyebrow text-[1vw] text-muted">Comparator &amp; alerts</span>
      </div>
      <div className="absolute top-[10.5vh] left-[6vw] right-[6vw] h-px bg-ink/15" />

      <div className="absolute left-[6vw] top-[14vh] bottom-[8vh] w-[44vw] bg-cream border border-ink/15">
        <div className="px-[1.4vw] py-[1.8vh] border-b border-ink/15 flex items-baseline justify-between">
          <span className="font-display text-[1.7vw] text-ink">Campaign comparator</span>
          <span className="font-mono text-[0.9vw] text-ink/55">Apr 14 → May 14</span>
        </div>
        <div className="px-[1.4vw] py-[2vh]">
          <div className="flex items-end gap-[0.9vw] h-[26vh]">
            <div className="flex-1 flex flex-col items-center gap-[0.6vh]">
              <div className="w-full bg-ink" style={{ height: "62%" }} />
              <div className="font-mono text-[0.85vw] text-ink/65">YT</div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-[0.6vh]">
              <div className="w-full bg-ink/80" style={{ height: "78%" }} />
              <div className="font-mono text-[0.85vw] text-ink/65">IG</div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-[0.6vh]">
              <div className="w-full bg-ink/60" style={{ height: "44%" }} />
              <div className="font-mono text-[0.85vw] text-ink/65">FB</div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-[0.6vh]">
              <div className="w-full bg-accent" style={{ height: "92%" }} />
              <div className="font-mono text-[0.85vw] text-ink/65">TT</div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-[0.6vh]">
              <div className="w-full bg-ink/45" style={{ height: "36%" }} />
              <div className="font-mono text-[0.85vw] text-ink/65">X</div>
            </div>
          </div>
          <div className="mt-[2vh] grid grid-cols-3 gap-[1vw] border-t border-ink/15 pt-[1.6vh]">
            <div>
              <div className="eyebrow text-[0.72vw] text-muted">Top platform</div>
              <div className="font-display text-[1.55vw] text-ink mt-[0.4vh]">TikTok</div>
            </div>
            <div>
              <div className="eyebrow text-[0.72vw] text-muted">Lift vs prior</div>
              <div className="font-display text-[1.55vw] text-ink mt-[0.4vh] tabular-nums">+34.1%</div>
            </div>
            <div>
              <div className="eyebrow text-[0.72vw] text-muted">Spread</div>
              <div className="font-display text-[1.55vw] text-ink mt-[0.4vh] tabular-nums">2.6×</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute right-[6vw] top-[14vh] bottom-[8vh] w-[42vw] bg-cream border border-ink/15">
        <div className="px-[1.4vw] py-[1.8vh] border-b border-ink/15 flex items-baseline justify-between">
          <span className="font-display text-[1.7vw] text-ink">Smart alerts</span>
          <span className="font-mono text-[0.9vw] text-ink/55">3 active rules</span>
        </div>

        <div className="px-[1.4vw] py-[2vh] border-b border-ink/10 flex items-center justify-between">
          <div>
            <div className="font-display text-[1.5vw] text-ink">Spike on TikTok views</div>
            <div className="font-body text-[1.05vw] text-ink/60 mt-[0.6vh]">views &gt; 250k in 24h · Slack</div>
          </div>
          <div className="font-mono text-[0.95vw] text-accent">FIRED 2h ago</div>
        </div>
        <div className="px-[1.4vw] py-[2vh] border-b border-ink/10 flex items-center justify-between">
          <div>
            <div className="font-display text-[1.5vw] text-ink">Engagement drop · Instagram</div>
            <div className="font-body text-[1.05vw] text-ink/60 mt-[0.6vh]">rate &lt; 2.0% week-over-week · Email</div>
          </div>
          <div className="font-mono text-[0.95vw] text-ink/55">armed</div>
        </div>
        <div className="px-[1.4vw] py-[2vh] flex items-center justify-between">
          <div>
            <div className="font-display text-[1.5vw] text-ink">New top tweet</div>
            <div className="font-body text-[1.05vw] text-ink/60 mt-[0.6vh]">impressions &gt; 100k · Slack</div>
          </div>
          <div className="font-mono text-[0.95vw] text-ink/55">armed</div>
        </div>
      </div>
    </div>
  );
}
