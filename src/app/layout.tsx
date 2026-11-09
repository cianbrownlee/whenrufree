import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteDescription =
  "Pick a date range and a daily time window, share the link, and see when everyone is free. No accounts needed.";

export const metadata: Metadata = {
  // Vercel sets this to the project's production domain; the fallback is the current address.
  metadataBase: new URL(
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "whenrufree-rouge.vercel.app"}`,
  ),
  title: "whenrufree",
  description: siteDescription,
  openGraph: {
    title: "whenrufree",
    description: siteDescription,
    siteName: "whenrufree",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "whenrufree",
    description: siteDescription,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
