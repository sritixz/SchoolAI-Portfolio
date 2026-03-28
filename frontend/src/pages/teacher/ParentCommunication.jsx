import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  parentMeetingRequests,
  messageComposerTemplates,
  communicationHistory,
} from "../../data/teacher/parentCommunicationData";

const TABS = ["Parent Meeting Requests", "Message Composer", "Communication History"];

export default function ParentCommunication() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const [classFilter, setClassFilter] = useState("Grade 8 - Section A");
  const [requests, setRequests] = useState(parentMeetingRequests);
  const [selectedRequest, setSelectedRequest] = useState(requests[0]);
  const [composerTemplate, setComposerTemplate] = useState(messageComposerTemplates[0].id);
  const [composerBody, setComposerBody] = useState(messageComposerTemplates[0].body);

  const selectTime = (reqId, timeId) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === reqId
          ? { ...r, proposedTimes: r.proposedTimes.map((t) => ({ ...t, selected: t.id === timeId })) }
          : r
      )
    );
    if (selectedRequest?.id === reqId) {
      setSelectedRequest((prev) => ({
        ...prev,
        proposedTimes: prev.proposedTimes.map((t) => ({ ...t, selected: t.id === timeId })),
      }));
    }
  };

  const unreadCount = 5;
  const pendingCount = 2;

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 h-14 flex items-center gap-4">
          <button onClick={() => navigate("/teacher")} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined text-gray-500">arrow_back</span>
          </button>
          <div className="size-7 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-sm">groups</span>
          </div>
          <h1 className="font-black text-base">Parent Communication</h1>

          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none ml-2"
          >
            <option>Grade 8 - Section A</option>
            <option>Grade 8 - Section B</option>
            <option>Grade 9 - Section A</option>
          </select>

          <div className="flex-1 flex items-center gap-2 bg-gray-100 rounded-xl px-4 py-2 max-w-sm ml-2">
            <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
            <input className="bg-transparent text-sm outline-none w-full placeholder-gray-400" placeholder="Search parents or students" />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">{unreadCount} UNREAD</span>
            <span className="bg-orange-100 text-orange-600 text-xs font-bold px-3 py-1 rounded-full">{pendingCount} PENDING</span>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">P</div>
          </div>
        </div>
      </header>

      <div className="max-w-[1200px] mx-auto pt-20 px-6 pb-12 flex gap-6">

        {/* Main Panel */}
        <div className="flex-1">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200 mb-6">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === i ? "border-[#695be6] text-[#695be6]" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {i === 0 ? "calendar_month" : i === 1 ? "edit_note" : "history"}
                </span>
                {tab}
              </button>
            ))}
          </div>

          {/* Tab 0: Meeting Requests */}
          {activeTab === 0 && (
            <>
              {/* Request New Meeting */}
              <button className="w-full border-2 border-dashed border-[#695be6]/40 rounded-xl py-8 flex flex-col items-center gap-2 hover:bg-[#695be6]/5 transition-colors mb-6">
                <div className="size-10 rounded-full bg-[#695be6]/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#695be6]">add</span>
                </div>
                <p className="text-[#695be6] font-bold">+ Request New Parent Meeting</p>
              </button>

              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-lg">Pending Requests</h3>
                <p className="text-sm text-gray-400">Showing 1 of {requests.length} requests</p>
              </div>

              {requests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequest(req)}
                  className={`bg-white rounded-xl border shadow-sm p-5 mb-4 cursor-pointer transition-all ${
                    selectedRequest?.id === req.id ? "border-[#695be6]" : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="size-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <span className="material-symbols-outlined text-gray-400 text-3xl">person</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="font-black">{req.studentName} ({req.studentClass})</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.status === "pending_response" ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                        }`}>
                          {req.status === "pending_response" ? "PENDING RESPONSE" : "CONFIRMED"}
                        </span>
                        {req.urgency === "urgent" && (
                          <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                            <span className="size-1.5 rounded-full bg-red-500 inline-block"></span> URGENT
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{req.reason}</p>

                      <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Proposed Times</p>
                      <div className="flex gap-2 flex-wrap">
                        {req.proposedTimes.map((t) => (
                          <button
                            key={t.id}
                            onClick={(e) => { e.stopPropagation(); selectTime(req.id, t.id); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm transition-all ${
                              t.selected
                                ? "border-[#695be6] bg-[#695be6]/5 text-[#695be6]"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className={`size-4 rounded-full border-2 flex items-center justify-center ${
                              t.selected ? "border-[#695be6]" : "border-gray-300"
                            }`}>
                              {t.selected && <div className="size-2 rounded-full bg-[#695be6]" />}
                            </div>
                            <div className="text-left">
                              <p className="font-bold text-xs">{t.date}</p>
                              <p className="text-[10px] text-gray-400">{t.time}</p>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button className="border border-gray-200 text-sm font-bold px-5 py-2 rounded-xl hover:bg-gray-50 transition-colors">
                          Suggest Alternative
                        </button>
                        <button className="flex items-center gap-2 bg-[#695be6] text-white text-sm font-bold px-5 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors">
                          <span className="material-symbols-outlined text-base">check_circle</span> Confirm Meeting
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Tab 1: Message Composer */}
          {activeTab === 1 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-black text-lg mb-4">Compose Message</h3>
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 mb-2 block">Template</label>
                <div className="flex flex-wrap gap-2">
                  {messageComposerTemplates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { setComposerTemplate(t.id); setComposerBody(t.body); }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                        composerTemplate === t.id ? "bg-[#695be6] text-white border-[#695be6]" : "border-gray-200 hover:border-[#695be6]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="text-xs font-bold text-gray-500 mb-2 block">Message</label>
                <textarea
                  value={composerBody}
                  onChange={(e) => setComposerBody(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#695be6] resize-none h-32"
                />
              </div>
              <button className="bg-[#695be6] text-white font-bold px-6 py-2.5 rounded-xl hover:bg-[#5a4dd4] transition-colors">
                Send Message
              </button>
            </div>
          )}

          {/* Tab 2: Communication History */}
          {activeTab === 2 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Student</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Date</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Subject</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Channel</th>
                    <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {communicationHistory.map((h) => (
                    <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-4 font-semibold">{h.studentName}</td>
                      <td className="px-5 py-4 text-gray-500">{h.date}</td>
                      <td className="px-5 py-4">{h.subject}</td>
                      <td className="px-5 py-4 text-gray-500">{h.channel}</td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          h.status === "completed" ? "bg-green-100 text-green-700" :
                          h.status === "read"      ? "bg-blue-100 text-blue-700"   :
                          "bg-orange-100 text-orange-700"
                        }`}>{h.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Sidebar — Parent Contact Info */}
        {selectedRequest && activeTab === 0 && (
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Parent Contact Information</p>

              <div className="flex items-center gap-3 mb-4">
                <div className="size-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  <span className="material-symbols-outlined text-gray-400 text-2xl">person</span>
                </div>
                <div>
                  <p className="font-black text-sm">{selectedRequest.studentName}</p>
                  <p className="text-xs text-[#695be6] font-semibold">
                    Grade {selectedRequest.studentClass}, Roll #{selectedRequest.rollNo}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-gray-400 text-sm mt-0.5">person</span>
                  <div>
                    <p className="text-sm font-bold">{selectedRequest.parentContact.name}</p>
                    <p className="text-[10px] text-gray-400">{selectedRequest.parentContact.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400 text-sm">phone</span>
                  <p className="text-sm">{selectedRequest.parentContact.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400 text-sm">mail</span>
                  <p className="text-xs text-gray-600 break-all">{selectedRequest.parentContact.email}</p>
                </div>
              </div>

              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Student Context</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-gray-50 rounded-xl p-2 text-center">
                  <p className="text-[10px] text-gray-400">Current Avg</p>
                  <p className="font-black text-lg">{selectedRequest.studentContext.currentAvg}%</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2 text-center">
                  <p className="text-[10px] text-gray-400">Trend</p>
                  <p className="text-xs font-bold text-red-500 flex items-center justify-center gap-0.5 mt-1">
                    <span className="material-symbols-outlined text-sm">trending_down</span>
                    {selectedRequest.studentContext.trend}
                  </p>
                </div>
              </div>

              <div className="bg-red-50 rounded-xl p-3 mb-4">
                <p className="text-[10px] font-bold text-red-500 mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  {selectedRequest.studentContext.criticalGaps.length} CRITICAL GAPS
                </p>
                <ul className="space-y-1">
                  {selectedRequest.studentContext.criticalGaps.map((gap) => (
                    <li key={gap} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <span className="size-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0"></span>
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => setActiveTab(1)}
                className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors mb-2"
              >
                <span className="material-symbols-outlined text-base">phone</span> Call Parent
              </button>
              <button
                onClick={() => setActiveTab(1)}
                className="w-full flex items-center justify-center gap-2 bg-[#695be6]/10 text-[#695be6] font-bold py-3 rounded-xl hover:bg-[#695be6]/20 transition-colors"
              >
                <span className="material-symbols-outlined text-base">chat</span> Send Quick Message
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
