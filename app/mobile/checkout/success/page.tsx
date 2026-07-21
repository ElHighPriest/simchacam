import type { Metadata } from "next";
import MobileCheckoutReturn from "../MobileCheckoutReturn";

export const metadata: Metadata = {
  title: "Premium checkout complete | SimchaCam",
  robots: { index: false, follow: false },
};

export default async function MobileCheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { eventId } = await searchParams;
  return <MobileCheckoutReturn result="success" eventId={eventId} />;
}
