import { Check, KeyRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from './useAuth';
import styles from './PasswordSetupPage.module.css';

export function PasswordSetupPage() {
  const { completePasswordSetup } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Use pelo menos 8 caracteres.');
      return;
    }
    if (password !== confirmation) {
      setError('As senhas não são iguais.');
      return;
    }
    setSaving(true);
    try {
      await completePasswordSetup(password);
    } catch {
      setError('Não foi possível salvar a senha. Abra novamente o convite.');
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <form
        className={styles.card}
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className={styles.icon}>
          <KeyRound />
        </div>
        <p>PRIMEIRO ACESSO</p>
        <h1>Defina sua senha.</h1>
        <span>
          Ela será armazenada com segurança pelo Supabase e não ficará no
          código.
        </span>
        <label>
          Nova senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label>
          Confirmar senha
          <input
            type="password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}
        <button type="submit" disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar senha'}
          <Check size={18} />
        </button>
      </form>
    </main>
  );
}
