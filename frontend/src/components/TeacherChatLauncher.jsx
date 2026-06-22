import { Link, useLocation } from "react-router-dom";

export default function TeacherChatLauncher() {
  const location = useLocation();
  
  // Don't show launcher inside the chat itself
  if (location.pathname === "/teacher/ask-me-anything") return null;

  // On the home page, mobile view has a bottom nav FAB, so hide the floating button on mobile
  const isHome = location.pathname === "/teacher" || location.pathname === "/teacher/";
  const visibilityClass = isHome ? "hidden lg:flex" : "flex";

  return (
    <Link to="/teacher/ask-me-anything"
      className={`${visibilityClass} fixed bottom-6 right-6 z-50 items-center justify-center size-14 rounded-full bg-gradient-to-tr from-[#695be6] to-pink-500 text-white shadow-xl shadow-[#695be6]/30 hover:scale-105 hover:shadow-2xl transition-all duration-300 group`}
      title="Ask me Anything">
      <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">forum</span>
    </Link>
  );
}
