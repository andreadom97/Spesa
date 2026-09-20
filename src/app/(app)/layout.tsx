import type { ReactNode } from 'react';
import { PrimoAvvio } from '@/components/PrimoAvvio';
import { Guscio } from '@/components/Guscio';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Guscio>
      <PrimoAvvio>{children}</PrimoAvvio>
    </Guscio>
  );
}
