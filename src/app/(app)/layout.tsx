import dynamic from 'next/dynamic';

// Use dynamic import with no SSR for the layout wrapper
const LayoutWrapper = dynamic(() => import('@/components/LayoutWrapper'), { ssr: false });

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LayoutWrapper>{children}</LayoutWrapper>;
} 