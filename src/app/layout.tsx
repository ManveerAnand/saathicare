import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaathiCare: shared medication care for elders and families",
  description:
    "Elders, caretakers and family share one care plan: medicines, doses, appointments and email reminders, with the elder in charge.",
};

export const viewport: Viewport = { themeColor: "#0f5c4d" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <header className="site-header">
          <Link href="/" className="brand" aria-label="SaathiCare home">
            <span aria-hidden="true">🤝</span> SaathiCare
          </Link>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <p>SaathiCare helps people remember. It does not give medical advice: always ask your doctor.</p>
        </footer>
      </body>
    </html>
  );
}
