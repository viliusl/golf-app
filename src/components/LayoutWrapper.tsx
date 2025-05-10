'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

// Use dynamic import with no SSR for the sidebar
const SidebarWrapper = dynamic(() => import('./SidebarWrapper'), { ssr: false });

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <SidebarWrapper />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
} 