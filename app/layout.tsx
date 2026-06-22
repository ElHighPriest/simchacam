import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = "https://simcha.cam";
const socialImage = "/simchacam-social.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "SimchaCam",
  description: "Simple livestreaming for simchas",
  openGraph: {
    title: "SimchaCam",
    description: "Simple livestreaming for simchas",
    url: siteUrl,
    siteName: "SimchaCam",
    images: [
      {
        url: socialImage,
        width: 1200,
        height: 630,
        alt: "SimchaCam - Simple livestreaming for simchas",
      },
    ],
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SimchaCam",
    description: "Simple livestreaming for simchas",
    images: [socialImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
