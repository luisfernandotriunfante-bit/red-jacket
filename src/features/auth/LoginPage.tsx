import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { user, configured, signIn, requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  if (user) return <Navigate to="/sell-out" replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? 'E-mail ou senha inválidos.'
          : 'Não foi possível entrar. Tente novamente.',
      );
      setSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('Informe seu e-mail primeiro.');
      return;
    }
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setMessage('Enviamos um link para você definir sua senha.');
    } catch {
      setError('Não foi possível enviar o link. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.presentation}>
        <div className={styles.brand}>
          <span>RJ</span>
          <div>
            <strong>RED JACKET</strong>
            <small>INTELIGÊNCIA COMERCIAL</small>
          </div>
        </div>
        <div className={styles.pitch}>
          <p className={styles.eyebrow}>DECISÕES COM CLAREZA</p>
          <h1>
            Seu negócio,
            <br />
            <em>mais inteligente.</em>
          </h1>
          <p>Uma base segura e modular para transformar dados em direção.</p>
        </div>
        <div className={styles.security}>
          <ShieldCheck size={18} />
          <span>Ambiente protegido pelo Supabase Auth</span>
        </div>
      </section>
      <section className={styles.access}>
        <form
          className={styles.card}
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className={styles.lock}>
            <LockKeyhole size={22} />
          </div>
          <p className={styles.eyebrow}>ACESSO RESTRITO</p>
          <h2>Bem-vindo.</h2>
          <p>Entre com suas credenciais para continuar.</p>
          {!configured && (
            <div className={styles.notice}>
              A autenticação ainda precisa receber as credenciais do Supabase.
              Consulte o arquivo <code>.env.example</code>.
            </div>
          )}
          <label>
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              required
              disabled={!configured}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              disabled={!configured}
            />
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className={styles.success} role="status">
              {message}
            </p>
          )}
          <button type="submit" disabled={!configured || submitting}>
            {submitting ? 'Entrando…' : 'Entrar'}
            <ArrowRight size={18} />
          </button>
          <button
            className={styles.reset}
            type="button"
            disabled={!configured || submitting}
            onClick={() => void handlePasswordReset()}
          >
            Definir ou recuperar senha
          </button>
          <small>Contas são criadas somente por administradores.</small>
        </form>
      </section>
    </main>
  );
}
