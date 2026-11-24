import { LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { navigation } from '../../app/navigation';
import { useAuth } from '../../features/auth/useAuth';
import { useTheme } from '../../features/theme/useTheme';
import styles from './AppShell.module.css';

export function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'RJ';
  const userName = user?.email?.split('@')[0]?.split('.')[0] ?? 'USUÁRIO';
  const activeModule = navigation.find(({ rootPath }) =>
    location.pathname.startsWith(rootPath),
  );

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <section className={styles.profile} aria-label="Perfil do usuário">
          <Link
            to="/perfil"
            className={styles.profileLink}
            onClick={(event) => {
              setOpen(false);
              event.currentTarget.blur();
            }}
            aria-label="Abrir perfil do usuário"
          >
            <span className={styles.avatar}>{initials}</span>
            <span className={styles.profileCopy}>
              <small>OLÁ,</small>
              <strong>{userName}</strong>
            </span>
          </Link>
          <button
            className={styles.signOut}
            onClick={() => void signOut()}
            aria-label="Sair"
          >
            <LogOut size={16} />
          </button>
        </section>
        <button
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        >
          <X />
        </button>
        <nav className={styles.primaryNav} aria-label="Navegação principal">
          {navigation.map(({ path, rootPath, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={(event) => {
                setOpen(false);
                event.currentTarget.blur();
              }}
              className={
                location.pathname.startsWith(rootPath)
                  ? styles.active
                  : undefined
              }
              title={label.toUpperCase()}
            >
              <span className={styles.navIcon}>
                <Icon size={18} strokeWidth={1.7} />
              </span>
              <span className={styles.navLabel}>{label.toUpperCase()}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.brand}>RED JACKET</div>
      </aside>
      {open && (
        <button
          className={styles.backdrop}
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        />
      )}
      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <button
            className={styles.mobileMenu}
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu />
          </button>
          {activeModule?.tabs.length ? (
            <nav
              className={styles.secondaryNav}
              aria-label="Navegação da seção"
            >
              {activeModule.tabs.map(({ path, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  className={({ isActive }) =>
                    isActive ? styles.secondaryActive : undefined
                  }
                >
                  {label.toUpperCase()}
                </NavLink>
              ))}
            </nav>
          ) : (
            <span />
          )}
          <button
            className={styles.mobileTheme}
            onClick={toggleTheme}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        <main>
          <Outlet />
        </main>
      </section>
    </div>
  );
}
