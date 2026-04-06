import { useSelector } from "react-redux";
import { selectIsLoading } from "../store/slices/loadingSlice";

export default function GlobalLoader() {
  const isLoading = useSelector(selectIsLoading);
  if (!isLoading) return null;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0,
      height: "3px", zIndex: 9999, overflow: "hidden",
      background: "transparent",
    }}>
      <div style={{
        height: "100%",
        background: "linear-gradient(90deg, #6c47ff, #a78bfa, #6c47ff)",
        backgroundSize: "200% 100%",
        animation: "globalLoaderSlide 1.2s linear infinite",
      }} />
      <style>{`
        @keyframes globalLoaderSlide {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
