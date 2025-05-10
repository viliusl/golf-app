import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import '@/lib/config';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Golf Tournament Scorecard",
  description: "Live scores and standings for golf tournaments",
};

// This layout completely replaces the root layout for the scores route
export default function ScoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      {children}
    </div>
  );
} 