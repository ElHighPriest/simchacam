import type { Metadata } from "next";
import TermsPage from "@/app/terms/page";
import HebrewTermsOfService from "@/app/components/HebrewTermsOfService";
import { isLocale, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: value } = await params;
  const locale: Locale = isLocale(value) ? value : "en";

  return locale === "he"
    ? {
        title: "תנאי שימוש | SimchaCam",
        description:
          "תנאי השימוש של SimchaCam לשידורי אירועים פרטיים, הקלטה, צפייה חוזרת והורדה.",
      }
    : {
        title: "Terms of Service | SimchaCam",
        description:
          "Read the SimchaCam terms for private family-event livestreaming, Premium recording, replay, and download features.",
      };
}

export default async function LocalizedTermsPage({ params }: Props) {
  const { locale: value } = await params;

  return value === "he" ? <HebrewTermsOfService /> : <TermsPage />;
}
