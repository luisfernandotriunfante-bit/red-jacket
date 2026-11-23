import type { LucideIcon } from 'lucide-react';
import { Construction } from 'lucide-react';
import styles from './EmptyModulePage.module.css';

interface Props {
  title: string;
  description: string;
  icon: LucideIcon;
}
export function EmptyModulePage({ title, description, icon: Icon }: Props) {
  return (
    <section className={styles.page}>
      <header>
        <div className={styles.icon}>
          <Icon />
        </div>
        <div>
          <p>MÓDULO</p>
          <h1>{title}</h1>
          <span>{description}</span>
        </div>
      </header>
      <div className={styles.empty}>
        <Construction size={28} />
        <h2>Pronto para ser construído</h2>
        <p>
          Esta área está vazia de propósito. Layouts, dados e regras serão
          adicionados somente quando você definir esta etapa.
        </p>
      </div>
    </section>
  );
}
