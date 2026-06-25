import type { Metadata } from "next";
import SupportPageContent from "@/app/components/SupportPageContent";
import { createPublicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPublicPageMetadata({
  title: "Support | SimchaCam",
  description:
    "Contact SimchaCam support for help, questions, feedback, or livestream issues.",
  canonicalPath: "/en/support",
  alternatePath: "/he/support",
  alternateLocale: "he_IL",
});

export default function SupportPage() {
  return <SupportPageContent />;
}
