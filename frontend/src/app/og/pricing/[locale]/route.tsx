import { ImageResponse } from "next/og";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { getMarketingMeta } from "@/src/lib/marketing-metadata";

export const runtime = "edge";

const badgeCopy: Record<string, string> = {
  en: "Plans & usage",
  fr: "Plans & usage",
  de: "Pläne & Nutzung",
  it: "Piani & uso",
  es: "Planes & uso",
  ar: "الخطط والاستخدام",
  zh: "套餐与用量",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale: routeLocale } = await params;
  const locale = normalizeLocale(routeLocale);
  const meta = getMarketingMeta(locale).pricing;
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
            "linear-gradient(135deg, #0b5fff 0%, #1b255a 45%, #0f1115 100%)",
          color: "#ffffff",
          fontFamily: "'IBM Plex Sans', 'Inter', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.7)",
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
            color: "rgba(255,255,255,0.75)",
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
            background: "rgba(255,255,255,0.14)",
            color: "#ffffff",
            fontSize: 20,
            fontWeight: 600,
            width: "fit-content",
            border: "1px solid rgba(255,255,255,0.25)",
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
