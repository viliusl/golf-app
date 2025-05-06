import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@/lib/config'; // Import config to ensure env variables are loaded
import dynamic from 'next/dynamic';

// Use dynamic import with no SSR for the layout wrapper
const LayoutWrapper = dynamic(() => import('@/components/LayoutWrapper'), { ssr: false });

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
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
