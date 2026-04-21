import { useState, useEffect } from "react";
import { fetchImagesFresh, fetchVideos } from "../api/mediaApi";

// ── Skeleton placeholder card ─────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-slate-100 animate-pulse">
      <div className="h-28 bg-slate-200" />
      <div className="p-2 space-y-1.5">
        <div className="h-2.5 bg-slate-200 rounded w-3/4" />
        <div className="h-2 bg-slate-200 rounded w-1/2" />
      </div>
    </div>
  );
}

// ── Image card ────────────────────────────────────────────────────────────────
function ImageCard({ item }) {
  const [errored, setErrored] = useState(false);
  return (
    <a
      href={item.source || item.url}
      target="_blank"
      rel="noreferrer"
      className="group rounded-xl overflow-hidden border border-slate-200 hover:border-[#695be6]/40 hover:shadow-md transition-all block"
    >
      {errored ? (
        <div className="h-28 bg-slate-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-300 text-3xl">broken_image</span>
        </div>
      ) : (
        <div className="h-28 overflow-hidden bg-slate-100">
          <img
            src={item.thumbnail || item.url}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setErrored(true)}
          />
        </div>
      )}
      <div className="p-2">
        <p className="text-[11px] text-slate-600 font-medium line-clamp-2 leading-tight">{item.title || "Image"}</p>
      </div>
    </a>
  );
}

// ── Video card ────────────────────────────────────────────────────────────────
function VideoCard({ item }) {
  const [thumbErr, setThumbErr] = useState(false);
  const fallbackThumb = `https://img.youtube.com/vi/${item.video_id}/hqdefault.jpg`;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group rounded-xl overflow-hidden border border-slate-200 hover:border-[#695be6]/40 hover:shadow-md transition-all block"
    >
      <div className="relative h-28 overflow-hidden bg-slate-100">
        <img
          src={thumbErr ? fallbackThumb : item.thumbnail}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={() => setThumbErr(true)}
        />
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
          <div className="size-9 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
          </div>
        </div>
      </div>
      <div className="p-2">
        <p className="text-[11px] text-slate-700 font-semibold line-clamp-2 leading-tight">{item.title}</p>
        {item.channel && (
          <p className="text-[10px] text-slate-400 mt-0.5 truncate">{item.channel}</p>
        )}
        {item.views > 0 && (
          <p className="text-[10px] text-slate-400">
            {item.views >= 1_000_000
              ? `${(item.views / 1_000_000).toFixed(1)}M views`
              : item.views >= 1_000
              ? `${(item.views / 1_000).toFixed(0)}K views`
              : `${item.views} views`}
          </p>
        )}
      </div>
    </a>
  );
}

// ── Main MediaPanel ───────────────────────────────────────────────────────────
/**
 * Tabbed media panel showing images and videos for a given query.
 *
 * Props:
 *   query   {string}   - search phrase
 *   grade   {string}   - e.g. "Grade 9"
 *   board   {string}   - e.g. "CBSE"
 *   onClose {function} - called when the close button is clicked
 */
export default function MediaPanel({ query, grade = "", board = "CBSE", defaultTab = "images", onClose }) {
  const [tab, setTab]         = useState(defaultTab);
  const [images, setImages]   = useState([]);
  const [videos, setVideos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchImagesFresh(query, grade, board),
      fetchVideos(query, grade, board),
    ])
      .then(([imgs, vids]) => {
        setImages(imgs || []);
        setVideos(vids || []);
      })
      .catch((err) => {
        console.error("MediaPanel fetch error:", err);
        setError("Could not load media. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [query, grade, board]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    Promise.all([fetchImagesFresh(query, grade, board), fetchVideos(query, grade, board)])
      .then(([imgs, vids]) => { setImages(imgs || []); setVideos(vids || []); })
      .catch(() => setError("Could not load media. Please try again."))
      .finally(() => setLoading(false));
  };

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <div>
          <p className="text-sm font-bold text-slate-800">Media for "{query}"</p>
          <p className="text-[10px] text-slate-400">{board} · {grade || "All grades"}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close media panel"
          >
            <span className="material-symbols-outlined text-slate-500 text-lg">close</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 shrink-0">
        {[
          { id: "images", label: "Images", icon: "image" },
          { id: "videos", label: "Videos", icon: "play_circle" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              tab === t.id
                ? "border-[#695be6] text-[#695be6]"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-sm">{t.icon}</span>
            {t.label}
            {!loading && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                tab === t.id ? "bg-[#695be6]/10 text-[#695be6]" : "bg-slate-100 text-slate-500"
              }`}>
                {t.id === "images" ? images.length : videos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: "thin" }}>
        {error ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <span className="material-symbols-outlined text-slate-300 text-4xl">wifi_off</span>
            <p className="text-sm text-slate-500">{error}</p>
            <button
              onClick={handleRetry}
              className="text-xs font-bold text-[#695be6] hover:underline"
            >
              Try again
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : tab === "images" ? (
          images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-10">
              <span className="material-symbols-outlined text-slate-300 text-4xl">image_not_supported</span>
              <p className="text-sm text-slate-400">No images found for this topic.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, i) => <ImageCard key={i} item={img} />)}
            </div>
          )
        ) : (
          videos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-10">
              <span className="material-symbols-outlined text-slate-300 text-4xl">videocam_off</span>
              <p className="text-sm text-slate-400">No videos found for this topic.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {videos.map((vid, i) => <VideoCard key={i} item={vid} />)}
            </div>
          )
        )}
      </div>

      {/* Footer attribution */}
      {!loading && !error && (
        <div className="px-4 py-2 border-t border-slate-100 shrink-0">
          <p className="text-[10px] text-slate-400 text-center">
            Images via DuckDuckGo · Videos via YouTube · Results cached 30 days
          </p>
        </div>
      )}
    </div>
  );
}
