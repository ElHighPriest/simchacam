import type { ReactNode } from "react";

export type Guide = {
  title: string;
  slug: string;
  excerpt: string;
  publishedDate: string;
  author: string;
  readingTime: string;
  featuredImage?: string;
  seoTitle: string;
  seoDescription: string;
  content: ReactNode;
};
