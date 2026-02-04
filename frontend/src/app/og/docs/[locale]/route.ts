import { ImageResponse } from "next/og";
import { normalizeLocale } from "@/src/lib/i18n-config";
import { getMarketingMeta } from "@/src/lib/marketing-metadata";

export const runtime = "edge";

const badgeCopy: Record<string, string> = {
  en: "API Docs",
  fr: "Docs API",
  de: "API-Doku",
  it: "Docs API",
  es: "Docs API",
  ar: "توثيق API",
  zh: "API 文档",
};

export function GET(
  _request: Request,
  { params }: { params: { locale: string } }
) {
  const locale = normalizeLocale(params.locale);
  const meta = getMarketingMeta(locale).docs;
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
            "linear-gradient(135deg, #f7f4ee 0%, #fff6e6 45%, #ffffff 100%)",
          color: "#0f1115",
          fontFamily: "'IBM Plex Sans', 'Inter', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 18,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            color: "#7c6a50",
          }}
        >
          DocuForge
        </div>
        <div
          style={{
            marginTop: 24,
            maxWidth: "900px",
            fontSize: 58,
            fontWeight: 600,
            lineHeight: 1.05,
          }}
        >
          {meta.title}
        </div>
        <div
          style={{
            marginTop: 18,
            maxWidth: "880px",
            fontSize: 26,
            lineHeight: 1.35,
            color: "#6a5a45",
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
            background: "#0f1115",
            color: "#ffffff",
            fontSize: 18,
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
