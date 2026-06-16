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
      title: "DocuForge · Generate PDFs via API — invoices, receipts, and reports from JSON.",
      description:
        "Generate invoices, receipts, and reports from JSON via a single POST. Rust-powered rendering engine — no headless browser, no queue.",
      ogAlt: "DocuForge — Generate PDFs via API from JSON.",
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
      title: "DocuForge · Générez n'importe quel PDF depuis du JSON.",
      description:
        "Factures, contrats, rapports, livres, certificats — tout ce que Typst peut composer. Un POST, un PDF. Sans navigateur headless.",
      ogAlt: "DocuForge — Générez n'importe quel PDF depuis du JSON.",
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
      title: "DocuForge · Erstelle jedes PDF aus JSON.",
      description:
        "Rechnungen, Verträge, Berichte, Bücher, Zertifikate — alles, was Typst setzen kann. Ein POST, ein PDF. Kein Headless-Browser.",
      ogAlt: "DocuForge — Erstelle jedes PDF aus JSON.",
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
      title: "DocuForge · Genera qualsiasi PDF da JSON.",
      description:
        "Fatture, contratti, report, libri, certificati — tutto ciò che Typst può comporre. Un POST, un PDF. Senza browser headless.",
      ogAlt: "DocuForge — Genera qualsiasi PDF da JSON.",
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
      title: "DocuForge · Genera cualquier PDF desde JSON.",
      description:
        "Facturas, contratos, informes, libros, certificados — cualquier cosa que Typst pueda componer. Un POST, un PDF. Sin navegador headless.",
      ogAlt: "DocuForge — Genera cualquier PDF desde JSON.",
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
      title: "DocuForge · أنشئ أي PDF من JSON.",
      description:
        "فواتير وعقود وتقارير وكتب وشهادات — كل ما يستطيع Typst إخراجه. طلب POST واحد وملف PDF واحد. بدون متصفح headless.",
      ogAlt: "DocuForge — أنشئ أي PDF من JSON.",
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
      title: "DocuForge · 用 JSON 生成任何 PDF。",
      description:
        "发票、合同、报告、书籍、证书 — Typst 能排版的一切。一次 POST，一个 PDF。无需无头浏览器。",
      ogAlt: "DocuForge — 用 JSON 生成任何 PDF。",
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
