import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Choose a New Password | SimchaCam",
  description:
    "Set a new password for your SimchaCam account using a secure recovery link.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
