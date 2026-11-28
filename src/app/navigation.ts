import {
  Boxes,
  ChartNoAxesCombined,
  Megaphone,
  Settings,
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
    path: '/estoque/resumo',
    rootPath: '/estoque',
    label: 'Estoque',
    icon: Boxes,
    tabs: [
      { path: '/estoque/resumo', label: 'Resumo' },
      { path: '/estoque/produtos', label: 'Produtos' },
      { path: '/estoque/itens-de-foco', label: 'Itens de foco' },
      { path: '/estoque/notas', label: 'Notas' },
    ],
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
  {
    path: '/configuracoes/motores',
    rootPath: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    tabs: [
      { path: '/configuracoes/motores', label: 'Motores' },
      { path: '/configuracoes/auditoria', label: 'Auditoria' },
      { path: '/configuracoes/equipe', label: 'Equipe' },
      {
        path: '/configuracoes/ajustes-comerciais',
        label: 'Ajustes comerciais',
      },
      { path: '/configuracoes/competencias', label: 'Competências' },
    ],
  },
] as const;
