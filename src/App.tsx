import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { SettingsProvider } from '@/lib/SettingsContext';
import { Toaster } from '@/components/AppToaster';
import SubscriptionModal from '@/components/SubscriptionModal';
import ScrollToTop from '@/components/ScrollToTop';

// Public Pages
import Home from '@/pages/Home';
import ArticleDetail from '@/pages/ArticleDetail';
import CategoryPage from '@/pages/CategoryPage';
import Noticias from '@/pages/Noticias';
import Revista from '@/pages/Revista';
import FlipbookViewer from '@/pages/FlipbookViewer';

// Admin Pages
import Login from '@/pages/admin/Login';
import Dashboard from '@/pages/admin/Dashboard';
import ArticleList from '@/pages/admin/ArticleList';
import ArticleEditor from '@/pages/admin/ArticleEditor';
import FBImporter from '@/pages/admin/FBImporter';
import WeeklyReport from '@/pages/admin/WeeklyReport';
import Settings from '@/pages/admin/Settings';
import Subscribers from '@/pages/admin/Subscribers';
import FlipbookList from '@/pages/admin/FlipbookList';
import FlipbookMaker from '@/pages/admin/FlipbookMaker';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/admin/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/nota/:slug" element={<ArticleDetail />} />
            <Route path="/categoria/:category" element={<CategoryPage />} />
            <Route path="/noticias" element={<Noticias />} />
            <Route path="/revista" element={<Revista />} />
            <Route path="/revista/:id" element={<FlipbookViewer />} />

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
                    <Route path="suscriptores" element={<Subscribers />} />
                    <Route path="flipbooks" element={<FlipbookList />} />
                    <Route path="flipbooks/nuevo" element={<FlipbookMaker />} />
                    <Route path="*" element={<Navigate to="dashboard" />} />
                  </Routes>
                </PrivateRoute>
              } 
            />
          </Routes>
          <Toaster />
          <SubscriptionModal />
        </BrowserRouter>
      </SettingsProvider>
    </AuthProvider>
  );
}
