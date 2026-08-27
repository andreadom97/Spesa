import type { ReactNode } from 'react';
import { TabBar } from '@/components/TabBar';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <main style={{ flex: 1, overflowY: 'auto' }}>{children}</main>
      <TabBar />
    </div>
  );
}
