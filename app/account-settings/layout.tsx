import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Settings | SimchaCam",
  description:
    "Manage your SimchaCam account settings and update your password securely.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountSettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
