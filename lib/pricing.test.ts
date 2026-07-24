import { beforeEach, describe, expect, it, vi } from "vitest";

const retrieve = vi.hoisted(() => vi.fn());

vi.mock("@/lib/stripe", () => ({
  getStripePricingConfig: () => ({
    client: { prices: { retrieve } },
    premiumPriceIds: {
      gbp: "price_gbp",
      ils: "price_ils",
      usd: "price_usd",
      eur: "price_eur",
    },
  }),
}));

import { getPremiumPricing, resetPricingCacheForTests } from "@/lib/pricing";

const prices = {
  price_gbp: { currency: "gbp", unit_amount: 999, type: "one_time" },
  price_ils: { currency: "ils", unit_amount: 3900, type: "one_time" },
  price_usd: { currency: "usd", unit_amount: 1299, type: "one_time" },
  price_eur: { currency: "eur", unit_amount: 1199, type: "one_time" },
} as const;

describe("Premium pricing", () => {
  beforeEach(() => {
    resetPricingCacheForTests();
    retrieve.mockReset();
    retrieve.mockImplementation(async (id: keyof typeof prices) => prices[id]);
  });

  it("retrieves and formats all configured Stripe prices", async () => {
    const pricing = await getPremiumPricing();

    expect(pricing.GBP).toMatchObject({ currency: "GBP", amount: 999 });
    expect(pricing.ILS).toMatchObject({ currency: "ILS", amount: 3900 });
    expect(pricing.USD).toMatchObject({ currency: "USD", amount: 1299 });
    expect(pricing.EUR).toMatchObject({ currency: "EUR", amount: 1199 });
    expect(pricing.GBP.formatted).toContain("9.99");
    expect(pricing.ILS.formatted).toContain("39");
    expect(pricing.USD.formatted).toContain("12.99");
    expect(pricing.EUR.formatted).toContain("11,99");
  });

  it("uses the in-memory cache within the cache lifetime", async () => {
    await getPremiumPricing();
    await getPremiumPricing();

    expect(retrieve).toHaveBeenCalledTimes(4);
  });

  it("serves stale cached pricing when Stripe is temporarily unavailable", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const now = vi.spyOn(Date, "now").mockReturnValue(1_000);
    const original = await getPremiumPricing();
    now.mockReturnValue(31 * 60 * 1000);
    retrieve.mockRejectedValue(new Error("Stripe unavailable"));

    await expect(getPremiumPricing()).resolves.toEqual(original);
    now.mockRestore();
    errorLog.mockRestore();
  });
});
