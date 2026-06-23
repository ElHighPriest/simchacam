import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Events | SimchaCam",
  description:
    "Manage your SimchaCam livestream events, share private links, and access recordings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MyEventsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
