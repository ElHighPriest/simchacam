import type { Metadata } from "next";

export const siteUrl = "https://simcha.cam";
export const socialImage = `${siteUrl}/og/homepage-social.png`;
export const socialImageSize = {
  width: 1402,
  height: 1122,
};

type PublicPageMetadataOptions = {
  title: string;
  description: string;
  canonicalPath: string;
  locale?: "en_GB" | "he_IL";
  alternatePath?: string;
  alternateLocale?: "en_GB" | "he_IL";
  imageAlt?: string;
};

export function createPublicPageMetadata({
  title,
  description,
  canonicalPath,
  locale = "en_GB",
  alternatePath,
  alternateLocale,
  imageAlt = "SimchaCam private livestreaming for family simchas",
}: PublicPageMetadataOptions): Metadata {
  const canonicalUrl = `${siteUrl}${canonicalPath}`;
  const languageAlternates =
    alternatePath && alternateLocale
      ? {
          [locale === "he_IL" ? "he-IL" : "en-GB"]: canonicalPath,
          [alternateLocale === "he_IL" ? "he-IL" : "en-GB"]: alternatePath,
          "x-default": locale === "en_GB" ? canonicalPath : alternatePath,
        }
      : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalPath,
      ...(languageAlternates ? { languages: languageAlternates } : {}),
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "SimchaCam",
      locale,
      ...(alternateLocale ? { alternateLocale: [alternateLocale] } : {}),
      type: "website",
      images: [
        {
          url: socialImage,
          width: socialImageSize.width,
          height: socialImageSize.height,
          alt: imageAlt,
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
