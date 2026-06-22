import type { Metadata } from "next";
import LegalPage from "@/app/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy | SimchaCam",
  description: "SimchaCam privacy policy",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your privacy"
      title="Privacy Policy"
      introduction="This policy explains how SimchaCam uses personal information when hosts create private family-event livestreams and when invited viewers watch, replay, or download them."
      lastUpdated="22 June 2026"
      sections={[
        {
          heading: "1. Who we are",
          body: (
            <>
              SimchaCam is an online service for private livestreaming of family
              events.
              <br />
              <br />
              For questions about this policy or how we use personal
              information, contact{" "}
              <a
                href="mailto:privacy@simcha.cam"
                className="font-semibold text-navy underline decoration-gold/60 underline-offset-4 transition hover:text-gold"
              >
                privacy@simcha.cam
              </a>
              .
              <br />
              <br />
              Where SimchaCam decides how and why account and service
              information is used, it acts as the data controller.
            </>
          ),
        },
        {
          heading: "2. Information we use",
          body: "We may use account details such as name, email address, account identifiers and email-verification status; event details such as event name, date, time, link, access settings and status; purchase and entitlement information for paid features; livestream and recording content; and technical information such as IP address, device, browser, connection data, security logs and service errors. We may also receive messages and information you provide when contacting us.",
        },
        {
          heading: "3. How we use information",
          body: "We use personal information to create and manage accounts; verify email addresses; create and protect events; issue host and viewer access; deliver livestreams; provide recording, replay and download features; process and record purchases or entitlements; respond to support requests; prevent misuse; investigate faults and security incidents; maintain and improve reliability; and comply with legal obligations.",
        },
        {
          heading: "4. Our lawful bases",
          body: "Depending on the purpose, we normally rely on performance of our contract with an account holder, our legitimate interests in providing a secure and reliable service, compliance with legal obligations, or consent where we specifically ask for it. Our legitimate interests include protecting accounts and private events, preventing fraud or misuse, troubleshooting, and improving service reliability. We assess whether those interests are overridden by the rights of affected people.",
        },
        {
          heading: "5. Hosts, attendees and consent",
          body: "Hosts decide what event is livestreamed, who receives the private link or password, and whether an available recording feature is used. Hosts must tell attendees that livestreaming or recording will take place and obtain any permission or consent required by law, venue rules or the circumstances. This is particularly important where children, vulnerable people, private religious or family moments, or sensitive information may appear. Viewers must not redistribute access details or recordings without permission.",
        },
        {
          heading: "6. Livestreams and recordings",
          body: "Live video and audio are transmitted to authorised viewers using LiveKit. If a host has recording enabled, the event may be recorded and stored in Cloudflare R2 so authorised viewers can replay or download it. Recordings are intended to remain available for up to 30 days after they become ready, and may be deleted earlier where required for security, legal or operational reasons. Deletion from active systems may not remove temporary backups immediately.",
        },
        {
          heading: "7. Passwords and private links",
          body: "Account authentication is provided through Supabase. Event passwords are stored as salted hashes rather than readable passwords. Private links, passwords and signed recording links reduce casual access but cannot prevent an authorised recipient from sharing them, screen-recording content, or making a downloaded copy. Hosts should share access details carefully.",
        },
        {
          heading: "8. Service providers",
          body: "We use service providers to operate SimchaCam. These include Supabase for account authentication and application data, LiveKit for real-time video streaming and recording services, and Cloudflare R2 for recording storage. Providers may process information on our behalf under their own security and contractual arrangements. We may add or replace providers as the service develops.",
        },
        {
          heading: "9. International transfers",
          body: "Some service providers used by SimchaCam may process personal information outside the United Kingdom. Where UK data-protection law requires safeguards for an international transfer, we rely on appropriate transfer mechanisms used by those providers, such as recognised contractual protections or other lawful safeguards.",
        },
        {
          heading: "10. How long we keep information",
          body: "We keep account and event information for as long as needed to provide the service, meet legal or accounting duties, resolve disputes, and protect the service. Recording files are normally retained for up to 30 days after becoming ready. Security and technical logs are retained only for a reasonable operational period. Exact retention periods may vary where the law, a dispute, security needs or technical backups require longer retention.",
        },
        {
          heading: "11. Your rights",
          body: (
            <>
              Under UK data-protection law, you may have rights to request
              access, correction, deletion, restriction or transfer of your
              personal information, and to object to certain uses. Where
              processing is based on consent, you may withdraw it. These rights
              are not absolute and may depend on the circumstances. Contact{" "}
              <a
                href="mailto:privacy@simcha.cam"
                className="font-semibold text-navy underline decoration-gold/60 underline-offset-4 transition hover:text-gold"
              >
                privacy@simcha.cam
              </a>{" "}
              to make a request. We may need to verify your identity.
            </>
          ),
        },
        {
          heading: "12. Complaints",
          body: (
            <>
              Please contact us first at{" "}
              <a
                href="mailto:privacy@simcha.cam"
                className="font-semibold text-navy underline decoration-gold/60 underline-offset-4 transition hover:text-gold"
              >
                privacy@simcha.cam
              </a>{" "}
              so we can try to resolve your concern. You also have the right to
              complain to the Information Commissioner&apos;s Office at
              ico.org.uk, or to another relevant data-protection authority where
              applicable.
            </>
          ),
        },
        {
          heading: "13. Security",
          body: "We use technical and organisational measures intended to protect personal information, including authenticated host access, restricted viewer permissions, hashed event passwords and short-lived recording links. No online service can guarantee complete security, and users must protect their accounts, event links and passwords.",
        },
        {
          heading: "14. Changes and contact",
          body: (
            <>
              We may update this policy as SimchaCam develops or legal
              requirements change. The latest version will appear on this page
              with its update date.
              <br />
              <br />
              Privacy enquiries:{" "}
              <a
                href="mailto:privacy@simcha.cam"
                className="font-semibold text-navy underline decoration-gold/60 underline-offset-4 transition hover:text-gold"
              >
                privacy@simcha.cam
              </a>
              <br />
              <br />
              Support:{" "}
              <a
                href="mailto:support@simcha.cam"
                className="font-semibold text-navy underline decoration-gold/60 underline-offset-4 transition hover:text-gold"
              >
                support@simcha.cam
              </a>
            </>
          ),
        },
      ]}
    />
  );
}
