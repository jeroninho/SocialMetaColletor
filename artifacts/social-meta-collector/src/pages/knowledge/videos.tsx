import { useState } from "react";
import { Play, Clock, X } from "lucide-react";
import { videos } from "@/data/videos";
import { useTheme } from "@/context/theme";

const PURPLE = "#6C63FF";

const categoryColors: Record<string, string> = {
  "OAuth 2.0": "#6C63FF",
  "APIs Sociais": "#FF6F91",
  "Segurança": "#F59E0B",
  "Boas Práticas": "#4CAF50",
};

export default function VideosPage() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { theme } = useTheme();
  const dark = theme === "dark";

  const categories = ["all", ...Array.from(new Set(videos.map((v) => v.category)))];
  const filtered = activeCategory === "all"
    ? videos
    : videos.filter((v) => v.category === activeCategory);

  const selectedVideo = videos.find((v) => v.id === activeVideo);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl font-bold tracking-tight mb-2"
          style={{ fontFamily: "var(--app-font-heading)" }}
        >
          Tutoriais em Vídeo
        </h1>
        <p className="text-sm" style={{ color: dark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)" }}>
          Assista tutoriais práticos sobre APIs sociais, OAuth e segurança.
        </p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: isActive ? PURPLE : dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                color: isActive ? "#fff" : dark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
              }}
            >
              {cat === "all" ? "Todos" : cat}
            </button>
          );
        })}
      </div>

      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-2xl overflow-hidden"
            style={{ backgroundColor: dark ? "#1a1a2e" : "#fff" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
            >
              <X size={16} className="text-white" />
            </button>
            <div className="aspect-video">
              <iframe
                src={selectedVideo.embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={selectedVideo.title}
              />
            </div>
            <div className="p-5">
              <h3 className="font-bold text-lg mb-1" style={{ fontFamily: "var(--app-font-heading)" }}>
                {selectedVideo.title}
              </h3>
              <p className="text-sm" style={{ color: dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>
                {selectedVideo.description}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((video) => {
          const catColor = categoryColors[video.category] || PURPLE;
          return (
            <button
              key={video.id}
              onClick={() => setActiveVideo(video.id)}
              className="text-left rounded-2xl overflow-hidden transition-all hover:scale-[1.02] group"
              style={{
                backgroundColor: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                border: `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              }}
            >
              <div
                className="aspect-video relative flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, ${catColor}22, ${catColor}08)`,
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                  style={{
                    backgroundColor: `${catColor}25`,
                    boxShadow: `0 0 30px ${catColor}20`,
                  }}
                >
                  <Play size={24} fill={catColor} style={{ color: catColor, marginLeft: 2 }} />
                </div>
                <span
                  className="absolute bottom-3 right-3 text-[11px] font-semibold px-2 py-0.5 rounded-md"
                  style={{ backgroundColor: "rgba(0,0,0,0.7)", color: "#fff" }}
                >
                  {video.duration}
                </span>
              </div>
              <div className="p-4">
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 inline-block"
                  style={{
                    backgroundColor: `${catColor}18`,
                    color: catColor,
                  }}
                >
                  {video.category}
                </span>
                <h3
                  className="font-semibold text-sm mb-1 tracking-tight"
                  style={{ fontFamily: "var(--app-font-heading)" }}
                >
                  {video.title}
                </h3>
                <p className="text-xs line-clamp-2" style={{ color: dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
                  {video.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
