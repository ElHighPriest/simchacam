import type { Metadata } from "next";
import ResetPasswordPage from "@/app/reset-password/page";
import { getMessages, isLocale, type Locale } from "@/lib/i18n";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: value } = await params;
  const locale: Locale = isLocale(value) ? value : "en";
  const t = getMessages(locale).resetPassword;

  return {
    title: t.metadataTitle,
    description: t.metadataDescription,
    robots: { index: false, follow: false },
  };
}

export default function LocalizedResetPasswordPage() {
  return <ResetPasswordPage />;
}
