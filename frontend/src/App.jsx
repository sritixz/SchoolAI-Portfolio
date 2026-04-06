import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import GlobalLoader from "./components/GlobalLoader";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import StudentHome from "./pages/student/Home";
import StudentHomework from "./pages/student/Homework";
import HomeworkAttempt from "./pages/student/HomeworkAttempt";
import HomeworkResult from "./pages/student/HomeworkResult";
import VinAI from "./pages/student/VinAI";
import LearningGapHub from "./pages/student/LearningGapHub";
import LearningGaps from "./pages/student/LearningGaps";
import GapRemediation from "./pages/student/GapRemediation";
import GapQuiz from "./pages/student/GapQuiz";
import Portfolio from "./pages/student/Portfolio";
import ExamPrep from "./pages/student/ExamPrep";
import StudentNotifications from "./pages/student/Notifications";
import CareerExplorer from "./pages/student/CareerExplorer";
import CareerCategory from "./pages/student/CareerCategory";
import CareerDetail from "./pages/student/CareerDetail";
import ParentHome from "./pages/parents/Home";
import ParentHomeworkOverview from "./pages/parents/HomeworkOverview";
import ParentConsistency from "./pages/parents/Consistency";
import ParentTopicProgress from "./pages/parents/TopicProgress";
import ParentNotifications from "./pages/parents/Notifications";
import ParentSupportAlerts from "./pages/parents/SupportAlerts";
import ParentGrowthPortfolio from "./pages/parents/GrowthPortfolio";
import ParentCuriosityPrompts from "./pages/parents/CuriosityPrompts";
import ParentLearningProfile from "./pages/parents/LearningProfile";
import ParentRequestMeeting from "./pages/parents/RequestMeeting";
import TeacherHome from "./pages/teacher/Home";
import TeacherAIAssistant from "./pages/teacher/AIAssistant";
import TeacherInterventions from "./pages/teacher/InterventionAlerts";
import TeacherHomeworkLibrary from "./pages/teacher/HomeworkLibrary";
import TeacherHomeworkPreview from "./pages/teacher/HomeworkPreview";
import TeacherQuickActions from "./pages/teacher/QuickActions";
import TeacherTopicMastery from "./pages/teacher/TopicMastery";
import TeacherParentComm from "./pages/teacher/ParentCommunication";
import TeacherPresentationCreator from "./pages/teacher/PresentationCreator";
import TeacherRootCause from "./pages/teacher/RootCauseAnalysis";
import TeacherQuizGenerator from "./pages/teacher/QuizGenerator";
import TeacherWorksheetGenerator from "./pages/teacher/WorksheetGenerator";
import TeacherCreateTest from "./pages/teacher/CreateTest";
import TeacherDiffHomework from "./pages/teacher/DifferentiatedHomework";
import TeacherStudents from "./pages/teacher/Students";
import TeacherStudentDetail from "./pages/teacher/StudentDetail";
import TeacherSubmissions from "./pages/teacher/Submissions";
import TeacherGradingAssistant from "./pages/teacher/GradingAssistant";
import TeacherLessonPlan from "./pages/teacher/LessonPlanCreator";
import TeacherConceptExplainer from "./pages/teacher/ConceptExplainer";
import TeacherEvaluateHomework from "./pages/teacher/EvaluateHomework";
import SchoolAdminHome from "./pages/schooladmin/Home";
import SchoolAdminMatrix from "./pages/schooladmin/PerformanceMatrix";
import SchoolAdminGaps from "./pages/schooladmin/GapHeatmap";
import SchoolAdminCrossClass from "./pages/schooladmin/CrossClass";
import SchoolAdminCurriculum from "./pages/schooladmin/CurriculumTracker";
import SchoolAdminWeakTopics from "./pages/schooladmin/WeakTopics";
import SchoolAdminTeacherSupport from "./pages/schooladmin/TeacherSupport";
import SchoolAdminOnboarding from "./pages/schooladmin/Onboarding";

const S = ({ children, role = "student" }) => (
  <ProtectedRoute allowedRole={role}>{children}</ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GlobalLoader />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />

          {/* Student */}
          <Route path="/student"                              element={<S><StudentHome /></S>} />
          <Route path="/student/homework"                     element={<S><StudentHomework /></S>} />
          <Route path="/student/homework/:homeworkId"         element={<S><HomeworkAttempt /></S>} />
          <Route path="/student/homework/:homeworkId/result"  element={<S><HomeworkResult /></S>} />
          <Route path="/student/vin-ai"                       element={<S><VinAI /></S>} />
          <Route path="/student/learning-gaps"                element={<S><LearningGapHub /></S>} />
          <Route path="/student/learning-gaps/gaps"           element={<S><LearningGaps /></S>} />
          <Route path="/student/learning-gaps/gaps/:gapId"    element={<S><GapRemediation /></S>} />
          <Route path="/student/learning-gaps/quiz/:quizId"   element={<S><GapQuiz /></S>} />
          <Route path="/student/portfolio"                    element={<S><Portfolio /></S>} />
          <Route path="/student/exam-prep"                    element={<S><ExamPrep /></S>} />
          <Route path="/student/notifications"               element={<S><StudentNotifications /></S>} />
          <Route path="/student/career"                       element={<S><CareerExplorer /></S>} />
          <Route path="/student/career/:domainId"             element={<S><CareerCategory /></S>} />
          <Route path="/student/career/:domainId/:careerId"   element={<S><CareerDetail /></S>} />

          {/* Parent */}
          <Route path="/parent"                     element={<S role="parent"><ParentHome /></S>} />
          <Route path="/parent/homework"            element={<S role="parent"><ParentHomeworkOverview /></S>} />
          <Route path="/parent/consistency"         element={<S role="parent"><ParentConsistency /></S>} />
          <Route path="/parent/progress"            element={<S role="parent"><ParentTopicProgress /></S>} />
          <Route path="/parent/notifications"       element={<S role="parent"><ParentNotifications /></S>} />
          <Route path="/parent/support"             element={<S role="parent"><ParentSupportAlerts /></S>} />
          <Route path="/parent/portfolio"           element={<S role="parent"><ParentGrowthPortfolio /></S>} />
          <Route path="/parent/curiosity"           element={<S role="parent"><ParentCuriosityPrompts /></S>} />
          <Route path="/parent/learning-profile"    element={<S role="parent"><ParentLearningProfile /></S>} />
          <Route path="/parent/meeting"             element={<S role="parent"><ParentRequestMeeting /></S>} />

          {/* Teacher */}
          <Route path="/teacher"                          element={<S role="teacher"><TeacherHome /></S>} />
          <Route path="/teacher/ai-assistant"             element={<S role="teacher"><TeacherAIAssistant /></S>} />
          <Route path="/teacher/ai-assistant/worksheet"   element={<S role="teacher"><TeacherWorksheetGenerator /></S>} />
          <Route path="/teacher/ai-assistant/presentation" element={<S role="teacher"><TeacherPresentationCreator /></S>} />
          <Route path="/teacher/ai-assistant/quiz"        element={<S role="teacher"><TeacherQuizGenerator /></S>} />
          <Route path="/teacher/interventions"            element={<S role="teacher"><TeacherInterventions /></S>} />
          <Route path="/teacher/homework"                 element={<S role="teacher"><TeacherHomeworkLibrary /></S>} />
          <Route path="/teacher/homework/preview/:id"     element={<S role="teacher"><TeacherHomeworkPreview /></S>} />
          <Route path="/teacher/homework/create"          element={<S role="teacher"><TeacherCreateTest /></S>} />
          <Route path="/teacher/homework/differentiated"  element={<S role="teacher"><TeacherDiffHomework /></S>} />
          <Route path="/teacher/students"                 element={<S role="teacher"><TeacherStudents /></S>} />
          <Route path="/teacher/students/:studentId"      element={<S role="teacher"><TeacherStudentDetail /></S>} />
          <Route path="/teacher/submissions"              element={<S role="teacher"><TeacherSubmissions /></S>} />
          <Route path="/teacher/ai-assistant/grading"     element={<S role="teacher"><TeacherGradingAssistant /></S>} />
          <Route path="/teacher/ai-assistant/lesson-plan" element={<S role="teacher"><TeacherLessonPlan /></S>} />
          <Route path="/teacher/ai-assistant/concept"     element={<S role="teacher"><TeacherConceptExplainer /></S>} />
          <Route path="/teacher/homework/evaluate/:id"    element={<S role="teacher"><TeacherEvaluateHomework /></S>} />
          <Route path="/teacher/quick-actions"            element={<S role="teacher"><TeacherQuickActions /></S>} />
          <Route path="/teacher/analytics"                element={<S role="teacher"><TeacherTopicMastery /></S>} />
          <Route path="/teacher/analytics/root-cause"     element={<S role="teacher"><TeacherRootCause /></S>} />
          <Route path="/teacher/communication"            element={<S role="teacher"><TeacherParentComm /></S>} />

          <Route path="/schooladmin"                        element={<S role="schooladmin"><SchoolAdminHome /></S>} />
          <Route path="/schooladmin/onboarding"           element={<S role="schooladmin"><SchoolAdminOnboarding /></S>} />
          <Route path="/schooladmin/matrix"               element={<S role="schooladmin"><SchoolAdminMatrix /></S>} />
          <Route path="/schooladmin/gaps"                 element={<S role="schooladmin"><SchoolAdminGaps /></S>} />
          <Route path="/schooladmin/cross-class"          element={<S role="schooladmin"><SchoolAdminCrossClass /></S>} />
          <Route path="/schooladmin/curriculum"           element={<S role="schooladmin"><SchoolAdminCurriculum /></S>} />
          <Route path="/schooladmin/weak-topics"          element={<S role="schooladmin"><SchoolAdminWeakTopics /></S>} />
          <Route path="/schooladmin/teacher-support"      element={<S role="schooladmin"><SchoolAdminTeacherSupport /></S>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
