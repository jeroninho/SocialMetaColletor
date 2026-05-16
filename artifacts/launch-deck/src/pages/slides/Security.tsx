export default function Security() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-ink text-paper">
      <div className="absolute top-[6vh] left-[6vw] right-[6vw] flex items-baseline justify-between">
        <span className="eyebrow text-[1vw] text-paper/55">06 · Trust</span>
        <span className="eyebrow text-[1vw] text-paper/55">Security &amp; OAuth</span>
      </div>
      <div className="absolute top-[10.5vh] left-[6vw] right-[6vw] h-px bg-paper/15" />

      <div className="absolute left-[6vw] top-[15vh] w-[46vw]">
        <h2 className="font-display font-normal tracking-[-0.035em] text-[5.8vw] leading-[0.98]" style={{ textWrap: "balance" }}>
          Your tokens never leave
          <span className="block italic text-paper/85">your perimeter.</span>
        </h2>
        <p className="mt-[4vh] font-body text-[1.55vw] leading-[1.55] text-paper/75 max-w-[40vw]" style={{ textWrap: "pretty" }}>
          Server-side OAuth 2.0 for all five platforms. Access and refresh
          tokens are encrypted with AES-256-GCM before they touch the database,
          and the session layer rides JWT over short, rotating expiries.
        </p>
      </div>

      <div className="absolute right-[6vw] top-[15vh] bottom-[8vh] w-[36vw] border border-paper/20">
        <div className="px-[1.6vw] py-[2vh] border-b border-paper/15 flex items-baseline justify-between">
          <span className="eyebrow text-[0.85vw] text-paper/55">Token lifecycle</span>
          <span className="font-mono text-[0.95vw] text-paper/55">tokens table</span>
        </div>
        <div className="px-[1.6vw] py-[2.6vh] border-b border-paper/10">
          <div className="font-mono text-[1vw] text-paper/55">01</div>
          <div className="font-display text-[1.95vw] mt-[0.6vh]">OAuth 2.0 redirect</div>
          <div className="font-body text-[1.15vw] text-paper/70 mt-[0.6vh]">Server-side code exchange — no tokens in the browser.</div>
        </div>
        <div className="px-[1.6vw] py-[2.6vh] border-b border-paper/10">
          <div className="font-mono text-[1vw] text-paper/55">02</div>
          <div className="font-display text-[1.95vw] mt-[0.6vh]">AES-256-GCM at rest</div>
          <div className="font-body text-[1.15vw] text-paper/70 mt-[0.6vh]">encryptToken() wraps every access &amp; refresh value.</div>
        </div>
        <div className="px-[1.6vw] py-[2.6vh]">
          <div className="font-mono text-[1vw] text-paper/55">03</div>
          <div className="font-display text-[1.95vw] mt-[0.6vh]">JWT sessions, short TTL</div>
          <div className="font-body text-[1.15vw] text-paper/70 mt-[0.6vh]">Bearer middleware, configurable expiry, bcrypt-hashed users.</div>
        </div>
      </div>
    </div>
  );
}
