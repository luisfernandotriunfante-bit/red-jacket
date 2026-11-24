import { Bell, KeyRound, Moon, Sun, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ChangePasswordDialog } from '../auth/ChangePasswordDialog';
import { useAuth } from '../auth/useAuth';
import { useTheme } from '../theme/useTheme';
import styles from './ProfilePage.module.css';

const EMAIL_PREFERENCE_KEY = 'red-jacket-email-notifications';

export function ProfilePage() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(
    () => localStorage.getItem(EMAIL_PREFERENCE_KEY) === 'true',
  );

  useEffect(() => {
    localStorage.setItem(EMAIL_PREFERENCE_KEY, String(emailNotifications));
  }, [emailNotifications]);

  return (
    <section className={styles.page} aria-labelledby="profile-title">
      <header className={styles.header}>
        <div className={styles.eyebrow}>
          <UserRound size={16} /> PERFIL
        </div>
        <h1 id="profile-title">Suas preferências</h1>
        <p>Personalize sua experiência e mantenha sua conta segura.</p>
      </header>

      <div className={styles.grid}>
        <article className={styles.card}>
          <div className={styles.cardHeading}>
            <div className={styles.icon}>
              <Sun size={18} />
            </div>
            <div>
              <span>APARÊNCIA</span>
              <h2>Tema do sistema</h2>
            </div>
          </div>
          <p>Esta escolha permanece ativa quando você voltar ao sistema.</p>
          <div className={styles.segmented} aria-label="Escolher tema">
            <button
              className={theme === 'light' ? styles.selected : undefined}
              onClick={theme === 'dark' ? toggleTheme : undefined}
            >
              <Sun size={16} /> CLARO
            </button>
            <button
              className={theme === 'dark' ? styles.selected : undefined}
              onClick={theme === 'light' ? toggleTheme : undefined}
            >
              <Moon size={16} /> ESCURO
            </button>
          </div>
        </article>

        <article className={styles.card}>
          <div className={styles.cardHeading}>
            <div className={styles.icon}>
              <KeyRound size={18} />
            </div>
            <div>
              <span>SEGURANÇA</span>
              <h2>Senha de acesso</h2>
            </div>
          </div>
          <p>
            Altere a senha usada para entrar com {user?.email ?? 'seu e-mail'}.
          </p>
          <button
            className={styles.action}
            onClick={() => setPasswordOpen(true)}
          >
            ALTERAR SENHA
          </button>
        </article>

        <article className={`${styles.card} ${styles.wide}`}>
          <div className={styles.cardHeading}>
            <div className={styles.icon}>
              <Bell size={18} />
            </div>
            <div>
              <span>COMUNICAÇÃO</span>
              <h2>Notificações por e-mail</h2>
            </div>
          </div>
          <div className={styles.preferenceRow}>
            <div>
              <p>Escolha se deseja receber avisos importantes no seu e-mail.</p>
              <small>
                O envio será ativado quando o módulo de notificações estiver
                disponível.
              </small>
            </div>
            <button
              className={`${styles.switch} ${emailNotifications ? styles.switchOn : ''}`}
              role="switch"
              aria-checked={emailNotifications}
              onClick={() => setEmailNotifications((value) => !value)}
            >
              <span />
            </button>
          </div>
        </article>
      </div>

      {passwordOpen && (
        <ChangePasswordDialog onClose={() => setPasswordOpen(false)} />
      )}
    </section>
  );
}
