import {
  Boxes,
  ChartNoAxesCombined,
  Megaphone,
  UsersRound,
} from 'lucide-react';

export const navigation = [
  {
    path: '/sell-out/resumo',
    rootPath: '/sell-out',
    label: 'Sell out',
    icon: ChartNoAxesCombined,
    tabs: [
      { path: '/sell-out/resumo', label: 'Resumo' },
      { path: '/sell-out/gerencial', label: 'Gerencial' },
      { path: '/sell-out/clientes', label: 'Clientes' },
    ],
  },
  {
    path: '/estoque',
    rootPath: '/estoque',
    label: 'Estoque',
    icon: Boxes,
    tabs: [],
  },
  {
    path: '/clientes',
    rootPath: '/clientes',
    label: 'Clientes',
    icon: UsersRound,
    tabs: [],
  },
  {
    path: '/campanhas',
    rootPath: '/campanhas',
    label: 'Campanhas',
    icon: Megaphone,
    tabs: [],
  },
] as const;
