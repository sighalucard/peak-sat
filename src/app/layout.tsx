import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Peak SAT: personalized digital SAT prep", template: "%s · Peak SAT" },
  description: "Personalized digital SAT practice with an AI tutor, spaced review, and realistic full-length tests.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#4338ca" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}>{children}</body>
    </html>
  );
}
