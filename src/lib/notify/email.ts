import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { logInfo } from "../log";

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

const subjectTypes = [
  ["Reminder: ", "Upcoming dose reminder"],
  ["Did you take ", "Missed dose reminder"],
  ["Appointment with ", "Appointment reminder"],
];

/** Prints the subject with private details removed for runs without mail credentials. */
export const consoleMailer: Mailer = {
  async send(_to, subject) {
    const subjectType = subjectTypes.find(([prefix]) => subject.startsWith(prefix));
    logInfo("email", subjectType?.[1] ?? "Care circle reminder");
  },
};
