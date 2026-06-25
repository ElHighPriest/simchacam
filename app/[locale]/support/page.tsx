import type { Metadata } from "next";
import SupportPageContent from "@/app/components/SupportPageContent";
import { getMessages, isLocale, type Locale } from "@/lib/i18n";
import { createPublicPageMetadata } from "@/lib/seo";

type LocalizedSupportPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedSupportPageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";
  const messages = getMessages(locale);

  return createPublicPageMetadata({
    title: messages.support.metadataTitle,
    description: messages.support.metadataDescription,
    canonicalPath: `/${locale}/support`,
    locale: locale === "he" ? "he_IL" : "en_GB",
    alternatePath: locale === "he" ? "/en/support" : "/he/support",
    alternateLocale: locale === "he" ? "en_GB" : "he_IL",
    imageAlt:
      locale === "he"
        ? "SimchaCam - תמיכה בשידורים חיים פרטיים"
        : "SimchaCam support for private family livestreams",
  });
}

export default async function LocalizedSupportPage({
  params,
}: LocalizedSupportPageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";

  return <SupportPageContent locale={locale} />;
}
