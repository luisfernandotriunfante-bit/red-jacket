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
          <p>EM CONSTRUÇÃO</p>
          <h1>{title}</h1>
          <span>{description}</span>
        </div>
      </header>
      <div className={styles.empty}>
        <Construction size={28} />
        <h2>Esta página ainda não foi desenhada</h2>
        <p>
          O espaço está reservado e será desenvolvido após a aprovação do estado
          atual.
        </p>
      </div>
    </section>
  );
}
