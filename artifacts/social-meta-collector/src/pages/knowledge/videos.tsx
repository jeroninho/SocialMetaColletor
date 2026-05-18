import { useState } from "react";
import { Play, X } from "lucide-react";
import { videos } from "@/data/videos";

export default function VideosPage() {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const categories = ["all", ...Array.from(new Set(videos.map((v) => v.category)))];
  const filtered = activeCategory === "all"
    ? videos
    : videos.filter((v) => v.category === activeCategory);

  const selectedVideo = videos.find((v) => v.id === activeVideo);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl font-semibold tracking-tight mb-2"
          style={{ fontFamily: "var(--app-font-heading)" }}
        >
          Tutoriais em Vídeo
        </h1>
        <p className="text-sm text-muted-foreground">
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
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
                isActive
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "all" ? "Todos" : cat}
            </button>
          );
        })}
      </div>

      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/90"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative w-full max-w-4xl rounded-md overflow-hidden bg-card border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-foreground text-background"
            >
              <X size={16} />
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
              <h3
                className="font-semibold text-lg mb-1"
                style={{ fontFamily: "var(--app-font-heading)" }}
              >
                {selectedVideo.title}
              </h3>
              <p className="text-sm text-muted-foreground">{selectedVideo.description}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((video) => (
          <button
            key={video.id}
            onClick={() => setActiveVideo(video.id)}
            className="text-left rounded-md overflow-hidden transition-colors hover:bg-muted/40 group border border-border bg-card"
          >
            <div className="aspect-video relative flex items-center justify-center bg-muted">
              <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 bg-background border border-border">
                <Play size={22} className="text-foreground" style={{ marginLeft: 2 }} />
              </div>
              <span className="absolute bottom-3 right-3 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-foreground text-background">
                {video.duration}
              </span>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full mb-2 inline-block bg-muted text-muted-foreground uppercase tracking-wider">
                {video.category}
              </span>
              <h3
                className="font-semibold text-sm mb-1 tracking-tight text-foreground"
                style={{ fontFamily: "var(--app-font-heading)" }}
              >
                {video.title}
              </h3>
              <p className="text-xs line-clamp-2 text-muted-foreground">{video.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
