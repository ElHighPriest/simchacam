"use client";

import { useEffect } from "react";

type CheckoutResult = "success" | "cancel";

export default function MobileCheckoutReturn({
  result,
  eventId,
}: {
  result: CheckoutResult;
  eventId?: string;
}) {
  const isSuccess = result === "success";
  const query = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
  const appUrl = `simchacam://checkout/${result}${query}`;

  useEffect(() => {
    window.location.replace(appUrl);
  }, [appUrl]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-warm-white px-6 py-12">
      <section className="w-full max-w-md rounded-3xl border border-navy/10 bg-white p-8 text-center shadow-sm">
        <p className="font-display text-3xl font-semibold text-navy">SimchaCam</p>
        <h1 className="mt-6 text-2xl font-semibold text-navy">
          {isSuccess ? "Payment received" : "Checkout cancelled"}
        </h1>
        <p className="mt-3 leading-7 text-muted-navy">
          {isSuccess
            ? "Return to SimchaCam to confirm that Premium is ready."
            : "You can return to SimchaCam and upgrade again whenever you are ready."}
        </p>
        <a
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-navy px-6 py-3 font-semibold text-white"
          href={appUrl}
        >
          Open SimchaCam
        </a>
        <p className="mt-5 text-sm text-muted-navy">
          If the app does not open, this page can be closed safely.
        </p>
      </section>
    </main>
  );
}
