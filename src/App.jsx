import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';

// Components
import CinematicIntro from './components/CinematicIntro';
import Layout from './components/layout/Layout';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import OrganizationSetup from './pages/OrganizationSetup';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Meetings from './pages/Meetings';
import Chat from './pages/Chat';
import AIAssistantPage from './pages/AIAssistantPage';
import ClientPortal from './pages/ClientPortal';
import NotificationsPage from './pages/NotificationsPage';
import Reports from './pages/Reports';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function ProtectedRoute({ children }) {
  const user = useAuthStore((state) => state.user);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E5E5DF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DB9941] mx-auto"></div>
          <p className="mt-4 text-[#5D5D5D] font-grotesk">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function OrgRequiredRoute({ children }) {
  const organization = useAuthStore((state) => state.organization);
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#E5E5DF]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DB9941] mx-auto"></div>
          <p className="mt-4 text-[#5D5D5D] font-grotesk">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!loading && !organization && user) {
    return <Navigate to="/setup" replace />;
  }

  return children;
}

function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const theme = useAppStore((state) => state.theme);
  const loading = useAuthStore((state) => state.loading);
  const user = useAuthStore((state) => state.user);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  if (showIntro && !user && !loading) {
    return <CinematicIntro onComplete={() => setShowIntro(false)} />;
  }

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07111D]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DB9941] mx-auto"></div>
          <p className="mt-4 text-[#E5E5DF] font-grotesk">Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          {/* Organization Setup - Protected but no org required */}
          <Route path="/setup" element={
            <ProtectedRoute>
              <OrganizationSetup />
            </ProtectedRoute>
          } />

          {/* App Routes - Protected + Org Required */}
          <Route path="/app" element={
            <ProtectedRoute>
              <OrgRequiredRoute>
                <Layout />
              </OrgRequiredRoute>
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:projectId" element={<Projects />} />
            <Route path="meetings" element={<Meetings />} />
            <Route path="meetings/:meetingId" element={<Meetings />} />
            <Route path="chat" element={<Chat />} />
            <Route path="chat/:channelId" element={<Chat />} />
            <Route path="ai-assistant" element={<AIAssistantPage />} />
            <Route path="client-portal" element={<ClientPortal />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="reports" element={<Reports />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Redirects */}
          <Route path="/dashboard" element={<Navigate to="/app" replace />} />
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-[#E5E5DF]">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-[#07111D] font-display">404</h1>
                <p className="text-xl text-[#5D5D5D] mt-4 font-grotesk">Page not found</p>
                <a href="/" className="inline-block mt-6 px-6 py-3 rounded-xl text-white font-semibold hover:scale-105 transition-all"
                  style={{ background: 'linear-gradient(135deg, #DB9941, #AE2C11)' }}>Go Home</a>
              </div>
            </div>
          } />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        duration: 3000,
        style: { borderRadius: '12px', background: '#07111D', color: '#E5E5DF', border: '1px solid rgba(219,153,65,0.3)' },
        success: { iconTheme: { primary: '#DB9941', secondary: '#07111D' } },
        error: { iconTheme: { primary: '#AE2C11', secondary: '#07111D' } },
      }} />
    </QueryClientProvider>
  );
}

export default App;