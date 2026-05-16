export default function Frictions() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-paper text-ink">
      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-baseline justify-between">
        <span className="eyebrow text-[1vw] text-muted">02 · The brief</span>
        <span className="eyebrow text-[1vw] text-muted">Frictions removed</span>
      </div>
      <div className="absolute top-[10.5vh] left-[6vw] right-[6vw] h-px bg-ink/15" />

      <div className="absolute left-[6vw] right-[6vw] top-[15vh]">
        <h2 className="font-display font-normal tracking-[-0.035em] text-[6vw] leading-[0.98]" style={{ textWrap: "balance" }}>
          Three things our team
          <span className="block italic text-ink/85">stopped doing.</span>
        </h2>
      </div>

      <div className="absolute left-[6vw] right-[6vw] bottom-[9vh] grid grid-cols-3 gap-[3vw]">
        <div>
          <div className="font-display text-[5vw] leading-none text-accent">01</div>
          <div className="mt-[2.5vh] h-px bg-ink/20" />
          <h3 className="mt-[2vh] font-display text-[2.2vw] leading-[1.05] text-ink" style={{ textWrap: "balance" }}>
            Tab-switching across five logins.
          </h3>
          <p className="mt-[1.5vh] font-body text-[1.4vw] leading-[1.5] text-ink/70">
            One OAuth flow, one screen, one set of numbers.
          </p>
        </div>

        <div>
          <div className="font-display text-[5vw] leading-none text-accent">02</div>
          <div className="mt-[2.5vh] h-px bg-ink/20" />
          <h3 className="mt-[2vh] font-display text-[2.2vw] leading-[1.05] text-ink" style={{ textWrap: "balance" }}>
            Hand-built CSVs every Monday.
          </h3>
          <p className="mt-[1.5vh] font-body text-[1.4vw] leading-[1.5] text-ink/70">
            Reports export to PDF and CSV in two clicks.
          </p>
        </div>

        <div>
          <div className="font-display text-[5vw] leading-none text-accent">03</div>
          <div className="mt-[2.5vh] h-px bg-ink/20" />
          <h3 className="mt-[2vh] font-display text-[2.2vw] leading-[1.05] text-ink" style={{ textWrap: "balance" }}>
            Missing the moment a post breaks out.
          </h3>
          <p className="mt-[1.5vh] font-body text-[1.4vw] leading-[1.5] text-ink/70">
            Threshold alerts to Slack or email, on autopilot.
          </p>
        </div>
      </div>
    </div>
  );
}
