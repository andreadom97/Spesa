import type { ReactNode } from 'react';
import { PrimoAvvio } from '@/components/PrimoAvvio';
import { TabBar } from '@/components/TabBar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <main style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <PrimoAvvio>{children}</PrimoAvvio>
      </main>
      <TabBar />
    </div>
  );
}
