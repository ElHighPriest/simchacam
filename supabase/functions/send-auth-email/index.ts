// Supabase Edge Functions run on Deno, outside the Next.js runtime.
// @ts-expect-error Deno resolves npm specifiers at function deployment time.
import { Resend } from "npm:resend";
// @ts-expect-error Deno resolves HTTPS imports at function deployment time.
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

type AuthAction =
  | "signup"
  | "recovery"
  | "magiclink"
  | "invite"
  | "email_change"
  | "reauthentication";

type HookUser = {
  email?: string;
  new_email?: string;
  user_metadata?: {
    locale?: unknown;
  };
};

type EmailData = {
  token?: string;
  token_hash?: string;
  redirect_to?: string;
  email_action_type?: string;
  site_url?: string;
  token_new?: string;
  token_hash_new?: string;
};

type HookPayload = {
  user: HookUser;
  email_data: EmailData;
};

type Locale = "en" | "he";

type EmailContent = {
  subject: string;
  heading: string;
  introduction: string;
  buttonLabel?: string;
  codeLabel?: string;
  footer: string;
};

type PendingEmail = {
  to: string;
  token?: string;
  tokenHash?: string;
};

const supportedActions = new Set<AuthAction>([
  "signup",
  "recovery",
  "magiclink",
  "invite",
  "email_change",
  "reauthentication",
]);

const content: Record<Locale, Record<AuthAction, EmailContent>> = {
  en: {
    signup: {
      subject: "Confirm your SimchaCam email address",
      heading: "Welcome to SimchaCam",
      introduction:
        "Please confirm your email address to finish creating your account.",
      buttonLabel: "Confirm email address",
      footer:
        "If you did not create a SimchaCam account, you can safely ignore this email.",
    },
    recovery: {
      subject: "Reset your SimchaCam password",
      heading: "Reset your password",
      introduction:
        "We received a request to reset your SimchaCam password.",
      buttonLabel: "Reset password",
      footer:
        "If you did not request a password reset, you can safely ignore this email.",
    },
    magiclink: {
      subject: "Your SimchaCam sign-in link",
      heading: "Sign in to SimchaCam",
      introduction: "Use the secure link below to sign in to your account.",
      buttonLabel: "Sign in",
      footer:
        "If you did not request this sign-in link, you can safely ignore this email.",
    },
    invite: {
      subject: "You have been invited to SimchaCam",
      heading: "You are invited",
      introduction:
        "You have been invited to create a SimchaCam account.",
      buttonLabel: "Accept invitation",
      footer:
        "If you were not expecting this invitation, you can safely ignore this email.",
    },
    email_change: {
      subject: "Confirm your SimchaCam email address",
      heading: "Confirm your email address",
      introduction:
        "Please confirm this email address to complete the requested change.",
      buttonLabel: "Confirm email address",
      footer:
        "If you did not request this change, please contact support@simcha.cam.",
    },
    reauthentication: {
      subject: "Your SimchaCam verification code",
      heading: "Confirm it is you",
      introduction:
        "Use this one-time code to confirm your identity. It expires shortly.",
      codeLabel: "Verification code",
      footer:
        "If you did not request this code, please secure your account and contact support@simcha.cam.",
    },
  },
  he: {
    signup: {
      subject: "אישור כתובת האימייל שלך ב-SimchaCam",
      heading: "ברוכים הבאים ל-SimchaCam",
      introduction: "נא לאשר את כתובת האימייל כדי להשלים את יצירת החשבון.",
      buttonLabel: "אישור כתובת האימייל",
      footer:
        "אם לא יצרתם חשבון ב-SimchaCam, ניתן להתעלם מהודעה זו.",
    },
    recovery: {
      subject: "איפוס הסיסמה שלך ב-SimchaCam",
      heading: "איפוס סיסמה",
      introduction: "קיבלנו בקשה לאיפוס הסיסמה שלך ב-SimchaCam.",
      buttonLabel: "איפוס סיסמה",
      footer: "אם לא ביקשתם לאפס את הסיסמה, ניתן להתעלם מהודעה זו.",
    },
    magiclink: {
      subject: "קישור הכניסה שלך ל-SimchaCam",
      heading: "כניסה ל-SimchaCam",
      introduction: "השתמשו בקישור המאובטח כדי להיכנס לחשבון.",
      buttonLabel: "כניסה לחשבון",
      footer: "אם לא ביקשתם קישור כניסה, ניתן להתעלם מהודעה זו.",
    },
    invite: {
      subject: "הוזמנתם ל-SimchaCam",
      heading: "הוזמנתם להצטרף",
      introduction: "הוזמנתם ליצור חשבון ב-SimchaCam.",
      buttonLabel: "קבלת ההזמנה",
      footer: "אם לא ציפיתם להזמנה זו, ניתן להתעלם מהודעה זו.",
    },
    email_change: {
      subject: "אישור כתובת האימייל שלך ב-SimchaCam",
      heading: "אישור כתובת האימייל",
      introduction: "נא לאשר את כתובת האימייל כדי להשלים את השינוי המבוקש.",
      buttonLabel: "אישור כתובת האימייל",
      footer:
        "אם לא ביקשתם את השינוי, אנא פנו אל support@simcha.cam.",
    },
    reauthentication: {
      subject: "קוד האימות שלך ב-SimchaCam",
      heading: "אישור זהות",
      introduction:
        "השתמשו בקוד החד-פעמי כדי לאשר את זהותכם. תוקף הקוד יפוג בקרוב.",
      codeLabel: "קוד אימות",
      footer:
        "אם לא ביקשתם את הקוד, אנא אבטחו את החשבון ופנו אל support@simcha.cam.",
    },
  },
};

function jsonResponse(status: number, message?: string) {
  return Response.json(message ? { error: { message } } : {}, { status });
}

function requireEnvironmentVariable(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required Edge Function secret: ${name}`);
  }

  return value;
}

function getLocale(user: HookUser): Locale {
  return user.user_metadata?.locale === "he" ? "he" : "en";
}

function getAuthAction(value: string | undefined): AuthAction {
  if (value && supportedActions.has(value as AuthAction)) {
    return value as AuthAction;
  }

  throw new Error("Unsupported authentication email action");
}

function buildActionUrl(
  supabaseUrl: string,
  tokenHash: string,
  action: AuthAction,
  redirectTo: string
) {
  const url = new URL("/auth/v1/verify", supabaseUrl);
  url.searchParams.set("token", tokenHash);
  url.searchParams.set("type", action);
  url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderEmail(
  locale: Locale,
  action: AuthAction,
  actionUrl: string | null,
  token?: string
) {
  const copy = content[locale][action];
  const direction = locale === "he" ? "rtl" : "ltr";
  const alignment = locale === "he" ? "right" : "left";
  const safeUrl = actionUrl ? escapeHtml(actionUrl) : null;
  const safeToken = token ? escapeHtml(token) : null;

  const signupBenefits =
    action === "signup"
      ? locale === "he"
        ? `
          <p style="margin:26px 0 10px;color:#0B1F3A;font-size:15px;font-weight:700;line-height:1.6;">לאחר האישור תוכלו:</p>
          <ul style="margin:0 0 26px;padding-${direction === "rtl" ? "right" : "left"}:22px;color:#516078;font-size:15px;line-height:1.65;">
            <li style="margin-bottom:7px;">ליצור אירועי שידור חי פרטיים</li>
            <li style="margin-bottom:7px;">לשתף קישורים מאובטחים עם בני משפחה וחברים</li>
            <li>להתחיל שידור חי ישירות מהטלפון</li>
          </ul>
        `
        : `
          <p style="margin:26px 0 10px;color:#0B1F3A;font-size:15px;font-weight:700;line-height:1.6;">Once confirmed, you&apos;ll be able to:</p>
          <ul style="margin:0 0 26px;padding-left:22px;color:#516078;font-size:15px;line-height:1.65;">
            <li style="margin-bottom:7px;">Create private livestream events</li>
            <li style="margin-bottom:7px;">Share secure links with family and friends</li>
            <li>Go live directly from your phone</li>
          </ul>
        `
      : "";

  const fallbackLinkLabel =
    locale === "he"
      ? "אם הכפתור אינו פועל, העתיקו והדביקו את הקישור בדפדפן:"
      : "If the button does not work, copy and paste this link into your browser:";

  const actionBlock =
    safeUrl && copy.buttonLabel
      ? `
        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:30px 0 24px;">
          <tr>
            <td bgcolor="#C8A96B" style="border-radius:999px;text-align:center;">
              <a
                href="${safeUrl}"
                style="display:inline-block;padding:14px 28px;color:#0B1F3A;font-size:15px;font-weight:700;line-height:1.2;text-decoration:none;border-radius:999px;"
              >
                ${escapeHtml(copy.buttonLabel)}
              </a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 8px;color:#6A7485;font-size:12px;line-height:1.6;">
          ${fallbackLinkLabel}
        </p>
        <p dir="ltr" style="margin:0 0 26px;text-align:left;font-size:12px;line-height:1.55;word-break:break-all;overflow-wrap:anywhere;">
          <a href="${safeUrl}" style="color:#35527A;text-decoration:underline;">${safeUrl}</a>
        </p>
      `
      : safeToken
        ? `
          <p style="margin:28px 0 9px;color:#6A7485;font-size:13px;font-weight:700;line-height:1.5;">
            ${escapeHtml(copy.codeLabel ?? "")}
          </p>
          <p
            dir="ltr"
            style="display:inline-block;margin:0 0 26px;padding:15px 22px;border:1px solid #C8A96B;border-radius:14px;background:#FFFDF8;color:#0B1F3A;font-size:27px;font-weight:700;letter-spacing:0.18em;text-align:center;"
          >
            ${safeToken}
          </p>
        `
        : "";

  const teamSignoff =
    locale === "he"
      ? "כל שמחה, משותפת.<br><strong>צוות SimchaCam</strong>"
      : "Every simcha, shared.<br><strong>The SimchaCam Team</strong>";
  const brandTagline =
    locale === "he" ? "כל שמחה, משותפת." : "Every simcha, shared.";
  const footerDescription =
    locale === "he"
      ? "שידורים חיים פרטיים לאירועים משפחתיים"
      : "Private livestreaming for family events";

  const html = `
    <!doctype html>
    <html lang="${locale}" dir="${direction}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body style="margin:0;padding:0;background:#0B1F3A;color:#0B1F3A;font-family:Arial,Helvetica,sans-serif;direction:${direction};text-align:${alignment};">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
          ${escapeHtml(copy.subject)}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0B1F3A" style="width:100%;background:#0B1F3A;">
          <tr>
            <td align="center" style="padding:36px 14px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;margin:0 auto;">
                <tr>
                  <td style="padding:0 8px 18px;text-align:center;">
                    <p style="margin:0;color:#FAF8F3;font-size:24px;font-weight:700;letter-spacing:-0.02em;">
                      Simcha<span style="color:#C8A96B;">•</span>Cam
                    </p>
                    <p style="margin:7px 0 0;color:#D9D5CB;font-size:12px;letter-spacing:0.08em;">
                      ${brandTagline}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#FAF8F3" style="padding:0;border:1px solid #C8A96B;border-radius:22px;background:#FAF8F3;overflow:hidden;">
                    <div style="height:5px;background:#C8A96B;font-size:0;line-height:0;">&nbsp;</div>
                    <div style="padding:34px 28px 32px;direction:${direction};text-align:${alignment};">
                    <p style="margin:0 0 18px;color:#9A7A3F;font-size:12px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">
                      SimchaCam
                    </p>
                    <h1 style="margin:0 0 16px;color:#0B1F3A;font-size:28px;font-weight:700;line-height:1.28;letter-spacing:-0.015em;">
                      ${escapeHtml(copy.heading)}
                    </h1>
                    <p style="margin:0;color:#516078;font-size:16px;line-height:1.7;">
                      ${escapeHtml(copy.introduction)}
                    </p>
                    ${actionBlock}
                    ${signupBenefits}
                    <div style="height:1px;margin:28px 0 22px;background:#E5DECF;font-size:0;line-height:0;">&nbsp;</div>
                    <p style="margin:0;color:#6A7485;font-size:13px;line-height:1.7;">
                      ${escapeHtml(copy.footer)}
                    </p>
                    <p style="margin:20px 0 0;color:#0B1F3A;font-size:13px;line-height:1.7;">
                      ${teamSignoff}
                    </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 16px 0;text-align:center;">
                    <p style="margin:0;color:#BFC6D1;font-size:11px;line-height:1.6;">
                      SimchaCam &nbsp;•&nbsp; ${footerDescription}
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

  const textParts = [
    copy.heading,
    copy.introduction,
    actionUrl ?? (token ? `${copy.codeLabel ?? "Code"}: ${token}` : ""),
    action === "signup"
      ? locale === "he"
        ? "לאחר האישור תוכלו ליצור אירועים פרטיים, לשתף קישורים מאובטחים ולהתחיל שידור חי מהטלפון."
        : "Once confirmed, you can create private events, share secure links and go live from your phone."
      : "",
    copy.footer,
    locale === "he"
      ? "כל שמחה, משותפת.\nצוות SimchaCam"
      : "Every simcha, shared.\nThe SimchaCam Team",
  ].filter(Boolean);

  return {
    subject: copy.subject,
    html,
    text: textParts.join("\n\n"),
  };
}

function getPendingEmails(
  action: AuthAction,
  user: HookUser,
  emailData: EmailData
): PendingEmail[] {
  if (action !== "email_change") {
    if (!user.email) {
      throw new Error("Authentication email has no recipient");
    }

    return [
      {
        to: user.email,
        token: emailData.token,
        tokenHash: emailData.token_hash,
      },
    ];
  }

  const currentEmail = user.email;
  const newEmail = user.new_email;
  const isSecureEmailChange = Boolean(
    currentEmail &&
      newEmail &&
      emailData.token_hash &&
      emailData.token_hash_new
  );

  if (isSecureEmailChange) {
    return [
      {
        to: currentEmail as string,
        token: emailData.token,
        tokenHash: emailData.token_hash_new,
      },
      {
        to: newEmail as string,
        token: emailData.token_new,
        tokenHash: emailData.token_hash,
      },
    ];
  }

  const recipient = newEmail ?? currentEmail;

  if (!recipient) {
    throw new Error("Email change has no recipient");
  }

  return [
    {
      to: recipient,
      token: emailData.token_new || emailData.token,
      tokenHash: emailData.token_hash,
    },
  ];
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse(405, "Method not allowed");
  }

  try {
    const resendApiKey = requireEnvironmentVariable("RESEND_API_KEY");
    const fromEmail = requireEnvironmentVariable("RESEND_FROM_EMAIL");
    const supabaseUrl = requireEnvironmentVariable("SUPABASE_URL");
    const hookSecret = requireEnvironmentVariable("SEND_EMAIL_HOOK_SECRET")
      .replace(/^v1,whsec_/, "");
    const rawPayload = await request.text();
    const webhook = new Webhook(hookSecret);
    const payload = webhook.verify(
      rawPayload,
      Object.fromEntries(request.headers)
    ) as HookPayload;
    const locale = getLocale(payload.user);
    const action = getAuthAction(payload.email_data.email_action_type);
    const redirectTo =
      payload.email_data.redirect_to || payload.email_data.site_url;

    if (!redirectTo) {
      throw new Error("Authentication email has no redirect URL");
    }

    const pendingEmails = getPendingEmails(
      action,
      payload.user,
      payload.email_data
    );
    const resend = new Resend(resendApiKey);

    for (const pendingEmail of pendingEmails) {
      const actionUrl =
        action !== "reauthentication" && pendingEmail.tokenHash
          ? buildActionUrl(
              supabaseUrl,
              pendingEmail.tokenHash,
              action,
              redirectTo
            )
          : null;
      const rendered = renderEmail(
        locale,
        action,
        actionUrl,
        pendingEmail.token
      );
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: [pendingEmail.to],
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });

      if (error) {
        throw new Error("Email provider rejected the authentication email");
      }
    }

    return jsonResponse(200);
  } catch (error) {
    const isSignatureError =
      error instanceof Error &&
      /signature|webhook|timestamp/i.test(error.message);

    return jsonResponse(
      isSignatureError ? 401 : 500,
      isSignatureError
        ? "Invalid webhook signature"
        : "Authentication email could not be sent"
    );
  }
});
