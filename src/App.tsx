import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Navbar, Footer } from "./components/Layout";
import { Home } from "./pages/Home";
import { StoryDetail } from "./pages/StoryDetail";
import { CreateStory } from "./pages/CreateStory";
import { AdminDashboard } from "./pages/AdminDashboard";
import { Login, Signup } from "./pages/Auth";
import { Toaster } from "sonner";

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
};

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/story/:id" element={<StoryDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route path="/create" element={
            <ProtectedRoute>
              <CreateStory />
            </ProtectedRoute>
          } />
          
          <Route path="/admin" element={
            <ProtectedRoute adminOnly>
              <AdminDashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
      <Footer />
      <Toaster position="top-center" richColors />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
