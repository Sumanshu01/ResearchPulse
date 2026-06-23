import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Footer from './components/Footer.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Search from './pages/Search.jsx';
import PaperDetail from './pages/PaperDetail.jsx';
import AuthorProfile from './pages/AuthorProfile.jsx';
import InstitutionProfile from './pages/InstitutionProfile.jsx';
import SavedPapers from './pages/SavedPapers.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

// Analytics & Insights Pages
import Analytics from './pages/Analytics.jsx';
import CitationDashboard from './pages/CitationDashboard.jsx';
import TopicExplorer from './pages/TopicExplorer.jsx';
import TrendRadar from './pages/TrendRadar.jsx';

// Protected Route Wrapper Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export const App = () => {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-brand-bg">
        {/* Top Navbar */}
        <Navbar />

        {/* Bottom Panel */}
        <div className="flex flex-grow bg-brand-bg">
          {/* Left Sidebar */}
          <Sidebar />

          {/* Right Main Content */}
          <main className="flex-grow p-6 md:p-8 max-w-7xl mx-auto w-full overflow-x-hidden bg-brand-bg flex flex-col justify-between">
            <div className="flex-grow pb-8">
              <Routes>
                {/* Public Discovery Routes */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/search" element={<Search />} />
                <Route path="/papers/:id" element={<PaperDetail />} />
                <Route path="/authors/:id" element={<AuthorProfile />} />
                <Route path="/institutions/:id" element={<InstitutionProfile />} />
                
                {/* Research Insights & Analytics Routes */}
                <Route path="/trends" element={<TrendRadar />} />
                <Route path="/topics" element={<TopicExplorer />} />
                <Route path="/citations" element={<CitationDashboard />} />
                <Route path="/analytics" element={<Analytics />} />
                
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* Protected User Routes */}
                <Route
                  path="/saved"
                  element={
                    <ProtectedRoute>
                      <SavedPapers />
                    </ProtectedRoute>
                  }
                />

                {/* Redirect Unknown Routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
            
            {/* Footer */}
            <Footer />
          </main>
        </div>
      </div>
    </Router>
  );
};


export default App;
