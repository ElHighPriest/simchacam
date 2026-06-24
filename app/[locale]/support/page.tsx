import type { Metadata } from "next";
import SupportPageContent from "@/app/components/SupportPageContent";
import { getMessages, isLocale, type Locale } from "@/lib/i18n";

type LocalizedSupportPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedSupportPageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";
  const messages = getMessages(locale);

  return {
    title: messages.support.metadataTitle,
    description: messages.support.metadataDescription,
  };
}

export default async function LocalizedSupportPage({
  params,
}: LocalizedSupportPageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";

  return <SupportPageContent locale={locale} />;
}
