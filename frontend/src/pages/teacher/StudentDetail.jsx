import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getInitial } from "../../utils/nameUtils";
import { useDispatch } from "react-redux";
import { assignHomework } from "../../store/slices/homeworkSlice";
import api from "../../api";

export default function StudentDetail() {
  const navigate = useNavigate();
  const { studentId } = useParams();
  const { user } = useAuth();
  const dispatch = useDispatch();
  
  const [student, setStudent] = useState(null);
  const [homework, setHomework] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("homework"); // homework, submissions, profile
  
  // Assign modal state
  const [assignModal, setAssignModal] = useState(false);
  const [availableHomework, setAvailableHomework] = useState([]);
  const [selectedHomework, setSelectedHomework] = useState(null);
  const [dueDate, setDueDate] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  useEffect(() => {
    loadStudentData();
  }, [studentId]);

  useEffect(() => {
    if (activeTab === "submissions") {
      loadSubmissions();
    }
  }, [activeTab, studentId]);

  const loadStudentData = async () => {
    try {
      setLoading(true);
      
      // Fetch student profile
      const profileResp = await api.get(`/teacher/students/${studentId}/profile`);
      setStudent(profileResp.data);
      
      // Fetch student homework
      const hwResp = await api.get(`/teacher/students/${studentId}/homework`);
      setHomework(hwResp.data);
    } catch (err) {
      console.error("Failed to load student data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    try {
      const resp = await api.get(`/teacher/students/${studentId}/submissions`);
      setSubmissions(resp.data);
    } catch (err) {
      console.error("Failed to load submissions:", err);
    }
  };

  const openAssignModal = async () => {
    try {
      // Fetch available homework from library
      const resp = await api.get("/homework/library");
      // Filter to show only draft homework
      const drafts = resp.data.filter((hw) => hw.status === "draft");
      setAvailableHomework(drafts);
      setAssignModal(true);
    } catch (err) {
      console.error("Failed to load homework library:", err);
    }
  };

  const closeAssignModal = () => {
    setAssignModal(false);
    setSelectedHomework(null);
    setDueDate("");
    setAssignError("");
  };

  const handleAssign = async () => {
    if (!selectedHomework) {
      setAssignError("Please select a homework");
      return;
    }
    if (!dueDate) {
      setAssignError("Please set a due date");
      return;
    }
    
    setAssigning(true);
    setAssignError("");
    
    try {
      await dispatch(
        assignHomework({
          homework_id: selectedHomework,
          student_ids: [studentId],
          due_date: dueDate,
        })
      ).unwrap();
      
      closeAssignModal();
      loadStudentData(); // Refresh homework list
    } catch (err) {
      setAssignError(err.message || "Assignment failed. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="size-12 border-4 border-[#695be6] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading student data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#faf9ff] min-h-screen" style={{ fontFamily: "'Lexend', sans-serif" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <button onClick={() => navigate("/teacher/students")} className="p-2 hover:bg-gray-100 rounded-lg">
            <span className="material-symbols-outlined text-gray-500">arrow_back</span>
          </button>
          <div className="size-8 bg-[#695be6] rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-lg">person</span>
          </div>
          <div>
            <h1 className="font-black text-lg">{student?.name || "Student"}</h1>
            <p className="text-xs text-gray-400">Student Details</p>
          </div>
          
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={openAssignModal}
              className="flex items-center gap-2 bg-[#695be6] text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-[#5a4dd4] transition-colors"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Assign Homework
            </button>
            <div className="size-9 rounded-full bg-[#695be6] flex items-center justify-center text-white font-bold text-sm">
              {getInitial(user?.name) || "T"}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto pt-20 sm:pt-24 px-4 sm:px-6 pb-12">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("homework")}
            className={`px-4 py-2 font-bold text-sm transition-all ${
              activeTab === "homework"
                ? "text-[#695be6] border-b-2 border-[#695be6]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Homework ({homework.length})
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`px-4 py-2 font-bold text-sm transition-all ${
              activeTab === "submissions"
                ? "text-[#695be6] border-b-2 border-[#695be6]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Submissions
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2 font-bold text-sm transition-all ${
              activeTab === "profile"
                ? "text-[#695be6] border-b-2 border-[#695be6]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Profile
          </button>
        </div>

        {/* Content */}
        {activeTab === "homework" && (
          <div className="grid gap-4">
            {homework.length === 0 ? (
              <div className="text-center py-20">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-gray-400 text-4xl">assignment</span>
                </div>
                <p className="text-gray-500 font-medium">No homework assigned yet</p>
              </div>
            ) : (
              homework.map((hw) => (
                <div
                  key={hw._id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-black text-base">{hw.title}</h3>
                      <p className="text-sm text-gray-500">{hw.subject}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      hw.submission_status === "graded"
                        ? "bg-green-100 text-green-700"
                        : hw.submission_status === "submitted"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {hw.submission_status === "graded"
                        ? "Graded"
                        : hw.submission_status === "submitted"
                        ? "Submitted"
                        : "Pending"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">quiz</span>
                      {hw.questions?.length || 0} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      Due: {new Date(hw.due_date).toLocaleDateString()}
                    </span>
                    {hw.submission_status === "graded" && hw.final_score_pct && (
                      <span className="flex items-center gap-1 text-green-600 font-bold">
                        <span className="material-symbols-outlined text-sm">grade</span>
                        {hw.final_score_pct}%
                      </span>
                    )}
                  </div>

                  {hw.submission_status === "submitted" ? (
                    <button
                      onClick={() => navigate(`/teacher/homework/evaluate/${hw._id}`)}
                      className="w-full bg-blue-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">rate_review</span>
                      Review Submission
                    </button>
                  ) : hw.submission_status === "graded" ? (
                    <button
                      onClick={() => navigate(`/teacher/homework/evaluate/${hw._id}`)}
                      className="w-full bg-green-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">visibility</span>
                      View Grade
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/teacher/homework/evaluate/${hw._id}`)}
                      className="w-full bg-[#695be6] text-white text-sm font-bold py-2 rounded-lg hover:bg-[#5a4dd4] transition-colors"
                    >
                      View Details
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "submissions" && (
          <div className="grid gap-4">
            {submissions.length === 0 ? (
              <div className="text-center py-20">
                <div className="size-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-gray-400 text-4xl">assignment_turned_in</span>
                </div>
                <p className="text-gray-500 font-medium">No submissions yet</p>
              </div>
            ) : (
              submissions.map((sub) => (
                <div
                  key={sub.submission_id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-black text-base">{sub.homework_title}</h3>
                      <p className="text-sm text-gray-500">{sub.subject}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      sub.status === "graded"
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {sub.status === "graded" ? "Graded" : "Submitted"}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      {new Date(sub.submitted_at).toLocaleDateString()}
                    </span>
                    {sub.status === "graded" && sub.final_score_pct && (
                      <span className="flex items-center gap-1 text-green-600 font-bold">
                        <span className="material-symbols-outlined text-sm">grade</span>
                        {sub.final_score_pct}%
                      </span>
                    )}
                    {sub.can_download && (
                      <span className="flex items-center gap-1 text-blue-600">
                        <span className="material-symbols-outlined text-sm">attach_file</span>
                        {sub.file_urls.length} file(s)
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/teacher/homework/evaluate/${sub.homework_id}`)}
                      className="flex-1 bg-[#695be6] text-white text-sm font-bold py-2 rounded-lg hover:bg-[#5a4dd4] transition-colors"
                    >
                      View Submission
                    </button>
                    {sub.can_download && (
                      <button
                        onClick={() => {
                          sub.file_urls.forEach(url => window.open(url, '_blank'));
                        }}
                        className="px-4 py-2 border border-gray-200 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "profile" && student && (
          <div className="grid gap-6">
            {/* Personal Info Card */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-black text-lg mb-4">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Name</p>
                  <p className="font-medium">{student.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Roll Number</p>
                  <p className="font-medium">{student.roll_no || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Class</p>
                  <p className="font-medium">{student.class}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Attendance</p>
                  <p className="font-medium">{student.attendance}%</p>
                </div>
                {student.phone && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Phone</p>
                    <p className="font-medium">{student.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Parent Info Card */}
            {student.parent_id && (
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-lg">Parent Information</h3>
                  <button
                    onClick={() => navigate(`/teacher/communication?parent=${student.parent_id}`)}
                    className="text-sm text-[#695be6] font-bold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">mail</span>
                    Contact Parent
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Name</p>
                    <p className="font-medium">{student.parent_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="font-medium">{student.parent_email}</p>
                  </div>
                  {student.parent_phone && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Phone</p>
                      <p className="font-medium">{student.parent_phone}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Academic Performance Card */}
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <h3 className="font-black text-lg mb-4">Academic Performance</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <p className="text-3xl font-black text-[#695be6]">{student.overall_avg_score}%</p>
                  <p className="text-xs text-gray-500 mt-1">Overall Average</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <p className="text-3xl font-black text-green-600">
                    {student.homework_stats.completed}/{student.homework_stats.total}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Homework Done</p>
                </div>
                <div className="text-center p-4 bg-amber-50 rounded-xl">
                  <p className="text-3xl font-black text-amber-600">{student.homework_stats.pending}</p>
                  <p className="text-xs text-gray-500 mt-1">Pending</p>
                </div>
              </div>
              
              {/* Subject Performance */}
              {student.subject_performance && student.subject_performance.length > 0 && (
                <div>
                  <h4 className="font-bold text-sm mb-3">Subject-wise Performance</h4>
                  <div className="space-y-3">
                    {student.subject_performance.map((subj) => (
                      <div key={subj.subject}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{subj.subject}</span>
                          <span className="text-gray-500">{subj.avg_score}% ({subj.homework_count} assignments)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#695be6] transition-all"
                            style={{ width: `${subj.avg_score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Learning Gaps Card */}
            {student.learning_gaps && student.learning_gaps.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-black text-lg mb-4">Learning Gaps</h3>
                <div className="space-y-2">
                  {student.learning_gaps.map((gap, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                      <span className="material-symbols-outlined text-red-500">warning</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{gap.topic}</p>
                        <p className="text-xs text-gray-500">{gap.subject}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        gap.severity === 'critical' ? 'bg-red-100 text-red-700' :
                        gap.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {gap.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {student.recent_activity && student.recent_activity.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
                <h3 className="font-black text-lg mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {student.recent_activity.map((activity, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="size-10 rounded-full bg-[#695be6]/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#695be6] text-lg">assignment_turned_in</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{activity.homework}</p>
                        <p className="text-xs text-gray-500">
                          {activity.date ? new Date(activity.date).toLocaleDateString() : "Recently"}
                        </p>
                      </div>
                      {activity.score && (
                        <div className="text-right">
                          <p className="text-lg font-black text-green-600">{activity.score}%</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={closeAssignModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#695be6] to-[#8e82f3] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-black text-lg">Assign Homework</h2>
                <p className="text-white/80 text-sm">Select homework to assign to {student?.name}</p>
              </div>
              <button onClick={closeAssignModal} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {assignError && (
                <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <span className="material-symbols-outlined text-red-500 text-base">error</span>
                  <p className="text-red-600 text-sm flex-1">{assignError}</p>
                </div>
              )}

              {/* Due Date */}
              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#695be6]"
                />
              </div>

              {/* Homework Selection */}
              <div>
                <label className="block text-sm font-bold mb-3">Select Homework</label>
                {availableHomework.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined text-gray-400 text-3xl">assignment</span>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">No draft homework available</p>
                    <p className="text-xs text-gray-400 mt-1">Create homework first to assign to students</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-2" style={{ scrollbarWidth: "thin" }}>
                    {availableHomework.map((hw) => {
                      const isSelected = selectedHomework === hw._id;
                      return (
                        <label
                          key={hw._id}
                          className={`flex items-start gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all ${
                            isSelected ? "border-[#695be6] bg-[#695be6]/5" : "border-gray-100 hover:border-gray-200"
                          }`}
                        >
                          <div
                            className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected ? "bg-[#695be6] border-[#695be6]" : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <div className="size-2.5 rounded-full bg-white"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{hw.title}</p>
                            <p className="text-xs text-gray-500">{hw.subject}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">quiz</span>
                                {hw.questions?.length || 0} questions
                              </span>
                              {hw.total_marks && (
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">grade</span>
                                  {hw.total_marks} marks
                                </span>
                              )}
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="homework"
                            className="hidden"
                            checked={isSelected}
                            onChange={() => setSelectedHomework(hw._id)}
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={closeAssignModal}
                className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning || availableHomework.length === 0}
                className="px-6 py-2.5 bg-[#695be6] text-white rounded-xl text-sm font-bold hover:bg-[#5a4dd4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {assigning && <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>}
                {assigning ? "Assigning..." : "Assign Homework"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
