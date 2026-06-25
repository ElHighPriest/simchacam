import type { Metadata } from "next";
import Home from "@/app/page";
import { isLocale, locales, type Locale } from "@/lib/i18n";

const siteUrl = "https://simcha.cam";
const socialImage = "/simchacam-social.png";
const englishTitle = "SimchaCam | Private Livestreaming for Simchas";
const englishDescription =
  "Private, simple livestreaming for weddings, bar mitzvahs, brit milahs and family simchas. Share one secure link so relatives can watch from anywhere.";
const hebrewTitle = "SimchaCam | שידור חי פרטי לשמחות";
const hebrewDescription =
  "שידור חי פרטי ופשוט לחתונות, בר ובת מצווה, בריתות ושמחות משפחתיות. שתפו קישור מאובטח אחד כדי שקרובים יוכלו לצפות מכל מקום.";

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
  const title = locale === "he" ? hebrewTitle : englishTitle;
  const description =
    locale === "he" ? hebrewDescription : englishDescription;
  const canonicalUrl = `${siteUrl}/${locale}`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        "en-GB": "/en",
        "he-IL": "/he",
        "x-default": "/en",
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "SimchaCam",
      locale: locale === "he" ? "he_IL" : "en_GB",
      alternateLocale: locale === "he" ? ["en_GB"] : ["he_IL"],
      type: "website",
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt:
            locale === "he"
              ? "SimchaCam - שידור חי פרטי לשמחות"
              : "SimchaCam private livestreaming for family simchas",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function LocalizedHomePage({
  params,
}: LocalizedHomePageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = isLocale(localeParam) ? localeParam : "en";
  const isHebrew = locale === "he";
  const pageUrl = `${siteUrl}/${locale}`;
  const description = isHebrew ? hebrewDescription : englishDescription;
  const priceCurrency = isHebrew ? "ILS" : "GBP";
  const premiumPrice = isHebrew ? "39" : "9.99";
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "SimchaCam",
      description,
      inLanguage: isHebrew ? "he-IL" : "en-GB",
      publisher: {
        "@id": `${siteUrl}/#organization`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "SimchaCam",
      url: siteUrl,
      logo: `${siteUrl}/simchacam-logo.svg`,
      email: "support@simcha.cam",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": `${pageUrl}#application`,
      name: "SimchaCam",
      url: pageUrl,
      description,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      inLanguage: isHebrew ? "he-IL" : "en-GB",
      offers: [
        {
          "@type": "Offer",
          name: isHebrew ? "תוכנית חינמית" : "Free plan",
          price: "0",
          priceCurrency,
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: isHebrew ? "שדרוג Premium לאירוע" : "Premium event upgrade",
          price: premiumPrice,
          priceCurrency,
          availability: "https://schema.org/InStock",
        },
      ],
      featureList: isHebrew
        ? [
            "קישור פרטי לאירוע",
            "צפייה ללא התקנת אפליקציה",
            "הגנה בסיסמה",
            "הקלטה וצפייה חוזרת באירועי Premium",
          ]
        : [
            "Private event links",
            "No app required for viewers",
            "Optional password protection",
            "Premium recording and replay",
          ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <Home />
    </>
  );
}
