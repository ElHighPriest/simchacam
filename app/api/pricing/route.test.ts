import { describe, expect, it, vi } from "vitest";
import { createPricingResponse } from "./route";

describe("GET /api/pricing", () => {
  it("returns the canonical Premium pricing envelope", async () => {
    const premium = {
      GBP: { currency: "GBP", amount: 999, formatted: "£9.99" },
      ILS: { currency: "ILS", amount: 3900, formatted: "₪39" },
      USD: { currency: "USD", amount: 1299, formatted: "$12.99" },
      EUR: { currency: "EUR", amount: 1199, formatted: "11,99 €" },
    } as const;
    const response = await createPricingResponse(async () => premium);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ premium });
    expect(response.headers.get("Cache-Control")).toContain("max-age=900");
  });

  it("returns a structured unavailable response without cached pricing", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await createPricingResponse(async () => {
      throw new Error("Stripe unavailable");
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: {
        code: "PRICING_UNAVAILABLE",
        message: "Pricing is temporarily unavailable",
      },
    });
    errorLog.mockRestore();
  });
});
