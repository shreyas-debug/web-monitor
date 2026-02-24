import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Web Monitor + Summary",
  description:
    "Monitor webpages for changes and get AI-powered summaries of what changed. Track pricing pages, docs, policies, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100 min-h-screen`}
      >
        {/* Navigation Header */}
        <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-lg">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg text-zinc-100 hover:text-indigo-400 transition-colors"
            >
              <svg
                className="h-5 w-5 text-indigo-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              WebMonitor
            </Link>

            <nav className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/status"
                className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                Status
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
