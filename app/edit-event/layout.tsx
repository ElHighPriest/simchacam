import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Event | SimchaCam",
  description:
    "Update a SimchaCam event name, password, scheduling details, and Premium settings.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function EditEventLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
