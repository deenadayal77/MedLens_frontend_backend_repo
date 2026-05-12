import type { ReactNode } from 'react';
import { Navbar } from './Navbar';

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div className="min-h-screen relative">
      <div className="ambient-glow" />
      <Navbar />
      <main className="relative z-10 max-w-3xl mx-auto px-4 pt-28 pb-20">
        {children}
      </main>
    </div>
  );
}
