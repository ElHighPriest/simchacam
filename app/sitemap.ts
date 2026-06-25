import type { MetadataRoute } from "next";

const siteUrl = "https://simcha.cam";
const socialImage = `${siteUrl}/simchacam-social.png`;

const publicRoutes = [
  {
    path: "/en",
    changeFrequency: "weekly",
    priority: 1,
    images: [socialImage],
    languages: {
      "en-GB": `${siteUrl}/en`,
      "he-IL": `${siteUrl}/he`,
    },
  },
  {
    path: "/he",
    changeFrequency: "weekly",
    priority: 1,
    images: [socialImage],
    languages: {
      "en-GB": `${siteUrl}/en`,
      "he-IL": `${siteUrl}/he`,
    },
  },
  {
    path: "/how-it-works",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/pricing",
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    path: "/en/support",
    changeFrequency: "monthly",
    priority: 0.6,
    languages: {
      "en-GB": `${siteUrl}/en/support`,
      "he-IL": `${siteUrl}/he/support`,
    },
  },
  {
    path: "/he/support",
    changeFrequency: "monthly",
    priority: 0.6,
    languages: {
      "en-GB": `${siteUrl}/en/support`,
      "he-IL": `${siteUrl}/he/support`,
    },
  },
  {
    path: "/en/privacy",
    changeFrequency: "yearly",
    priority: 0.4,
    languages: {
      "en-GB": `${siteUrl}/en/privacy`,
      "he-IL": `${siteUrl}/he/privacy`,
    },
  },
  {
    path: "/he/privacy",
    changeFrequency: "yearly",
    priority: 0.4,
    languages: {
      "en-GB": `${siteUrl}/en/privacy`,
      "he-IL": `${siteUrl}/he/privacy`,
    },
  },
  {
    path: "/en/terms",
    changeFrequency: "yearly",
    priority: 0.4,
    languages: {
      "en-GB": `${siteUrl}/en/terms`,
      "he-IL": `${siteUrl}/he/terms`,
    },
  },
  {
    path: "/he/terms",
    changeFrequency: "yearly",
    priority: 0.4,
    languages: {
      "en-GB": `${siteUrl}/en/terms`,
      "he-IL": `${siteUrl}/he/terms`,
    },
  },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return publicRoutes.map((route) => ({
    url: `${siteUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    ...("images" in route ? { images: [...route.images] } : {}),
    ...("languages" in route
      ? { alternates: { languages: route.languages } }
      : {}),
  }));
}
