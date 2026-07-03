import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | SimchaCam",
  description: "Internal SimchaCam operations dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
