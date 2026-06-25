import type { Metadata } from "next";
import OAuthCallbackClient from "@/app/auth/OAuthCallbackClient";
import { getMessages, isLocale, type Locale } from "@/lib/i18n";

type OAuthCallbackPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: OAuthCallbackPageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";

  return {
    title: `${getMessages(locale).auth.oauthCompleting} | SimchaCam`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function OAuthCallbackPage({
  params,
}: OAuthCallbackPageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";

  return <OAuthCallbackClient locale={locale} />;
}
