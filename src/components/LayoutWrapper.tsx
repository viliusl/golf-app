'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

// Use dynamic import with no SSR for the sidebar
const SidebarWrapper = dynamic(() => import('./SidebarWrapper'), { ssr: false });

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Check if we're on a scores page
  const isScoresPage = !pathname || pathname === '/scores' || pathname.startsWith('/scores/');
  
  if (isScoresPage) {
    // For scores pages, just render the children directly without the flex layout
    return children;
  }
  
  // For other pages, render the sidebar layout
  return (
    <div className="flex min-h-screen">
      <SidebarWrapper />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
} 