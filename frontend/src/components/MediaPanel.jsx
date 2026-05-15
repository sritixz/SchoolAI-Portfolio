import { useState, useEffect, useRef } from "react";
import { fetchMediaBoth } from "../api/mediaApi";

// ── Skeleton placeholder card ─────────────────────────────────────────────────
function SkeletonCard({ tall }) {
  return (
    <div className="rounded-xl overflow-hidden bg-slate-100 animate-pulse">
      <div className={`${tall ? "h-40" : "h-36"} bg-slate-200`} />
      <div className="p-2.5 space-y-1.5">
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
      className="group rounded-xl overflow-hidden border border-slate-200 hover:border-[#695be6]/50 hover:shadow-lg transition-all block bg-white"
    >
      {errored ? (
        <div className="h-44 bg-slate-100 flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-300 text-4xl">broken_image</span>
        </div>
      ) : (
        <div className="h-44 bg-white flex items-center justify-center overflow-hidden p-1">
          <img
            src={item.thumbnail || item.url}
            alt={item.title}
            className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={() => setErrored(true)}
          />
        </div>
      )}
      <div className="p-2.5 border-t border-slate-100">
        <p className="text-[11px] text-slate-600 font-medium line-clamp-2 leading-tight">{item.title || "Image"}</p>
      </div>
    </a>
  );
}

// ── Video card ────────────────────────────────────────────────────────────────
function VideoCard({ item }) {
  const [thumbSrc, setThumbSrc] = useState(
    item.thumbnail || `https://img.youtube.com/vi/${item.video_id}/hqdefault.jpg`
  );
  const fallbacks = useRef([
    `https://img.youtube.com/vi/${item.video_id}/hqdefault.jpg`,
    `https://img.youtube.com/vi/${item.video_id}/mqdefault.jpg`,
    `https://img.youtube.com/vi/${item.video_id}/default.jpg`,
  ]);
  const fallbackIdx = useRef(0);

  const handleThumbError = () => {
    const next = fallbacks.current[fallbackIdx.current++];
    if (next && next !== thumbSrc) setThumbSrc(next);
  };

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group rounded-xl overflow-hidden border border-slate-200 hover:border-[#695be6]/50 hover:shadow-lg transition-all block bg-white"
    >
      <div className="relative overflow-hidden bg-slate-900" style={{ aspectRatio: "16/9" }}>
        <img
          src={thumbSrc}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
          loading="lazy"
          onError={handleThumbError}
        />
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/10 transition-colors">
          <div className="size-12 rounded-full bg-red-600 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              play_arrow
            </span>
          </div>
        </div>
        {/* YouTube badge */}
        <div className="absolute bottom-2 right-2 bg-black/70 rounded px-1.5 py-0.5 flex items-center gap-1">
          <svg viewBox="0 0 24 24" className="w-3 h-3 fill-red-500"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8z"/><path d="M9.7 15.5V8.5l6.3 3.5-6.3 3.5z" fill="white"/></svg>
          <span className="text-white text-[9px] font-bold">YouTube</span>
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-[12px] text-slate-800 font-semibold line-clamp-2 leading-snug">{item.title}</p>
        <div className="flex items-center justify-between mt-1">
          {item.channel && (
            <p className="text-[10px] text-slate-400 truncate">{item.channel}</p>
          )}
          {item.views > 0 && (
            <p className="text-[10px] text-slate-400 shrink-0 ml-2">
              {item.views >= 1_000_000
                ? `${(item.views / 1_000_000).toFixed(1)}M views`
                : item.views >= 1_000
                ? `${(item.views / 1_000).toFixed(0)}K views`
                : `${item.views} views`}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}

// ── Main MediaPanel ───────────────────────────────────────────────────────────
export default function MediaPanel({ query, grade = "", board = "CBSE", defaultTab = "images", onClose }) {
  const [tab, setTab]           = useState(defaultTab);
  const [images, setImages]     = useState([]);
  const [videos, setVideos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [searchInput, setSearchInput] = useState(query || "");
  const [activeQuery, setActiveQuery] = useState(query || "");
  const searchRef = useRef(null);

  const load = (q, g, b) => {
    if (!q?.trim()) return;
    setLoading(true);
    setError(null);
    fetchMediaBoth(q.trim(), g, b)
      .then(({ images: imgs, videos: vids }) => {
        setImages((imgs || []).slice(0, 6));
        setVideos((vids || []).slice(0, 4));
      })
      .catch((err) => {
        console.error("MediaPanel fetch error:", err);
        setError("Could not load media. Please try again.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!query) return;
    setSearchInput(query);
    setActiveQuery(query);
    load(query, grade, board);
  }, [query, grade, board]);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchInput.trim();
    if (!q || q === activeQuery) return;
    setActiveQuery(q);
    load(q, grade, board);
  };

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#695be6] text-lg">auto_awesome</span>
          <p className="text-sm font-bold text-slate-800">Related Media</p>
          <span className="text-[10px] text-slate-400">{board} · {grade || "All grades"}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors" aria-label="Close">
            <span className="material-symbols-outlined text-slate-500 text-lg">close</span>
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="px-4 py-2.5 border-b border-slate-100 shrink-0 bg-slate-50">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
            <input
              ref={searchRef}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search images & videos..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#695be6]/30 focus:border-[#695be6]/50 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={!searchInput.trim() || loading}
            className="px-3 py-2 bg-[#695be6] text-white text-xs font-bold rounded-lg hover:bg-[#5a4dd4] disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1"
          >
            {loading ? (
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-sm">search</span>
            )}
            Search
          </button>
        </form>
        {activeQuery && activeQuery !== searchInput && (
          <p className="text-[10px] text-slate-400 mt-1 pl-1">Showing results for "{activeQuery}"</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 shrink-0">
        {[
          { id: "images", label: "Images", icon: "image", count: images.length },
          { id: "videos", label: "Videos", icon: "play_circle", count: videos.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold border-b-2 transition-colors ${
              tab === t.id ? "border-[#695be6] text-[#695be6]" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-sm">{t.icon}</span>
            {t.label}
            {!loading && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                tab === t.id ? "bg-[#695be6]/10 text-[#695be6]" : "bg-slate-100 text-slate-500"
              }`}>{t.count}</span>
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
            <button onClick={() => load(activeQuery, grade, board)} className="text-xs font-bold text-[#695be6] hover:underline">
              Try again
            </button>
          </div>
        ) : loading ? (
          tab === "images" ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} tall />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} tall />)}
            </div>
          )
        ) : tab === "images" ? (
          images.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-10">
              <span className="material-symbols-outlined text-slate-300 text-4xl">image_not_supported</span>
              <p className="text-sm text-slate-400">No images found for this topic.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
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

      {/* Footer */}
      {!loading && !error && (
        <div className="px-4 py-2 border-t border-slate-100 shrink-0">
          <p className="text-[10px] text-slate-400 text-center">
            Images via Google · Videos via YouTube · Cached 30 days
          </p>
        </div>
      )}
    </div>
  );
}
