import type { Metadata } from "next";
import AuthPage from "@/app/auth/page";
import { getMessages, isLocale, type Locale } from "@/lib/i18n";

type LocalizedAuthPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: LocalizedAuthPageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";
  const messages = getMessages(locale);

  return {
    title: messages.auth.metadataTitle,
    description: messages.auth.metadataDescription,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function LocalizedAuthPage() {
  return <AuthPage />;
}
