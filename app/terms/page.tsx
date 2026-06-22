import type { Metadata } from "next";
import LegalPage from "@/app/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service | SimchaCam",
  description: "SimchaCam terms of service",
};

export default function TermsPage() {
  return (
    <LegalPage
      draftNotice={null}
      eyebrow="Using SimchaCam"
      title="Terms of Service"
      introduction="These terms govern the use of SimchaCam by event hosts, account holders and invited viewers. Please read them before creating or accessing an event."
      lastUpdated="22 June 2026"
      sections={[
        {
          heading: "1. About SimchaCam",
          body: (
            <>
              SimchaCam is an online service for private livestreaming of family
              events. It provides tools for event hosts to create private event
              pages, share livestream links with invited viewers, and may offer
              optional paid recording, replay and download features.
              <br />
              <br />
              For support, contact{" "}
              <a
                href="mailto:support@simcha.cam"
                className="font-semibold text-navy underline decoration-gold/60 underline-offset-4 transition hover:text-gold"
              >
                support@simcha.cam
              </a>
              .
            </>
          ),
        },
        {
          heading: "2. Accepting these terms",
          body: "By creating an account, hosting an event, purchasing a feature, or accessing an event, you agree to these terms. If you do not agree, do not use SimchaCam. You must be at least 18 to create an account or buy a paid feature, unless a parent or legal guardian does so on your behalf.",
        },
        {
          heading: "3. Accounts",
          body: "You must provide accurate information, confirm your email address, keep your login details secure, and tell us promptly if you believe your account has been compromised. You are responsible for activity carried out through your account unless caused by our failure to use reasonable care and skill.",
        },
        {
          heading: "4. Host responsibilities and consent",
          body: "A host must have the right to livestream the event and must comply with applicable laws, venue rules and agreements. The host is responsible for giving appropriate notice to attendees and obtaining any consent required for livestreaming or recording, including consent from a parent or guardian where required for children. Hosts should provide practical ways for people who do not wish to appear to avoid the camera where reasonably possible.",
        },
        {
          heading: "5. Acceptable use",
          body: "You must not use SimchaCam for unlawful, abusive, threatening, defamatory, discriminatory, exploitative or deliberately harmful content; content that infringes privacy, confidentiality, copyright or other rights; unauthorised surveillance; or attempts to disrupt, probe, bypass or misuse the service. You must not share an event, recording or download beyond the permission given by the host.",
        },
        {
          heading: "6. Private access",
          body: "Private links, event passwords and signed recording links are intended for invited viewers. They are not a guarantee that content cannot be copied or redistributed. Hosts and viewers must protect access details and tell us promptly about suspected unauthorised access. We may revoke links or access where reasonably necessary to protect an event or the service.",
        },
        {
          heading: "7. Livestream availability",
          body: "Livestreaming depends on the host's device, camera and microphone permissions, internet connection, viewer connections, and third-party infrastructure. We will provide the service with reasonable care and skill, but we do not promise an uninterrupted stream, a particular resolution or bitrate, compatibility with every device, or that every attempted event will be successfully delivered or recorded.",
        },
        {
          heading: "8. Recording, replay and download",
          body: "Recording is an optional feature and may require payment or a specific entitlement. When enabled, SimchaCam may automatically start and stop a recording with the host's livestream. A recording may take time to process and can fail because of technical or connectivity issues. Ready recordings are normally available for up to 30 days, after which they may be permanently deleted. Anyone who downloads a recording is responsible for storing and sharing that copy lawfully.",
        },
        {
          heading: "9. Prices, payment and cancellation",
          body: "Prices and the features included will be shown before purchase. Any payment terms, taxes, cancellation rights and refund information displayed at checkout form part of these terms. Nothing in these terms affects statutory consumer rights. Where a digital service begins immediately at your request, any effect on a statutory cancellation right must be clearly explained and agreed at checkout before payment is taken.",
        },
        {
          heading: "10. Intellectual property",
          body: "Hosts and attendees keep their rights in event content. The host gives SimchaCam a limited permission to transmit, process, store and make that content available only as needed to provide the requested service. SimchaCam and its licensors retain rights in the website, software, branding and service design. You may not copy, reverse engineer or commercially exploit those materials except where the law permits.",
        },
        {
          heading: "11. Suspension and termination",
          body: "We may restrict, suspend or end access where we reasonably believe these terms have been breached, an event creates legal or security risk, payment is due, or action is needed to protect users or the service. Where appropriate, we will try to give notice and an opportunity to resolve the issue. You may stop using SimchaCam at any time and may contact us about closing your account.",
        },
        {
          heading: "12. Our responsibility to consumers",
          body: "We are responsible for loss or damage that is a foreseeable result of our breach of these terms or failure to use reasonable care and skill. We are not responsible for loss caused by matters outside our reasonable control, by your device or connection, by another user's actions, or by your failure to follow reasonable instructions, except where the law says otherwise. SimchaCam is intended for personal family-event use, and we are not responsible for business losses such as lost profit, revenue, opportunity or goodwill.",
        },
        {
          heading: "13. Limits that always apply",
          body: "Nothing in these terms excludes or limits liability where it would be unlawful to do so, including liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or rights and remedies that cannot be excluded under consumer law. Any other limitation in these terms applies only to the extent permitted by law.",
        },
        {
          heading: "14. Third-party services",
          body: "SimchaCam relies on third-party services, including Supabase for authentication and application data, LiveKit for livestreaming and recording services, and Cloudflare R2 for recording storage. We remain responsible for our obligations to you, but third-party faults may affect availability and recovery times.",
        },
        {
          heading: "15. Changes to the service or terms",
          body: "We may update the service and these terms for legal, security, technical or operational reasons. If a change materially disadvantages existing paid users, we will give reasonable notice where practicable. The latest terms and update date will be published here.",
        },
        {
          heading: "16. Governing law and disputes",
          body: (
            <>
              These terms are governed by the laws of England and Wales. If you
              are a consumer living elsewhere in the United Kingdom, you keep
              any mandatory protections available under the law where you live
              and may be entitled to bring proceedings in your local courts.
              Please contact{" "}
              <a
                href="mailto:support@simcha.cam"
                className="font-semibold text-navy underline decoration-gold/60 underline-offset-4 transition hover:text-gold"
              >
                support@simcha.cam
              </a>{" "}
              first so we can try to resolve any dispute.
            </>
          ),
        },
        {
          heading: "17. Contact",
          body: (
            <>
              For support:{" "}
              <a
                href="mailto:support@simcha.cam"
                className="font-semibold text-navy underline decoration-gold/60 underline-offset-4 transition hover:text-gold"
              >
                support@simcha.cam
              </a>
              <br />
              <br />
              For privacy enquiries:{" "}
              <a
                href="mailto:privacy@simcha.cam"
                className="font-semibold text-navy underline decoration-gold/60 underline-offset-4 transition hover:text-gold"
              >
                privacy@simcha.cam
              </a>
            </>
          ),
        },
      ]}
    />
  );
}
