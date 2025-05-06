import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@/lib/config'; // Import config to ensure env variables are loaded
import dynamic from 'next/dynamic';

// Use dynamic import with no SSR for the sidebar
const SidebarWrapper = dynamic(() => import('@/components/SidebarWrapper'), { ssr: false });

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Golf App",
  description: "Manage your golf events and teams",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This is a server component, so we can't use pathname directly
  // We'll let the SidebarWrapper handle the conditional rendering
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <SidebarWrapper />
          <div className="flex-1">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
