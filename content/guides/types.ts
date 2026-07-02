import type { ReactNode } from "react";

export type Guide = {
  title: string;
  slug: string;
  excerpt: string;
  publishedDate: string;
  author: string;
  readingTime: string;
  featuredImage?: string;
  featuredImageAlt?: string;
  featuredImageWidth?: number;
  featuredImageHeight?: number;
  seoTitle: string;
  seoDescription: string;
  content: ReactNode;
};
