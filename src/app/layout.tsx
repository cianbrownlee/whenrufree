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
  "Find when everyone's free. Create a room, share the link, and pick the best time together.";

export const metadata: Metadata = {
  metadataBase: new URL("https://whenrufree.vercel.app"),
  title: "when r u free",
  description: siteDescription,
  openGraph: {
    title: "when r u free",
    description: siteDescription,
    siteName: "when r u free",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "when r u free",
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
