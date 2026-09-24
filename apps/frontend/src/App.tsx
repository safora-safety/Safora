import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { SosBannerAlert } from './components/emergency/SosBannerAlert';
import { LoginPage } from './pages/LoginPage';

// Lazy load operational screens so Leaflet/Recharts don't block auth rendering
const DashboardPage = React.lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const SosAlertsPage = React.lazy(() =>
  import('./pages/SosAlertsPage').then((m) => ({ default: m.SosAlertsPage }))
);
const HazardsPage = React.lazy(() =>
  import('./pages/HazardsPage').then((m) => ({ default: m.HazardsPage }))
);
const SafeWalksPage = React.lazy(() =>
  import('./pages/SafeWalksPage').then((m) => ({ default: m.SafeWalksPage }))
);
const AnalyticsPage = React.lazy(() =>
  import('./pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage }))
);
const DiagnosticsPage = React.lazy(() =>
  import('./pages/DiagnosticsPage').then((m) => ({ default: m.DiagnosticsPage }))
);
const UsersPage = React.lazy(() =>
  import('./pages/UsersPage').then((m) => ({ default: m.UsersPage }))
);
const SettingsPage = React.lazy(() =>
  import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);

// High-visibility Error Boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[SAFORA ErrorBoundary Caught]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-obsidian-950 flex flex-col items-center justify-center p-6 text-white font-mono">
          <div className="p-6 rounded-2xl bg-red-950/80 border border-red-500/50 max-w-2xl w-full space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-red-400">⚠️ SAFORA Application Runtime Error</h2>
            <p className="text-xs text-red-200">{this.state.error?.message}</p>
            <pre className="text-[11px] p-4 rounded-xl bg-black/60 overflow-x-auto text-red-300 max-h-60">
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-semibold text-white transition-colors"
            >
              Clear Storage &amp; Return to Login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Layout wrapper for authenticated command views
const AdminLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-obsidian-900 text-gray-100 flex flex-col">
      <Navbar
        onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        isMobileMenuOpen={mobileMenuOpen}
      />
      <SosBannerAlert />
      <div className="flex-1 flex relative">
        <Sidebar
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />
        <main className="flex-1 overflow-x-hidden min-h-[calc(100vh-4rem)] w-full max-w-full">
          <Suspense
            fallback={
              <div className="min-h-[400px] flex items-center justify-center text-indigo-400 font-mono text-xs">
                Loading Operations Canvas...
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

// Route controller that enforces authentication
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public Login Screen */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated Command Center Routes */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <SocketProvider>
              <AdminLayout />
            </SocketProvider>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="sos" element={<SosAlertsPage />} />
        <Route path="hazards" element={<HazardsPage />} />
        <Route path="safewalks" element={<SafeWalksPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="diagnostics" element={<DiagnosticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
