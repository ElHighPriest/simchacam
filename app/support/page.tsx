import type { Metadata } from "next";
import SupportPageContent from "@/app/components/SupportPageContent";

export const metadata: Metadata = {
  title: "Support | SimchaCam",
  description:
    "Contact SimchaCam support for help, questions, feedback, or livestream issues.",
};

export default function SupportPage() {
  return <SupportPageContent />;
}
