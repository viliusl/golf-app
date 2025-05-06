import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import '@/lib/config';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Golf Tournament Scorecard",
  description: "Live scores and standings for golf tournaments",
};

export default function ScoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen">
          {/* Main content without sidebar */}
          <div className="w-full">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
} 