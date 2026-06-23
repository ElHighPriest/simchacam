import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In or Create Account | SimchaCam",
  description:
    "Log in or create a SimchaCam account to host private family-event livestreams.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
