import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { EmptyModulePage } from '../components/modules/EmptyModulePage';
import { LoginPage } from '../features/auth/LoginPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { navigation } from './navigation';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/sell-out" replace />} />
          {navigation.map(({ path, label, description, icon }) => (
            <Route
              key={path}
              path={path}
              element={
                <EmptyModulePage
                  title={label}
                  description={description}
                  icon={icon}
                />
              }
            />
          ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/sell-out" replace />} />
    </Routes>
  );
}
