import type { Metadata } from "next";
import MobileCheckoutReturn from "../MobileCheckoutReturn";

export const metadata: Metadata = {
  title: "Premium checkout cancelled | SimchaCam",
  robots: { index: false, follow: false },
};

export default async function MobileCheckoutCancelPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { eventId } = await searchParams;
  return <MobileCheckoutReturn result="cancel" eventId={eventId} />;
}
