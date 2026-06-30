import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import {
  Assistant,
  Cormorant_Garamond,
  Geist,
  Geist_Mono,
  Heebo,
} from "next/font/google";
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

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const assistant = Assistant({
  variable: "--font-assistant",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const siteUrl = "https://simcha.cam";
const defaultTitle = "SimchaCam | Private Livestreaming for Simchas";
const defaultDescription =
  "Private, simple livestreaming for weddings, bar mitzvahs, brit milahs and family simchas. Share one secure link so relatives can watch from anywhere.";
const defaultSocialImage = `${siteUrl}/og/homepage-social.png`;
const defaultSocialImageSize = {
  width: 1402,
  height: 1122,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: "SimchaCam",
  title: defaultTitle,
  description: defaultDescription,
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: siteUrl,
    siteName: "SimchaCam",
    type: "website",
    images: [
      {
        url: defaultSocialImage,
        width: defaultSocialImageSize.width,
        height: defaultSocialImageSize.height,
        alt: "SimchaCam private livestreaming for family simchas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [defaultSocialImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
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
      className={`${geistSans.variable} ${geistMono.variable} ${cormorant.variable} ${heebo.variable} ${assistant.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
