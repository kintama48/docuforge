import { ImageResponse } from "next/og";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { getMarketingMeta } from "@/src/lib/marketing-metadata";

const badgeCopy: Record<string, string> = {
  en: "Rust + Typst Engine",
  fr: "Moteur Rust + Typst",
  de: "Rust + Typst Engine",
  it: "Motore Rust + Typst",
  es: "Motor Rust + Typst",
  ar: "محرك Rust + Typst",
  zh: "Rust + Typst 引擎",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale: routeLocale } = await params;
  const locale = normalizeLocale(routeLocale);
  const meta = getMarketingMeta(locale).landing;
  const badge = badgeCopy[locale] ?? badgeCopy.en;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background:
            "linear-gradient(135deg, #f7f4ee 0%, #eef1fb 50%, #ffffff 100%)",
          color: "#0f1115",
          fontFamily: "'IBM Plex Sans', 'Inter', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#5d5b57",
          }}
        >
          DocuForge
        </div>
        <div
          style={{
            marginTop: 24,
            maxWidth: "900px",
            fontSize: 60,
            fontWeight: 600,
            lineHeight: 1.05,
          }}
        >
          {meta.title}
        </div>
        <div
          style={{
            marginTop: 20,
            maxWidth: "880px",
            fontSize: 26,
            lineHeight: 1.35,
            color: "#5d5b57",
          }}
        >
          {meta.description}
        </div>
        <div
          style={{
            marginTop: 32,
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 18px",
            borderRadius: 999,
            background: "#0b5fff",
            color: "#ffffff",
            fontSize: 20,
            fontWeight: 600,
            width: "fit-content",
          }}
        >
          {badge}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
