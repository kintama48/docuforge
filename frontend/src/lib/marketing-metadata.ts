import type { Locale } from "./i18n-config";

export type MarketingPageMeta = {
  title: string;
  description: string;
  ogAlt: string;
};

export type MarketingMeta = {
  landing: MarketingPageMeta;
  pricing: MarketingPageMeta;
  docs: MarketingPageMeta;
};

const marketingMeta: Record<Locale, MarketingMeta> = {
  en: {
    landing: {
      title: "DocuForge · Generate PDFs via API. Without Puppeteer.",
      description:
        "Generate invoices, receipts, and reports from JSON with a single API call. Rust-powered, no headless browser, no queue.",
      ogAlt: "DocuForge — Generate PDFs via API. Without Puppeteer.",
    },
    pricing: {
      title: "DocuForge Pricing · Plans for every team",
      description:
        "Simple, transparent pricing for PDF rendering at scale. Choose the plan that matches your monthly volume.",
      ogAlt: "DocuForge pricing and plans",
    },
    docs: {
      title: "DocuForge API Docs · Reference",
      description:
        "Authentication, rendering, templates, assets, AI, billing, security controls, and MCP integration for the DocuForge API.",
      ogAlt: "DocuForge API documentation",
    },
  },
  fr: {
    landing: {
      title: "DocuForge · Infrastructure documentaire déterministe",
      description:
        "Rendu PDF en Rust pour des workflows synchrones, des templates versionnés et des contrôles de sécurité pragmatiques.",
      ogAlt: "DocuForge — Infrastructure documentaire déterministe",
    },
    pricing: {
      title: "Tarifs DocuForge · Plans pour chaque équipe",
      description:
        "Des prix simples et transparents pour le rendu PDF à grande échelle. Choisissez le plan adapté à votre volume mensuel.",
      ogAlt: "Tarifs et plans DocuForge",
    },
    docs: {
      title: "Docs API DocuForge · Référence",
      description:
        "Authentification, rendu, templates, assets, IA, facturation, sécurité et intégration MCP pour l’API DocuForge.",
      ogAlt: "Documentation API DocuForge",
    },
  },
  de: {
    landing: {
      title: "DocuForge · Deterministische Dokument-Infrastruktur",
      description:
        "Rust-basiertes PDF-Rendering für synchrone Produktions-Workflows, versionierte Template-Verträge und praxisnahe Sicherheitskontrollen.",
      ogAlt: "DocuForge — Deterministische Dokument-Infrastruktur",
    },
    pricing: {
      title: "DocuForge Preise · Pläne für jedes Team",
      description:
        "Einfaches, transparentes Pricing für PDF-Rendering im großen Maßstab. Wähle den passenden Monatsplan.",
      ogAlt: "DocuForge Preise und Pläne",
    },
    docs: {
      title: "DocuForge API-Dokumentation · Referenz",
      description:
        "Authentifizierung, Rendering, Templates, Assets, KI, Abrechnung, Sicherheitsfunktionen und MCP-Integration der DocuForge API.",
      ogAlt: "DocuForge API-Dokumentation",
    },
  },
  it: {
    landing: {
      title: "DocuForge · Genera PDF da JSON con un'API",
      description:
        "Genera fatture, ricevute e report da JSON con una sola chiamata API. Niente browser headless, niente coda — solo un POST.",
      ogAlt: "DocuForge — Genera PDF da JSON con un'API",
    },
    pricing: {
      title: "Prezzi DocuForge · Piani per ogni team",
      description:
        "Prezzi semplici e trasparenti per il rendering PDF su larga scala. Scegli il piano adatto al volume mensile.",
      ogAlt: "Prezzi e piani DocuForge",
    },
    docs: {
      title: "DocuForge API Docs · Riferimento",
      description:
        "Autenticazione, rendering, template, asset, IA, billing, sicurezza e integrazione MCP per l’API DocuForge.",
      ogAlt: "Documentazione API DocuForge",
    },
  },
  es: {
    landing: {
      title: "DocuForge · Infraestructura documental determinista",
      description:
        "Renderizado PDF en Rust para flujos síncronos en producción, contratos de plantillas versionados y controles de seguridad prácticos.",
      ogAlt: "DocuForge — Infraestructura documental determinista",
    },
    pricing: {
      title: "Precios DocuForge · Planes para cada equipo",
      description:
        "Precios simples y transparentes para renderizado PDF a escala. Elige el plan que se ajuste a tu volumen mensual.",
      ogAlt: "Precios y planes DocuForge",
    },
    docs: {
      title: "Docs API DocuForge · Referencia",
      description:
        "Autenticación, renderizado, plantillas, assets, IA, facturación, seguridad e integración MCP para la API de DocuForge.",
      ogAlt: "Documentación API DocuForge",
    },
  },
  ar: {
    landing: {
      title: "DocuForge · بنية مستندات حتمية",
      description:
        "رندر PDF مبني على Rust لمسارات إنتاج متزامنة، مع قوالب بإصدارات واضحة وضوابط أمان عملية.",
      ogAlt: "DocuForge — بنية مستندات حتمية",
    },
    pricing: {
      title: "أسعار DocuForge · خطط لكل فريق",
      description:
        "أسعار واضحة لتوليد PDF على نطاق واسع. اختر الخطة المناسبة لحجمك الشهري.",
      ogAlt: "أسعار وخطط DocuForge",
    },
    docs: {
      title: "توثيق API DocuForge · مرجع",
      description:
        "المصادقة، الرندر، القوالب، الأصول، الذكاء الاصطناعي، الفوترة، ميزات الأمان وتكامل MCP في API DocuForge.",
      ogAlt: "توثيق API DocuForge",
    },
  },
  zh: {
    landing: {
      title: "DocuForge · 确定性文档基础设施",
      description:
        "Rust 驱动的 PDF 渲染能力，面向同步生产流程、版本化模板契约与务实的安全控制。",
      ogAlt: "DocuForge — 确定性文档基础设施",
    },
    pricing: {
      title: "DocuForge 定价 · 适合各类团队",
      description:
        "简洁透明的 PDF 渲染定价。选择符合你每月规模的套餐。",
      ogAlt: "DocuForge 定价与套餐",
    },
    docs: {
      title: "DocuForge API 文档 · 参考",
      description:
        "覆盖认证、渲染、模板、资源、AI、计费、安全能力与 MCP 集成的官方文档。",
      ogAlt: "DocuForge API 文档",
    },
  },
};

export function getMarketingMeta(locale: Locale): MarketingMeta {
  return marketingMeta[locale] ?? marketingMeta.en;
}
