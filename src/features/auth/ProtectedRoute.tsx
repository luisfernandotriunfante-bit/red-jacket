import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isLocalVisualPreview =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).has('visual-preview');
  if (isLocalVisualPreview) return <Outlet />;
  if (loading)
    return <div className="fullscreen-status">Preparando seu ambiente…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}
