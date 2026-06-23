import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset Your Password | SimchaCam",
  description:
    "Request a secure password reset email for your SimchaCam account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
