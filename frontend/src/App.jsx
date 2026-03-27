import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
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
import CareerExplorer from "./pages/student/CareerExplorer";
import CareerCategory from "./pages/student/CareerCategory";
import CareerDetail from "./pages/student/CareerDetail";
import ParentHome from "./pages/parents/Home";
import TeacherHome from "./pages/teacher/Home";
import SchoolAdminHome from "./pages/schooladmin/Home";

const S = ({ children, role = "student" }) => (
  <ProtectedRoute allowedRole={role}>{children}</ProtectedRoute>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

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
          <Route path="/student/career"                       element={<S><CareerExplorer /></S>} />
          <Route path="/student/career/:domainId"             element={<S><CareerCategory /></S>} />
          <Route path="/student/career/:domainId/:careerId"   element={<S><CareerDetail /></S>} />

          {/* Other roles */}
          <Route path="/parent"      element={<S role="parent"><ParentHome /></S>} />
          <Route path="/teacher"     element={<S role="teacher"><TeacherHome /></S>} />
          <Route path="/schooladmin" element={<S role="schooladmin"><SchoolAdminHome /></S>} />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
