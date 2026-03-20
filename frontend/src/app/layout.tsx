import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  Exo,
  IBM_Plex_Mono,
  Michroma,
} from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import { normalizeLocale } from "@/src/lib/i18n-config";

const exo = Exo({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const michroma = Michroma({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400"],
});

const marketingUrl =
  process.env.NEXT_PUBLIC_MARKETING_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.docuforge.app";

export const metadata: Metadata = {
  metadataBase: new URL(marketingUrl),
  title: {
    default: "DocuForge",
    template: "%s · DocuForge",
  },
  description:
    "Rust-powered PDF rendering for synchronous production workflows, versioned template contracts, and practical security controls.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/brand/logo-square-32.png", sizes: "32x32", type: "image/png" },
      {
        url: "/brand/logo-square-192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/favicon.ico",
  },
};

const themeScript = `
(() => {
  try {
    const stored = localStorage.getItem("docuforge-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const initialLocale = normalizeLocale(
    headersList.get("x-docuforge-locale")
  );
  const dir = initialLocale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={initialLocale} dir={dir} suppressHydrationWarning>
      <head>
        <meta name="darkreader-lock" />
      </head>
      <body
        className={`${exo.variable} ${plexMono.variable} ${michroma.variable} antialiased`}
      >
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}
