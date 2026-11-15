import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Fraunces } from "next/font/google";
import Link from "next/link";
import { TextSizeToggle } from "@/components/TextSizeToggle";
import { Logo } from "@/components/Logo";
import "./globals.css";

// Atkinson Hyperlegible was designed by the Braille Institute for readers with low vision.
const body = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const display = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "SaathiCare: shared medication care for elders and families",
  description:
    "Elders, caretakers and family share one care plan: medicines, doses, appointments and email reminders, with the elder in charge.",
};

export const viewport: Viewport = { themeColor: "#14532d" };

/** Renders the shared site navigation, typography and footer. */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <header className="site-header">
          <Link href="/" className="brand" aria-label="SaathiCare home">
            <Logo />
            <span>SaathiCare</span>
          </Link>
          <TextSizeToggle />
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <p>
            SaathiCare helps families remember and coordinate. It does not give medical advice: always ask your doctor.
          </p>
        </footer>
      </body>
    </html>
  );
}
