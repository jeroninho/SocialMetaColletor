import React from "react";
import { Link } from "wouter";
import { BarChart2, ArrowRight } from "lucide-react";

const PETROLEUM = "#1E2A38";
const BLUE      = "#4F6BF4";

const platforms = ["YouTube", "Instagram", "Facebook", "TikTok"];

export default function LandingPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: PETROLEUM,
      display: "flex",
      flexDirection: "column",
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`
        .lp-cta:hover { background: #3D59E8 !important; }
        .lp-login:hover { color: white !important; }
        @media (max-width: 600px) {
          .lp-headline { font-size: clamp(28px, 8vw, 44px) !important; }
        }
      `}</style>

      {/* Navbar */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 clamp(24px, 6vw, 80px)",
        height: 60,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 6,
            background: BLUE,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <BarChart2 size={15} color="white" />
          </div>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 16, fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "white",
          }}>
            MetaCollector
          </span>
        </div>

        <Link href="/login">
          <span className="lp-login" style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontFamily: "'Inter', sans-serif",
            fontSize: 14, fontWeight: 500,
            color: "rgba(255,255,255,0.55)",
            cursor: "pointer", textDecoration: "none",
            transition: "color 0.15s",
          }}>
            Entrar <ArrowRight size={13} />
          </span>
        </Link>
      </nav>

      {/* Hero */}
      <main style={{
        flex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center",
        padding: "48px clamp(24px, 8vw, 120px) 80px",
      }}>
        <h1
          className="lp-headline"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "clamp(36px, 5.5vw, 62px)",
            fontWeight: 700,
            color: "white",
            letterSpacing: "-0.04em",
            lineHeight: 1.1,
            maxWidth: 720,
            marginBottom: 20,
          }}
        >
          Suas métricas sociais,<br />
          <span style={{ color: BLUE }}>num só lugar.</span>
        </h1>

        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "clamp(15px, 1.8vw, 17px)",
          color: "rgba(255,255,255,0.48)",
          lineHeight: 1.65,
          maxWidth: 440,
          marginBottom: 40,
        }}>
          YouTube, Instagram, Facebook e TikTok — centralizados, seguros e automatizados.
        </p>

        <Link href="/login">
          <span className="lp-cta" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "13px 28px", borderRadius: 6,
            background: BLUE,
            color: "white",
            fontFamily: "'Inter', sans-serif",
            fontSize: 15, fontWeight: 600,
            cursor: "pointer", textDecoration: "none",
            transition: "background 0.15s",
          }}>
            Entrar no painel <ArrowRight size={15} />
          </span>
        </Link>

        {/* Platform strip */}
        <div style={{
          display: "flex", alignItems: "center", gap: 24,
          marginTop: 64, flexWrap: "wrap", justifyContent: "center",
        }}>
          {platforms.map((p, i) => (
            <React.Fragment key={p}>
              {i > 0 && (
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "inline-block" }} />
              )}
              <span style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13, fontWeight: 500,
                color: "rgba(255,255,255,0.30)",
                letterSpacing: "0.01em",
              }}>
                {p}
              </span>
            </React.Fragment>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px clamp(24px, 6vw, 80px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0, flexWrap: "wrap", gap: 12,
      }}>
        <span style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 13, fontWeight: 600,
          color: "rgba(255,255,255,0.22)",
        }}>
          MetaCollector
        </span>
        <span style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 13,
          color: "rgba(255,255,255,0.18)",
        }}>
          © 2026
        </span>
        <Link href="/login">
          <span style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13, color: BLUE,
            cursor: "pointer", textDecoration: "none",
          }}>
            Acessar painel
          </span>
        </Link>
      </footer>
    </div>
  );
}
