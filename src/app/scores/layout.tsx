import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "../globals.css";
import '@/lib/config';

const manrope = Manrope({ 
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "DGL.ONLINE - Leaderboard",
  description: "Live scores and standings for golf tournaments",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
  },
};

// This layout completely replaces the root layout for the scores route
export default function ScoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`${manrope.variable} font-sans min-h-screen bg-gray-50`}>
      {children}
    </div>
  );
} 