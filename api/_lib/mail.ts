import nodemailer from "nodemailer";

/*
  Sends email through any SMTP service (Gmail with an app password, Brevo,
  Resend, ...). The login comes from environment variables, never the code:

    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM

  Without them (local development) the email is printed to the server
  console instead, so the reset link can still be tested.
*/

export interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type Mailer = (email: Email) => Promise<void>;

let mailer: Mailer | null = null;

/** Tests swap in a fake. */
export function setMailer(next: Mailer | null) {
  mailer = next;
}

function smtpMailer(): Mailer {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    if (process.env.VERCEL) throw new Error("Email isn't set up: SMTP_HOST, SMTP_USER and SMTP_PASS are missing");
    return async (email) => {
      console.log(`\n--- Email (not sent: no SMTP settings) ---\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n---\n`);
    };
  }
  const port = Number(SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    // 465 is encrypted from the start; 587 upgrades with STARTTLS (required, never plain).
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return async (email) => {
    await transport.sendMail({ from: MAIL_FROM ?? `TomoNook <${SMTP_USER}>`, ...email });
  };
}

/** Whether email can be sent here (or, in local development, printed). */
export function canSendEmail() {
  return Boolean(mailer || process.env.SMTP_HOST || !process.env.VERCEL);
}

export function sendEmail(email: Email) {
  mailer ??= smtpMailer();
  return mailer(email);
}
