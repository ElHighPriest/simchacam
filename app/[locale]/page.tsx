import type { Metadata } from "next";
import Home from "@/app/page";
import { getMessages, isLocale, locales, type Locale } from "@/lib/i18n";

type LocalizedHomePageProps = {
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: LocalizedHomePageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";
  const messages = getMessages(locale);

  return {
    title:
      locale === "he"
        ? "SimchaCam | שידור חי פרטי לשמחות"
        : "SimchaCam | Simple livestreaming for simchas",
    description: messages.hero.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        he: "/he",
      },
    },
    openGraph: {
      title:
        locale === "he"
          ? "SimchaCam | שידור חי פרטי לשמחות"
          : "SimchaCam | Simple livestreaming for simchas",
      description: messages.hero.description,
      url: `https://simcha.cam/${locale}`,
      siteName: "SimchaCam",
      locale: locale === "he" ? "he_IL" : "en_GB",
      type: "website",
      images: [
        {
          url: "/simchacam-social.png",
          width: 1200,
          height: 630,
          alt: "SimchaCam - Simple livestreaming for simchas",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title:
        locale === "he"
          ? "SimchaCam | שידור חי פרטי לשמחות"
          : "SimchaCam | Simple livestreaming for simchas",
      description: messages.hero.description,
      images: ["/simchacam-social.png"],
    },
  };
}

export default function LocalizedHomePage() {
  return <Home />;
}
