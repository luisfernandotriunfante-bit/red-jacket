import {
  Boxes,
  ChartNoAxesCombined,
  Megaphone,
  UsersRound,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { EmptyModulePage } from './EmptyModulePage';

const modules = {
  '/sell-out/gerencial': {
    title: 'Gerencial',
    description:
      'A visão de desempenho das equipes será construída nesta etapa.',
    icon: ChartNoAxesCombined,
  },
  '/sell-out/clientes': {
    title: 'Clientes do Sell Out',
    description: 'A análise comercial por cliente será construída nesta etapa.',
    icon: UsersRound,
  },
  '/estoque': {
    title: 'Estoque',
    description: 'A gestão de estoque será construída nesta etapa.',
    icon: Boxes,
  },
  '/clientes': {
    title: 'Clientes',
    description: 'A visão central de clientes será construída nesta etapa.',
    icon: UsersRound,
  },
  '/campanhas': {
    title: 'Campanhas',
    description: 'O acompanhamento de campanhas será construído nesta etapa.',
    icon: Megaphone,
  },
} as const;

export function BlankWorkspace() {
  const { pathname } = useLocation();
  const module =
    modules[pathname as keyof typeof modules] ?? modules['/estoque'];
  return <EmptyModulePage {...module} />;
}
