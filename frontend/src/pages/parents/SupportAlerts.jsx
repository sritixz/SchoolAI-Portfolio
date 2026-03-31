import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchParentDashboard,
  fetchSupportAlerts,
  selectChildren,
  selectSupportAlerts,
} from "../../store/slices/parentSlice";

const FILTERS = ["All", "Urgent", "Attention Needed", "Resolved"];

const SEVERITY_STYLES = {
  urgent:    { border: "border-l-red-500",    label: "text-red-600 bg-red-50",    icon: "warning",       iconColor: "text-red-500" },
  attention: { border: "border-l-orange-400", label: "text-orange-600 bg-orange-50", icon: "info",       iconColor: "text-orange-500" },
  resolved:  { border: "border-l-green-500",  label: "text-green-600 bg-green-50", icon: "check_circle", iconColor: "text-green-500" },
};

export default function ParentSupportAlerts() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [filter, setFilter] = useState("All");

  const children = useSelector(selectChildren);
  const alerts = useSelector(selectSupportAlerts);

  useEffect(() => {
    dispatch(fetchParentDashboard()).then((res) => {
      const kids = res.payload?.children || [];
      if (kids.length > 0) dispatch(fetchSupportAlerts(kids[0]._id));
    });
  }, [dispatch]);

  const child = children[0];
  const activeAlerts = alerts.filter((a) => !a.resolved).length;

  const counts = {
    All: alerts.length,
    Urgent: alerts.filter((a) => a.severity === "urgent").length,
    "Attention Needed": alerts.filter((a) => a.severity === "attention").length,
    Resolved: alerts.filter((a) => a.severity === "resolved").length,
  };

  const filtered = filter === "All" ? alerts :
    filter === "Urgent" ? alerts.filter((a) => a.severity === "urgent") :
    filter === "Attention Needed" ? alerts.filter((a) => a.severity === "attention") :
    alerts.filter((a) => a.severity === "resolved");

  return (
    <div className="bg-[#f6f6f8] min-h-screen pb-10" style={{ fontFamily: "'Lexend', sans-serif" }}>
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/parent")} className="size-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Support Needed</h1>
          <p className="text-xs text-gray-400">Learning Pattern Analysis</p>
        </div>
        {child && <div className="text-right"><p className="text-sm font-bold">{child.name}</p><p className="text-xs text-gray-400">Grade {child.grade_number}-{child.section_name}</p></div>}
        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{activeAlerts} ACTIVE</span>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex gap-2 mb-4">
          <div className="size-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-base">lock</span>
          </div>
          <p className="text-sm text-gray-700">These alerts are private and focused on supporting your child's learning.</p>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${filter === f ? "bg-[#695be6] text-white" : "bg-white border border-gray-200 text-gray-600"}`}
            >
              {f === "Urgent" && <span className="size-2 rounded-full bg-red-500"></span>}
              {f === "Attention Needed" && <span className="size-2 rounded-full bg-orange-400"></span>}
              {f === "Resolved" && <span className="size-2 rounded-full bg-green-500"></span>}
              {f} {counts[f]}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
            <p className="font-medium">No alerts in this category</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((alert) => {
              const s = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.attention;
              if (alert.resolved) {
                return (
                  <div key={alert._id} className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${s.border} shadow-sm p-4 flex items-center gap-3`}>
                    <span className={`material-symbols-outlined text-2xl ${s.iconColor}`}>{s.icon}</span>
                    <div>
                      <p className="font-bold text-sm">{alert.title}</p>
                      <p className="text-xs text-gray-400">{alert.sub}</p>
                    </div>
                  </div>
                );
              }
              return (
                <div key={alert._id} className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${s.border} shadow-sm p-4`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.label}`}>{alert.label}</span>
                        <span className="text-xs text-gray-400">{alert.detected}</span>
                      </div>
                      <p className="font-bold">{alert.title}</p>
                    </div>
                  </div>
                  {alert.points && (
                    <ul className="space-y-1 mb-2">
                      {alert.points.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className={`material-symbols-outlined text-base mt-0.5 ${s.iconColor}`}>{s.icon}</span>
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}
                  {alert.insight && (
                    <div className="mt-3 bg-amber-50 rounded-xl p-3">
                      <p className={`text-[10px] font-bold mb-1 ${s.iconColor}`}>{alert.insight.label}</p>
                      <p className="text-xs text-gray-600 italic">{alert.insight.text}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
