import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import StudentDashboard from './pages/StudentDashboard';
import FacultyEventManager from './pages/FacultyEventManager';
import FacultyMarksPortal from './pages/FacultyMarksPortal';
import PublicVerifyPage from './pages/PublicVerifyPage';
import PublicStudentPortfolio from './pages/PublicStudentPortfolio';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-mono text-xs text-slate-600">
        Verifying Institutional Session...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <Navigate
        to={user.role === 'STUDENT' ? '/student/dashboard' : '/faculty/events'}
        replace
      />
    );
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication & Zero-Login Verification Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify/:certificateNo" element={<PublicVerifyPage />} />
          <Route path="/u/:rollNo" element={<PublicStudentPortfolio />} />

          {/* Protected Student Portal */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={['STUDENT']}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Faculty & HOD Portals */}
          <Route
            path="/faculty/events"
            element={
              <ProtectedRoute allowedRoles={['FACULTY', 'HOD_ADMIN']}>
                <FacultyEventManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/grading"
            element={
              <ProtectedRoute allowedRoles={['FACULTY', 'HOD_ADMIN']}>
                <FacultyMarksPortal />
              </ProtectedRoute>
            }
          />

          {/* Protected Admin Panel — HOD_ADMIN Only */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={['HOD_ADMIN']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Default Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}