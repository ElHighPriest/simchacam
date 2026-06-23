import type { MetadataRoute } from "next";

const siteUrl = "https://simcha.cam";

const publicRoutes = [
  {
    path: "",
    changeFrequency: "weekly",
    priority: 1,
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
    path: "/support",
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    path: "/privacy",
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    path: "/terms",
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
  }));
}
