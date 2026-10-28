import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ReviewPage from './pages/ReviewPage';
import HistoryPage from './pages/HistoryPage';
import DashboardPage from './pages/DashboardPage';
import SharedReviewPage from './pages/SharedReviewPage';
import Layout from './components/layout/Layout';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/review" /> : children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/shared/:token" element={<SharedReviewPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/review" />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;