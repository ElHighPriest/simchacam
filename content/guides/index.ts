import howToLivestreamWedding from "./how-to-livestream-a-wedding-for-family-abroad";
import whyIStartedSimchaCam from "./why-i-started-simchacam";
import type { Guide } from "./types";

export const guides: Guide[] = [
  howToLivestreamWedding,
  whyIStartedSimchaCam,
].sort(
  (a, b) =>
    new Date(b.publishedDate).getTime() -
    new Date(a.publishedDate).getTime()
);

export function getGuideBySlug(slug: string) {
  return guides.find((guide) => guide.slug === slug);
}
