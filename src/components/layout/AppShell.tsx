import { LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { navigation } from '../../app/navigation';
import { useAuth } from '../../features/auth/useAuth';
import { useTheme } from '../../features/theme/useTheme';
import styles from './AppShell.module.css';

export function AppShell() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? 'RJ';
  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        <div className={styles.brand}>
          <span>RJ</span>
          <div>
            <strong>RED JACKET</strong>
            <small>INTELIGÊNCIA COMERCIAL</small>
          </div>
        </div>
        <button
          className={styles.close}
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        >
          <X />
        </button>
        <nav aria-label="Navegação principal">
          <p>VISÃO GERAL</p>
          {navigation.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                isActive ? styles.active : undefined
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.account}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <strong>{user?.email?.split('@')[0] ?? 'Usuário'}</strong>
            <small>{user?.email}</small>
          </div>
          <button
            className="icon-button"
            onClick={() => void signOut()}
            aria-label="Sair"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {open && (
        <button
          className={styles.backdrop}
          onClick={() => setOpen(false)}
          aria-label="Fechar menu"
        />
      )}
      <section className={styles.workspace}>
        <header>
          <button
            className="icon-button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu />
          </button>
          <div className={styles.mobileBrand}>RED JACKET</div>
          <button
            className="icon-button"
            onClick={toggleTheme}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>
        </header>
        <main>
          <Outlet />
        </main>
      </section>
    </div>
  );
}
