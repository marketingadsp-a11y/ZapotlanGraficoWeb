import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { SettingsProvider } from '@/lib/SettingsContext';
import { Toaster } from '@/components/ui/toaster';

// Public Pages
import Home from '@/pages/Home';
import ArticleDetail from '@/pages/ArticleDetail';
import CategoryPage from '@/pages/CategoryPage';

// Admin Pages
import Login from '@/pages/admin/Login';
import Dashboard from '@/pages/admin/Dashboard';
import ArticleList from '@/pages/admin/ArticleList';
import ArticleEditor from '@/pages/admin/ArticleEditor';
import FBImporter from '@/pages/admin/FBImporter';
import WeeklyReport from '@/pages/admin/WeeklyReport';
import Settings from '@/pages/admin/Settings';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/admin/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/nota/:slug" element={<ArticleDetail />} />
            <Route path="/categoria/:category" element={<CategoryPage />} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<Login />} />
            <Route 
              path="/admin/*" 
              element={
                <PrivateRoute>
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="articulos" element={<ArticleList />} />
                    <Route path="articulos/nuevo" element={<ArticleEditor />} />
                    <Route path="articulos/editar/:id" element={<ArticleEditor />} />
                    <Route path="importar" element={<FBImporter />} />
                    <Route path="reporte" element={<WeeklyReport />} />
                    <Route path="ajustes" element={<Settings />} />
                    <Route path="*" element={<Navigate to="dashboard" />} />
                  </Routes>
                </PrivateRoute>
              } 
            />
          </Routes>
          <Toaster />
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}
