import { describe, expect, it } from "vitest";
import { resolveCheckoutReturnUrls } from "./route";

describe("checkout return URLs", () => {
  it("preserves the default website return URLs", () => {
    expect(resolveCheckoutReturnUrls({ siteUrl: "https://simcha.cam", locale: "en" })).toEqual({
      successUrl: "https://simcha.cam/en/my-events?checkout=success&session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://simcha.cam/en/my-events?checkout=cancelled",
    });
  });

  it("uses canonical mobile return URLs when both are supplied", () => {
    expect(
      resolveCheckoutReturnUrls({
        siteUrl: "https://simcha.cam",
        locale: "en",
        eventId: "event-1",
        successReturnUrl: "https://simcha.cam/mobile/checkout/success",
        cancelReturnUrl: "https://simcha.cam/mobile/checkout/cancel",
      })
    ).toEqual({
      successUrl: "https://simcha.cam/mobile/checkout/success?eventId=event-1",
      cancelUrl: "https://simcha.cam/mobile/checkout/cancel?eventId=event-1",
      originContext: "mobile_app",
    });
  });

  it("rejects partial or untrusted mobile return URLs", () => {
    expect(() =>
      resolveCheckoutReturnUrls({
        siteUrl: "https://simcha.cam",
        locale: "en",
        eventId: "event-1",
        successReturnUrl: "https://evil.example/checkout/success",
        cancelReturnUrl: "https://simcha.cam/mobile/checkout/cancel",
      })
    ).toThrow("Unsupported mobile return URL");
  });
});
