import "server-only";

import { getLocalizedPath, type Locale } from "@/lib/i18n";

type EmailLocale = Locale;

type EventEmailInput = {
  eventId: string;
  eventName: string;
  eventAt?: string | null;
  hasPassword?: boolean;
  locale?: string | null;
  recipientEmail?: string | null;
  slug: string;
};

type StreamerNominationEmailInput = {
  eventName: string;
  locale?: string | null;
  nominatedEmail: string;
  ownerName?: string | null;
  slug: string;
};

type EmailRender = {
  html: string;
  subject: string;
  text: string;
};

type Cta = {
  href: string;
  label: string;
};

type InfoItem = {
  label: string;
  value: string;
};

const defaultFrom = "SimchaCam <noreply@simcha.cam>";
const replyTo = "SimchaCam Support <support@simcha.cam>";
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://simcha.cam")
  .trim()
  .replace(/\/$/, "");

function getEmailLocale(locale?: string | null): EmailLocale {
  return locale === "he" ? "he" : "en";
}

function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatEventDate(eventAt: string | null | undefined, locale: EmailLocale) {
  if (!eventAt) {
    return null;
  }

  const date = new Date(eventAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale === "he" ? "he-IL" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function renderCtaButton(cta: Cta) {
  const safeHref = escapeHtml(cta.href);
  const safeLabel = escapeHtml(cta.label);

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:24px 0 20px;">
      <tr>
        <td bgcolor="#C8A96B" style="border-radius:999px;text-align:center;">
          <a href="${safeHref}" style="display:inline-block;padding:14px 26px;color:#0B1F3A;font-size:15px;font-weight:700;line-height:1.2;text-decoration:none;border-radius:999px;">
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>
  `;
}

function renderFallbackLink(url: string, locale: EmailLocale) {
  const safeUrl = escapeHtml(url);
  const label =
    locale === "he"
      ? "×× ×”×›×¤×ª×•×¨ ××™× ×• ×¤×•×¢×œ, ×”×¢×ª×™×§×• ×•×”×“×‘×™×§×• ××ª ×”×§×™×©×•×¨ ×‘×“×¤×“×¤×Ÿ:"
      : "If the button does not work, copy and paste this link into your browser:";

  return `
    <p style="margin:0 0 8px;color:#6A7485;font-size:12px;line-height:1.6;">
      ${escapeHtml(label)}
    </p>
    <p dir="ltr" style="margin:0 0 22px;text-align:left;font-size:12px;line-height:1.55;word-break:break-all;overflow-wrap:anywhere;">
      <a href="${safeUrl}" style="color:#35527A;text-decoration:underline;">${safeUrl}</a>
    </p>
  `;
}

function renderInfoList(items: InfoItem[]) {
  return `
    <div style="margin:24px 0 0;border:1px solid #E5DECF;border-radius:16px;background:#FFFDF8;overflow:hidden;">
      ${items
        .map(
          (item) => `
            <div style="padding:14px 16px;border-bottom:1px solid #EDE7DB;">
              <p style="margin:0 0 4px;color:#9A7A3F;font-size:12px;font-weight:700;line-height:1.4;">${escapeHtml(item.label)}</p>
              <p dir="${item.value.startsWith("http") ? "ltr" : "auto"}" style="margin:0;color:#0B1F3A;font-size:14px;font-weight:600;line-height:1.5;word-break:break-word;overflow-wrap:anywhere;">${escapeHtml(item.value)}</p>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBullets(items: string[], accent = "#C8A96B") {
  return `
    <ul style="margin:12px 0 0;padding:0;list-style:none;color:#516078;font-size:14px;line-height:1.65;">
      ${items
        .map(
          (item) => `
            <li style="margin:0 0 8px;">
              <span style="display:inline-block;width:7px;height:7px;margin-inline-end:8px;border-radius:999px;background:${accent};vertical-align:1px;"></span>
              ${escapeHtml(item)}
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderSection(title: string, body: string, bullets?: string[]) {
  return `
    <div style="margin:26px 0 0;padding:20px;border:1px solid #E5DECF;border-radius:18px;background:#FFFFFF;">
      <h2 style="margin:0 0 8px;color:#0B1F3A;font-size:19px;font-weight:700;line-height:1.35;">
        ${escapeHtml(title)}
      </h2>
      <p style="margin:0;color:#516078;font-size:14px;line-height:1.65;">
        ${escapeHtml(body)}
      </p>
      ${bullets ? renderBullets(bullets) : ""}
    </div>
  `;
}

function renderLayout({
  children,
  locale,
  preheader,
  subject,
}: {
  children: string;
  locale: EmailLocale;
  preheader: string;
  subject: string;
}) {
  const direction = locale === "he" ? "rtl" : "ltr";
  const alignment = locale === "he" ? "right" : "left";
  const tagline =
    locale === "he" ? "×›×œ ×©×ž×—×”, ×ž×©×•×ª×¤×ª." : "Every simcha, shared.";
  const footer =
    locale === "he"
      ? "×©×™×“×•×¨×™× ×—×™×™× ×¤×¨×˜×™×™× ×œ××™×¨×•×¢×™× ×ž×©×¤×—×ª×™×™×"
      : "Private livestreaming for family events";

  return `
    <!doctype html>
    <html lang="${locale}" dir="${direction}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${escapeHtml(subject)}</title>
      </head>
      <body style="margin:0;padding:0;background:#0B1F3A;color:#0B1F3A;font-family:Arial,Helvetica,sans-serif;direction:${direction};text-align:${alignment};">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${escapeHtml(preheader)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0B1F3A" style="width:100%;background:#0B1F3A;">
          <tr>
            <td align="center" style="padding:36px 14px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;margin:0 auto;">
                <tr>
                  <td style="padding:0 8px 18px;text-align:center;">
                    <p style="margin:0;color:#FAF8F3;font-size:24px;font-weight:700;letter-spacing:-0.02em;">
                      Simcha<span style="color:#E53935;">&bull;</span>Cam
                    </p>
                    <p style="margin:7px 0 0;color:#D9D5CB;font-size:12px;letter-spacing:0.08em;">
                      ${escapeHtml(tagline)}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#FAF8F3" style="padding:0;border:1px solid #C8A96B;border-radius:22px;background:#FAF8F3;overflow:hidden;">
                    <div style="height:5px;background:#C8A96B;font-size:0;line-height:0;">&nbsp;</div>
                    <div style="padding:34px 28px 32px;direction:${direction};text-align:${alignment};">
                      ${children}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 16px 0;text-align:center;">
                    <p style="margin:0;color:#BFC6D1;font-size:11px;line-height:1.6;">
                      SimchaCam &nbsp;&bull;&nbsp; ${escapeHtml(footer)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function commonLinks(input: EventEmailInput, locale: EmailLocale) {
  const viewerPath = getLocalizedPath(locale, `/e/${input.slug}`);
  const hostPath = getLocalizedPath(locale, "/my-events");
  const editPath = getLocalizedPath(locale, `/edit-event/${input.eventId}`);

  return {
    editUrl: absoluteUrl(editPath),
    hostUrl: absoluteUrl(hostPath),
    upgradeUrl: absoluteUrl(hostPath),
    viewerUrl: absoluteUrl(viewerPath),
  };
}

export function renderFreeEventCreatedEmail(input: EventEmailInput): EmailRender {
  const locale = getEmailLocale(input.locale);
  const links = commonLinks(input, locale);
  const copy =
    locale === "he"
      ? {
          subject: "×”××™×¨×•×¢ ×©×œ×›× ×‘Ö¾SimchaCam ×ž×•×›×Ÿ",
          preheader: "×”××™×¨×•×¢ × ×•×¦×¨. ××¤×©×¨ ×œ×©×ª×£ ××ª ×”×§×™×©×•×¨ ×”×¤×¨×˜×™ ×¢× ×”××•×¨×—×™×.",
          eyebrow: "××™×¨×•×¢ × ×•×¦×¨",
          heading: "×”××™×¨×•×¢ ×©×œ×›× ×ž×•×›×Ÿ",
          intro:
            "×¢×ž×•×“ ×”×©×™×“×•×¨ ×”×¤×¨×˜×™ ×©×œ×›× ×ž×•×›×Ÿ. ××¤×©×¨ ×œ×©×ª×£ ××ª ×§×™×©×•×¨ ×”×¦×¤×™×™×” ×¢× ×”××•×¨×—×™× ×•×œ×—×–×•×¨ ×œ×¢×¨×™×›×” ×‘×›×œ ×©×œ×‘.",
          eventName: "×©× ×”××™×¨×•×¢",
          viewerLink: "×§×™×©×•×¨ ×œ×¦×•×¤×™×",
          hostLink: "×§×™×©×•×¨ ×œ×ž××¨×—",
          password: "×”×’× ×” ×‘×¡×™×¡×ž×”",
          passwordEnabled: "×¤×¢×™×œ×”",
          edit: "×¢×¨×™×›×ª ×”××™×¨×•×¢",
          checklistTitle: "×œ×¤× ×™ ×”××™×¨×•×¢",
          checklistBody: "×›×ž×” ×¦×¢×“×™× ×¤×©×•×˜×™× ×©×™×¢×–×¨×• ×œ×©×™×“×•×¨ ×œ×¢×‘×•×¨ ×‘× ×—×ª.",
          checklist: [
            "×©×ª×¤×• ××ª ×§×™×©×•×¨ ×”×¦×¤×™×™×” ×¢× ×”××•×¨×—×™×",
            "×‘×“×§×• ××ª ×”×ž×¦×œ×ž×” ×•×”×ž×™×§×¨×•×¤×•×Ÿ",
            "×”×©××™×¨×• ××ª ×”×˜×œ×¤×•×Ÿ ×˜×¢×•×Ÿ ××• ×ž×—×•×‘×¨ ×œ×—×©×ž×œ",
          ],
          premiumTitle: "×©×“×¨×’×• ××ª ×”××™×¨×•×¢ ×œ×¤×¨×™×ž×™×•×",
          premiumBody:
            "×¤×¨×™×ž×™×•× ×ž×•×¡×™×£ ×ª×–×ž×•×Ÿ, ×©×™×“×•×¨ ××¨×•×š ×™×•×ª×¨, ×”×§×œ×˜×”, ×¦×¤×™×™×” ×—×•×–×¨×ª ×•×”×•×¨×“×” ×œ××™×¨×•×¢ ×”×–×”.",
          premium: [
            "×ª×–×ž×•×Ÿ ××™×¨×•×¢ (×ª××¨×™×š ×•×©×¢×”)",
            "×¢×“ 6 ×©×¢×•×ª ×©×™×“×•×¨",
            "×”×§×œ×˜×” ××•×˜×•×ž×˜×™×ª",
            "×¦×¤×™×™×” ×—×•×–×¨×ª ×œ-30 ×™×•×",
            "×”×•×¨×“×ª ×”×§×œ×˜×•×ª",
            "×¢×“ 500 ×¦×•×¤×™×",
          ],
          upgrade: "×©×“×¨×•×’ ×œ×¤×¨×™×ž×™×•×",
        }
      : {
          subject: "Your SimchaCam event is ready",
          preheader:
            "Your event has been created. Share your private viewer link with guests.",
          eyebrow: "Event created",
          heading: "Your event is ready",
          intro:
            "Your private livestream page has been created. You can share the viewer link with guests and return to edit the event whenever you need.",
          eventName: "Event name",
          viewerLink: "Viewer link",
          hostLink: "Host link",
          password: "Password protection",
          passwordEnabled: "Enabled",
          edit: "Edit Event",
          checklistTitle: "Before your event",
          checklistBody: "A few simple steps will help the livestream feel calm on the day.",
          checklist: [
            "Share the viewer link with your guests",
            "Test your camera and microphone",
            "Keep your phone charged or plugged in",
          ],
          premiumTitle: "Unlock Premium for your event",
          premiumBody:
            "Premium adds scheduling, longer streaming, recording, replay and download for this event.",
          premium: [
            "Event scheduling (date & time)",
            "Up to 6 hours of streaming",
            "Automatic recording",
            "Replay for 30 days",
            "Download recordings",
            "Up to 500 viewers",
          ],
          upgrade: "Upgrade to Premium",
        };
  const infoItems = [
    { label: copy.eventName, value: input.eventName },
    { label: copy.viewerLink, value: links.viewerUrl },
    { label: copy.hostLink, value: links.hostUrl },
    ...(input.hasPassword
      ? [{ label: copy.password, value: copy.passwordEnabled }]
      : []),
  ];
  const html = renderLayout({
    locale,
    preheader: copy.preheader,
    subject: copy.subject,
    children: `
      <p style="margin:0 0 18px;color:#9A7A3F;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(copy.eyebrow)}</p>
      <h1 style="margin:0 0 16px;color:#0B1F3A;font-size:28px;font-weight:700;line-height:1.28;letter-spacing:-0.015em;">${escapeHtml(copy.heading)}</h1>
      <p style="margin:0;color:#516078;font-size:16px;line-height:1.7;">${escapeHtml(copy.intro)}</p>
      ${renderInfoList(infoItems)}
      ${renderCtaButton({ href: links.editUrl, label: copy.edit })}
      ${renderFallbackLink(links.editUrl, locale)}
      ${renderSection(copy.checklistTitle, copy.checklistBody, copy.checklist)}
      ${renderSection(copy.premiumTitle, copy.premiumBody, copy.premium)}
      ${renderCtaButton({ href: links.upgradeUrl, label: copy.upgrade })}
      ${renderFallbackLink(links.upgradeUrl, locale)}
    `,
  });

  const text = [
    copy.heading,
    copy.intro,
    `${copy.eventName}: ${input.eventName}`,
    `${copy.viewerLink}: ${links.viewerUrl}`,
    `${copy.hostLink}: ${links.hostUrl}`,
    input.hasPassword ? `${copy.password}: ${copy.passwordEnabled}` : "",
    `${copy.edit}: ${links.editUrl}`,
    copy.checklistTitle,
    ...copy.checklist.map((item) => `- ${item}`),
    copy.premiumTitle,
    ...copy.premium.map((item) => `- ${item}`),
    `${copy.upgrade}: ${links.upgradeUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { html, subject: copy.subject, text };
}

export function renderPremiumEventConfirmedEmail(
  input: EventEmailInput
): EmailRender {
  const locale = getEmailLocale(input.locale);
  const links = commonLinks(input, locale);
  const eventDate = formatEventDate(input.eventAt, locale);
  const copy =
    locale === "he"
      ? {
          subject: "××™×¨×•×¢ ×”×¤×¨×™×ž×™×•× ×©×œ×›× ×ž×•×›×Ÿ",
          preheader: "×¤×¨×™×ž×™×•× ×”×•×¤×¢×œ ×œ××™×¨×•×¢ ×©×œ×›× ×‘-SimchaCam.",
          eyebrow: "×¤×¨×™×ž×™×•× ×”×•×¤×¢×œ",
          heading: "××™×¨×•×¢ ×”×¤×¨×™×ž×™×•× ×©×œ×›× ×ž×•×›×Ÿ",
          intro:
            "×”××™×¨×•×¢ ×©×•×“×¨×’ ×œ×¤×¨×™×ž×™×•×. ×”×”×§×œ×˜×”, ×”×¦×¤×™×™×” ×”×—×•×–×¨×ª ×•×”×”×•×¨×“×” ×™×”×™×• ×–×ž×™× ×•×ª ×›×—×œ×§ ×ž×”×©×“×¨×•×’.",
          eventName: "×©× ×”××™×¨×•×¢",
          viewerLink: "×§×™×©×•×¨ ×œ×¦×•×¤×™×",
          hostLink: "×§×™×©×•×¨ ×œ×ž××¨×—",
          edit: "×¢×¨×™×›×ª ×”××™×¨×•×¢",
          dateTime: "×ª××¨×™×š ×•×©×¢×”",
          addDateTitle: "××œ ×ª×©×›×—×• ×œ×”×•×¡×™×£ ×ª××¨×™×š ×•×©×¢×”",
          addDateBody:
            "×›×š ×”××•×¨×—×™× ×™×“×¢×• ×ž×ª×™ ×”×©×™×“×•×¨ ×”×—×™ ×©×œ×›× ×ž×ª×—×™×œ.",
          addDate: "×”×•×¡×¤×ª ×ª××¨×™×š ×•×©×¢×”",
          premiumTitle: "××™×¨×•×¢ ×”×¤×¨×™×ž×™×•× ×›×•×œ×œ:",
          premium: [
            "×ª×–×ž×•×Ÿ ××™×¨×•×¢",
            "×¢×“ 6 ×©×¢×•×ª ×©×™×“×•×¨",
            "×”×§×œ×˜×” ××•×˜×•×ž×˜×™×ª",
            "×¦×¤×™×™×” ×—×•×–×¨×ª ×œ-30 ×™×•×",
            "×”×•×¨×“×ª ×”×§×œ×˜×•×ª",
            "×¢×“ 500 ×¦×•×¤×™×",
          ],
          finish:
            "×”××•×¨×—×™× ×œ× ×¦×¨×™×›×™× ××¤×œ×™×§×¦×™×”. ×”× ×¤×©×•×˜ ×¤×•×ª×—×™× ××ª ×§×™×©×•×¨ ×”×¦×¤×™×™×” ×”×¤×¨×˜×™.",
        }
      : {
          subject: "Your Premium event is ready",
          preheader: "Premium has been activated for your SimchaCam event.",
          eyebrow: "Premium activated",
          heading: "Your Premium event is ready",
          intro:
            "Your event is now Premium. Recording, replay and download will be available for this event as part of your Premium features.",
          eventName: "Event name",
          viewerLink: "Viewer link",
          hostLink: "Host link",
          edit: "Edit Event",
          dateTime: "Date and time",
          addDateTitle: "Don't forget to add the date and time",
          addDateBody:
            "This helps your guests know when your livestream begins.",
          addDate: "Add Date & Time",
          premiumTitle: "Your Premium event includes:",
          premium: [
            "Event scheduling",
            "Up to 6 hours of streaming",
            "Automatic recording",
            "Replay for 30 days",
            "Download recordings",
            "Up to 500 viewers",
          ],
          finish:
            "Guests don't need an app. They simply open your private viewer link.",
        };
  const infoItems = [
    { label: copy.eventName, value: input.eventName },
    ...(eventDate ? [{ label: copy.dateTime, value: eventDate }] : []),
    { label: copy.viewerLink, value: links.viewerUrl },
    { label: copy.hostLink, value: links.hostUrl },
  ];
  const dateReminder = eventDate
    ? ""
    : `
      ${renderSection(copy.addDateTitle, copy.addDateBody)}
      ${renderCtaButton({ href: links.editUrl, label: copy.addDate })}
      ${renderFallbackLink(links.editUrl, locale)}
    `;
  const html = renderLayout({
    locale,
    preheader: copy.preheader,
    subject: copy.subject,
    children: `
      <p style="margin:0 0 18px;color:#9A7A3F;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(copy.eyebrow)}</p>
      <h1 style="margin:0 0 16px;color:#0B1F3A;font-size:28px;font-weight:700;line-height:1.28;letter-spacing:-0.015em;">${escapeHtml(copy.heading)}</h1>
      <p style="margin:0;color:#516078;font-size:16px;line-height:1.7;">${escapeHtml(copy.intro)}</p>
      ${renderInfoList(infoItems)}
      ${renderCtaButton({ href: links.editUrl, label: copy.edit })}
      ${renderFallbackLink(links.editUrl, locale)}
      ${dateReminder}
      <div style="margin:26px 0 0;padding:20px;border:1px solid #C8A96B;border-radius:18px;background:#FFFDF8;">
        <h2 style="margin:0 0 8px;color:#0B1F3A;font-size:19px;font-weight:700;line-height:1.35;">${escapeHtml(copy.premiumTitle)}</h2>
        ${renderBullets(copy.premium)}
      </div>
      <p style="margin:24px 0 0;color:#0B1F3A;font-size:15px;font-weight:700;line-height:1.7;">${escapeHtml(copy.finish)}</p>
    `,
  });

  const text = [
    copy.heading,
    copy.intro,
    `${copy.eventName}: ${input.eventName}`,
    eventDate ? `${copy.dateTime}: ${eventDate}` : "",
    `${copy.viewerLink}: ${links.viewerUrl}`,
    `${copy.hostLink}: ${links.hostUrl}`,
    `${copy.edit}: ${links.editUrl}`,
    eventDate ? "" : `${copy.addDateTitle}\n${copy.addDateBody}\n${links.editUrl}`,
    copy.premiumTitle,
    ...copy.premium.map((item) => `- ${item}`),
    copy.finish,
  ]
    .filter(Boolean)
    .join("\n\n");

  return { html, subject: copy.subject, text };
}

export function renderStreamerNominationEmail(
  input: StreamerNominationEmailInput
): EmailRender {
  const locale = getEmailLocale(input.locale);
  const myEventsUrl = absoluteUrl(getLocalizedPath(locale, "/my-events"));
  const viewerUrl = absoluteUrl(getLocalizedPath(locale, `/e/${input.slug}`));
  const copy =
    locale === "he"
      ? {
          subject: "מינו אתכם לשדר אירוע ב-SimchaCam",
          preheader:
            "בעל האירוע ביקש מכם לשדר את השידור החי ב-SimchaCam.",
          eyebrow: "מינוי לשידור",
          heading: "מינו אתכם לשדר את האירוע הזה",
          intro:
            "בעל האירוע ביקש מכם להיות המשדר הרשמי. כדי לראות את האירוע, התחברו ל-SimchaCam עם אותה כתובת מייל שקיבלה את ההודעה הזו.",
          eventName: "שם האירוע",
          viewerLink: "קישור לצופים",
          nominatedEmail: "כתובת המייל להתחברות",
          cta: "הרשמה או כניסה",
          note:
            "אפשר להתחבר עם אימייל וסיסמה או עם Google, כל עוד משתמשים באותה כתובת מייל.",
        }
      : {
          subject: "You have been nominated to stream a SimchaCam event",
          preheader:
            "The event owner has nominated you to stream their SimchaCam event.",
          eyebrow: "Streamer nomination",
          heading: "You have been nominated to stream this event",
          intro:
            "The event owner has asked you to be the official streamer. To access the event, sign up or log in to SimchaCam using the same email address that received this message.",
          eventName: "Event name",
          viewerLink: "Viewer link",
          nominatedEmail: "Email to use when signing in",
          cta: "Sign Up or Log In",
          note:
            "You can use email/password or Google sign-in, as long as you use this same email address.",
        };

  const infoItems = [
    { label: copy.eventName, value: input.eventName },
    { label: copy.viewerLink, value: viewerUrl },
    { label: copy.nominatedEmail, value: input.nominatedEmail },
  ];
  const html = renderLayout({
    locale,
    preheader: copy.preheader,
    subject: copy.subject,
    children: `
      <p style="margin:0 0 18px;color:#9A7A3F;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(copy.eyebrow)}</p>
      <h1 style="margin:0 0 16px;color:#0B1F3A;font-size:28px;font-weight:700;line-height:1.28;letter-spacing:-0.015em;">${escapeHtml(copy.heading)}</h1>
      <p style="margin:0;color:#516078;font-size:16px;line-height:1.7;">${escapeHtml(copy.intro)}</p>
      ${renderInfoList(infoItems)}
      ${renderSection(copy.cta, copy.note)}
      ${renderCtaButton({ href: myEventsUrl, label: copy.cta })}
      ${renderFallbackLink(myEventsUrl, locale)}
    `,
  });
  const text = [
    copy.heading,
    copy.intro,
    `${copy.eventName}: ${input.eventName}`,
    `${copy.viewerLink}: ${viewerUrl}`,
    `${copy.nominatedEmail}: ${input.nominatedEmail}`,
    copy.note,
    `${copy.cta}: ${myEventsUrl}`,
  ].join("\n\n");

  return { html, subject: copy.subject, text };
}

async function sendTransactionalEmail({
  html,
  subject,
  text,
  to,
}: EmailRender & { to: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    console.error("Transactional email skipped: RESEND_API_KEY is missing");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: defaultFrom,
      to: [to],
      subject,
      html,
      text,
      reply_to: replyTo,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    throw new Error(
      `Resend email failed with status ${response.status}: ${responseText}`
    );
  }
}

export async function sendFreeEventCreatedEmail(input: EventEmailInput) {
  if (!input.recipientEmail) {
    console.error("Free event email skipped: recipient email is missing");
    return;
  }

  try {
    await sendTransactionalEmail({
      ...renderFreeEventCreatedEmail(input),
      to: input.recipientEmail,
    });
  } catch (error) {
    console.error("Could not send Free event created email", error);
  }
}

export async function sendPremiumEventConfirmedEmail(input: EventEmailInput) {
  if (!input.recipientEmail) {
    console.error("Premium event email skipped: recipient email is missing");
    return;
  }

  try {
    await sendTransactionalEmail({
      ...renderPremiumEventConfirmedEmail(input),
      to: input.recipientEmail,
    });
  } catch (error) {
    console.error("Could not send Premium event confirmed email", error);
  }
}

export async function sendStreamerNominationEmail(
  input: StreamerNominationEmailInput
) {
  try {
    await sendTransactionalEmail({
      ...renderStreamerNominationEmail(input),
      to: input.nominatedEmail,
    });
  } catch (error) {
    console.error("Could not send streamer nomination email", error);
  }
}

