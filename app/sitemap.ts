import type { MetadataRoute } from "next";

const siteUrl = "https://simcha.cam";
const socialImage = `${siteUrl}/simchacam-social.png`;

const publicRoutes = [
  {
    path: "/en",
    changeFrequency: "weekly",
    priority: 1,
    images: [socialImage],
  },
  {
    path: "/he",
    changeFrequency: "weekly",
    priority: 1,
    images: [socialImage],
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
  },
  {
    path: "/he/support",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/en/privacy",
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    path: "/he/privacy",
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    path: "/en/terms",
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    path: "/he/terms",
    changeFrequency: "yearly",
    priority: 0.4,
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
  }));
}
