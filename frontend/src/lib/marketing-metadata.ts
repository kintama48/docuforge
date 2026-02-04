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
      title: "DocuForge · Typst-native PDF API",
      description:
        "Rust-powered Typst PDF engine for fast, low-cost, programmatic rendering. Build workflows with a clean API and a developer-first console.",
      ogAlt: "DocuForge — Typst-native PDF API",
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
        "Authentication, rendering, templates, assets, AI, billing, and error handling for the DocuForge API.",
      ogAlt: "DocuForge API documentation",
    },
  },
  fr: {
    landing: {
      title: "DocuForge · API PDF Typst native",
      description:
        "Moteur PDF Typst en Rust pour un rendu rapide et économique. API propre, console pensée pour les développeurs.",
      ogAlt: "DocuForge — API PDF Typst native",
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
        "Authentification, rendu, templates, assets, IA, facturation et gestion des erreurs pour l’API DocuForge.",
      ogAlt: "Documentation API DocuForge",
    },
  },
  de: {
    landing: {
      title: "DocuForge · Typst-native PDF-API",
      description:
        "Rust-basierte Typst-PDF-Engine für schnelles, kostengünstiges Rendering. Saubere API und Entwicklerkonsole.",
      ogAlt: "DocuForge — Typst-native PDF-API",
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
        "Authentifizierung, Rendering, Templates, Assets, KI, Abrechnung und Fehlerbehandlung der DocuForge API.",
      ogAlt: "DocuForge API-Dokumentation",
    },
  },
  it: {
    landing: {
      title: "DocuForge · API PDF Typst nativa",
      description:
        "Motore PDF Typst in Rust per rendering veloce ed economico. API pulita e console per sviluppatori.",
      ogAlt: "DocuForge — API PDF Typst nativa",
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
        "Autenticazione, rendering, template, asset, IA, billing e gestione errori per l’API DocuForge.",
      ogAlt: "Documentazione API DocuForge",
    },
  },
  es: {
    landing: {
      title: "DocuForge · API PDF Typst nativa",
      description:
        "Motor PDF Typst en Rust para renderizado rápido y económico. API limpia y consola para desarrolladores.",
      ogAlt: "DocuForge — API PDF Typst nativa",
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
        "Autenticación, renderizado, plantillas, assets, IA, facturación y errores para la API de DocuForge.",
      ogAlt: "Documentación API DocuForge",
    },
  },
  ar: {
    landing: {
      title: "DocuForge · واجهة PDF Typst أصلية",
      description:
        "محرك Typst بلغة Rust لتوليد PDF سريع ومنخفض التكلفة. واجهة API نظيفة ولوحة تحكم للمطورين.",
      ogAlt: "DocuForge — واجهة PDF Typst أصلية",
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
        "المصادقة، الرندر، القوالب، الأصول، الذكاء الاصطناعي، الفوترة، والأخطاء في API DocuForge.",
      ogAlt: "توثيق API DocuForge",
    },
  },
  zh: {
    landing: {
      title: "DocuForge · Typst 原生 PDF API",
      description:
        "Rust 驱动的 Typst PDF 引擎，渲染更快更省。清晰的 API 与开发者控制台。",
      ogAlt: "DocuForge — Typst 原生 PDF API",
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
        "认证、渲染、模板、资源、AI、计费与错误处理的官方说明。",
      ogAlt: "DocuForge API 文档",
    },
  },
};

export function getMarketingMeta(locale: Locale): MarketingMeta {
  return marketingMeta[locale] ?? marketingMeta.en;
}
