import { render, screen } from '@testing-library/react';
import { Boxes } from 'lucide-react';
import { expect, test } from 'vitest';
import { EmptyModulePage } from './EmptyModulePage';
test('exibe o módulo sem inventar dados', () => {
  render(
    <EmptyModulePage
      title="Estoque"
      description="Posição e cobertura"
      icon={Boxes}
    />,
  );
  expect(screen.getByRole('heading', { name: 'Estoque' })).toBeInTheDocument();
  expect(screen.getByText(/vazia de propósito/i)).toBeInTheDocument();
});
