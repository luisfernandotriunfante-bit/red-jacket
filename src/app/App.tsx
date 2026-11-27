import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { BlankWorkspace } from '../components/modules/BlankWorkspace';
import { LoginPage } from '../features/auth/LoginPage';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { PasswordSetupPage } from '../features/auth/PasswordSetupPage';
import { useAuth } from '../features/auth/useAuth';
import { SettingsPage } from '../features/settings/SettingsPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { StockPage } from '../features/stock/StockPage';
import { SellOutSummaryPage } from '../features/sellout/SellOutSummaryPage';
import { SellOutManagementPage } from '../features/sellout/SellOutManagementPage';
import { SellOutClientsPage } from '../features/sellout/SellOutClientsPage';
import { navigation } from './navigation';

export function App() {
  const { user, needsPasswordSetup } = useAuth();

  if (user && needsPasswordSetup) return <PasswordSetupPage />;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/sell-out/resumo" replace />} />
          <Route
            path="/sell-out"
            element={<Navigate to="/sell-out/resumo" replace />}
          />
          <Route path="/sell-out/resumo" element={<SellOutSummaryPage />} />
          <Route
            path="/sell-out/gerencial"
            element={<SellOutManagementPage />}
          />
          <Route path="/sell-out/clientes" element={<SellOutClientsPage />} />
          <Route path="/estoque" element={<StockPage />} />
          <Route path="/perfil" element={<ProfilePage />} />
          <Route
            path="/configuracoes"
            element={<Navigate to="/configuracoes/motores" replace />}
          />
          <Route path="/configuracoes/:section" element={<SettingsPage />} />
          {navigation
            .filter(
              ({ rootPath }) =>
                rootPath !== '/sell-out' && rootPath !== '/configuracoes',
            )
            .filter(({ path }) => path !== '/estoque')
            .map(({ path }) => (
              <Route key={path} path={path} element={<BlankWorkspace />} />
            ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/sell-out/resumo" replace />} />
    </Routes>
  );
}
