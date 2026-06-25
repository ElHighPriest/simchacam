import type { Metadata } from "next";
import PrivacyPage from "@/app/privacy/page";
import HebrewPrivacyPolicy from "@/app/components/HebrewPrivacyPolicy";
import { isLocale, type Locale } from "@/lib/i18n";
import { createPublicPageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: value } = await params;
  const locale: Locale = isLocale(value) ? value : "en";

  const title =
    locale === "he"
      ? "מדיניות פרטיות | SimchaCam"
      : "Privacy Policy | SimchaCam";
  const description =
    locale === "he"
      ? "כיצד SimchaCam מטפלת בפרטי חשבון, שידורים פרטיים, הקלטות ופרטיות באירועים משפחתיים."
      : "Read how SimchaCam handles account information, private event livestreams, recordings, and family-event privacy.";

  return createPublicPageMetadata({
    title,
    description,
    canonicalPath: `/${locale}/privacy`,
    locale: locale === "he" ? "he_IL" : "en_GB",
    alternatePath: locale === "he" ? "/en/privacy" : "/he/privacy",
    alternateLocale: locale === "he" ? "en_GB" : "he_IL",
    imageAlt:
      locale === "he"
        ? "מדיניות הפרטיות של SimchaCam"
        : "SimchaCam privacy policy",
  });
}

export default async function LocalizedPrivacyPage({ params }: Props) {
  const { locale: value } = await params;

  return value === "he" ? <HebrewPrivacyPolicy /> : <PrivacyPage />;
}
