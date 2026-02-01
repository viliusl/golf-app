'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function SidebarWrapper() {
  return (
    <div className="w-64 bg-brand-dark text-white p-4">
      <div className="mb-8">
        <Link href="/" className="block py-2">
          <Image
            src="/logo-light.svg"
            alt="DGL.ONLINE"
            width={224}
            height={80}
            className="h-14 w-full object-contain"
            priority
          />
        </Link>
      </div>
      <nav>
        <ul className="space-y-1">
          <li>
            <Link
              href="/tournaments"
              className="flex items-center p-2 rounded-md hover:bg-gray-500 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-3 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              Tournaments
            </Link>
          </li>
          <li>
            <Link
              href="/"
              className="flex items-center p-2 rounded-md hover:bg-gray-500 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-3 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Events
            </Link>
          </li>
          <li>
            <Link
              href="/teams"
              className="flex items-center p-2 rounded-md hover:bg-gray-500 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-3 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Teams
            </Link>
          </li>
          <li>
            <Link
              href="/players"
              className="flex items-center p-2 rounded-md hover:bg-gray-500 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-3 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Players
            </Link>
          </li>
          <li>
            <Link
              href="/courses"
              className="flex items-center p-2 rounded-md hover:bg-gray-500 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-3 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                />
              </svg>
              Courses
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
