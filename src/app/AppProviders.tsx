import type { PropsWithChildren } from 'react';
import { AuthProvider } from '../features/auth/AuthProvider';
import { ThemeProvider } from '../features/theme/ThemeProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
}
