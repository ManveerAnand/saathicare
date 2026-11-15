import nodemailer, { type Transporter } from "nodemailer";

export interface Mailer {
  send(to: string[], subject: string, text: string): Promise<void>;
}

/** Gmail SMTP with an app password. */
export function gmailMailer(user: string, appPassword: string): Mailer {
  const transport: Transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: appPassword },
  });
  return {
    async send(to, subject, text) {
      await transport.sendMail({ from: `SaathiCare <${user}>`, to: to.join(", "), subject, text });
    },
  };
}

/** For local runs without credentials: prints instead of sending. */
export const consoleMailer: Mailer = {
  async send(to, subject) {
    console.info(`[email] to ${to.length} recipient(s): ${subject}`);
  },
};
