import type { Metadata } from "next";
import PrivacyPage from "@/app/privacy/page";
import HebrewPrivacyPolicy from "@/app/components/HebrewPrivacyPolicy";
import { isLocale, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: value } = await params;
  const locale: Locale = isLocale(value) ? value : "en";

  return locale === "he"
    ? {
        title: "מדיניות פרטיות | SimchaCam",
        description:
          "כיצד SimchaCam מטפלת בפרטי חשבון, שידורים פרטיים, הקלטות ופרטיות באירועים משפחתיים.",
      }
    : {
        title: "Privacy Policy | SimchaCam",
        description:
          "Read how SimchaCam handles account information, private event livestreams, recordings, and family-event privacy.",
      };
}

export default async function LocalizedPrivacyPage({ params }: Props) {
  const { locale: value } = await params;

  return value === "he" ? <HebrewPrivacyPolicy /> : <PrivacyPage />;
}
