import {
  Boxes,
  ChartNoAxesCombined,
  Megaphone,
  PackageSearch,
  Settings,
  UsersRound,
} from 'lucide-react';

export const navigation = [
  {
    path: '/sell-out',
    label: 'Sell out',
    description: 'Acompanhamento comercial',
    icon: ChartNoAxesCombined,
  },
  {
    path: '/estoque',
    label: 'Estoque',
    description: 'Posição e cobertura',
    icon: Boxes,
  },
  {
    path: '/clientes',
    label: 'Clientes',
    description: 'Carteira comercial',
    icon: UsersRound,
  },
  {
    path: '/produtos',
    label: 'Produtos',
    description: 'Catálogo e portfólio',
    icon: PackageSearch,
  },
  {
    path: '/campanhas',
    label: 'Campanhas',
    description: 'Ações comerciais',
    icon: Megaphone,
  },
  {
    path: '/configuracoes',
    label: 'Configurações',
    description: 'Preferências do sistema',
    icon: Settings,
  },
] as const;
