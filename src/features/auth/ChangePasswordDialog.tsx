import { Check, KeyRound, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAuth } from './useAuth';
import styles from './ChangePasswordDialog.module.css';

interface Props {
  onClose: () => void;
}

export function ChangePasswordDialog({ onClose }: Props) {
  const { completePasswordSetup } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
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
      setSaved(true);
      setPassword('');
      setConfirmation('');
    } catch {
      setError('Não foi possível alterar a senha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.backdrop} role="presentation">
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-title"
      >
        <button className={styles.close} onClick={onClose} aria-label="Fechar">
          <X />
        </button>
        <div className={styles.icon}>
          <KeyRound />
        </div>
        <p>PERFIL</p>
        <h2 id="password-title">Alterar senha</h2>
        <span>A nova senha substitui imediatamente a anterior.</span>
        {saved ? (
          <div className={styles.success}>
            <Check /> SENHA ATUALIZADA
          </div>
        ) : (
          <form onSubmit={(event) => void handleSubmit(event)}>
            <label>
              Nova senha
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
                autoFocus
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
              {saving ? 'SALVANDO…' : 'SALVAR SENHA'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
