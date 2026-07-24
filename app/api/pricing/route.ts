import { NextResponse } from "next/server";
import { getPremiumPricing } from "@/lib/pricing";

const requiredPricingEnvironmentVariables = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_GBP",
  "STRIPE_PRICE_ILS",
  "STRIPE_PRICE_USD",
  "STRIPE_PRICE_EUR",
] as const;

export async function createPricingResponse(
  loadPricing = getPremiumPricing
) {
  try {
    const premium = await loadPricing();
    return NextResponse.json(
      { premium },
      {
        headers: {
          "Cache-Control": "public, max-age=900, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error("Unable to load Premium pricing", {
      exceptionType:
        error instanceof Error ? error.constructor.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      missingEnvironmentVariables: requiredPricingEnvironmentVariables.filter(
        (name) => !process.env[name]
      ),
    });
    return NextResponse.json(
      {
        error: {
          code: "PRICING_UNAVAILABLE",
          message: "Pricing is temporarily unavailable",
        },
      },
      { status: 503 }
    );
  }
}

export async function GET() {
  return createPricingResponse();
}
