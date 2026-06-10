import type { Locale } from "@/src/lib/i18n-config";

export type ContentCollection = "blog" | "templates" | "compare" | "industries";

export type ContentCategory =
  | "foundation"
  | "pain"
  | "tutorial"
  | "use-case"
  | "template"
  | "programmatic"
  | "comparison"
  | "industry";

export type ContentLink = {
  href: string;
  title: string;
};

export type ContentBlock =
  | {
      kind: "paragraph";
      title: string;
      paragraphs: string[];
    }
  | {
      kind: "list";
      title: string;
      items: string[];
    }
  | {
      kind: "code";
      title: string;
      language: string;
      code: string;
    }
  | {
      kind: "links";
      title: string;
      links: ContentLink[];
    };

export type ContentFaq = {
  question: string;
  answer: string;
};

export type ContentDocument = {
  collection: ContentCollection;
  category: ContentCategory;
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  intro: string;
  keywords: string[];
  blocks: ContentBlock[];
  faq: ContentFaq[];
  ctaTitle: string;
  ctaBody: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
  related: ContentLink[];
  updatedAt: string;
  priority: boolean;
};

type CollectionMeta = {
  label: string;
  title: string;
  description: string;
};

type ContentHubCopy = {
  navBlogs: string;
  navPlayground: string;
  readMore: string;
  relatedTitle: string;
  faqTitle: string;
  updatedLabel: string;
  quickAnswerTitle: string;
  keyTakeawaysTitle: string;
  tryLiveLabel: string;
  collections: Record<ContentCollection, CollectionMeta>;
  titles: {
    howToCreate: (topic: string) => string;
    howToGenerate: (topic: string) => string;
    compare: (target: string) => string;
    industry: (industry: string) => string;
  };
  cta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
};

const coreKeywords = [
  "PDF generation API",
  "programmatic PDF generation",
  "Puppeteer PDF alternative",
  "HTML to PDF API",
  "invoice generation API",
  "document automation API",
  "Typst PDF generation",
  "generate PDF from template",
  "dynamic PDF templates",
  "PDF generation for SaaS",
];

type BlogSpec = {
  slug: string;
  category: "foundation" | "pain" | "tutorial" | "use-case" | "programmatic";
  title: string;
  excerpt: string;
  keyword: string;
  priority?: boolean;
};

const blogSpecs: BlogSpec[] = [
  {
    slug: "why-we-built-docuforge-pdf-generation-shouldnt-be-this-hard",
    category: "foundation",
    title: "Why We Built DocuForge: PDF Generation Shouldn't Be This Hard",
    excerpt:
      "Legacy PDF stacks force tradeoffs between speed, quality, and developer experience. This post outlines the constraints and the architecture we chose instead.",
    keyword: "PDF generation API",
  },
  {
    slug: "typst-vs-html-css-for-pdf-templates",
    category: "foundation",
    title: "Typst vs HTML/CSS for PDF Templates - A Developer's Comparison",
    excerpt:
      "A practical comparison of Typst and HTML/CSS for template-heavy systems, including maintainability, performance expectations, and workflow implications.",
    keyword: "Typst PDF generation",
  },
  {
    slug: "puppeteer-pdf-generation-is-slow-heres-a-faster-alternative",
    category: "pain",
    title: "Puppeteer PDF Generation is Slow - Here's a Faster Alternative",
    excerpt:
      "If your pipeline relies on browser rendering for every document, latency and infrastructure costs climb quickly. Here is a simpler path.",
    keyword: "Puppeteer PDF alternative",
    priority: true,
  },
  {
    slug: "how-to-generate-invoices-programmatically-in-2026",
    category: "pain",
    title: "How to Generate Invoices Programmatically in 2026 (3 Approaches Compared)",
    excerpt:
      "An implementation-level breakdown of direct PDF libraries, HTML-to-PDF stacks, and template-first APIs for invoice automation.",
    keyword: "how to generate invoices programmatically",
  },
  {
    slug: "generate-beautiful-pdf-reports-from-json-in-under-5-minutes",
    category: "tutorial",
    title: "Generate Beautiful PDF Reports from JSON in Under 5 Minutes",
    excerpt:
      "A quick workflow for turning JSON payloads into reusable report layouts with predictable output and low operational overhead.",
    keyword: "generate PDF from template",
  },
  {
    slug: "building-a-saas-invoice-system-with-docuforge-api",
    category: "tutorial",
    title: "Building a SaaS Invoice System with DocuForge API",
    excerpt:
      "A complete template + API pattern for recurring invoices, retries, and event-based triggers in SaaS billing pipelines.",
    keyword: "invoice generation API",
  },
  {
    slug: "pdf-generation-for-ecommerce-receipts-packing-slips-and-returns",
    category: "use-case",
    title: "PDF Generation for E-commerce: Receipts, Packing Slips, and Returns",
    excerpt:
      "How to standardize operational documents across checkout, fulfillment, and post-purchase workflows.",
    keyword: "document automation API",
  },
  {
    slug: "how-to-let-users-design-their-own-pdf-templates-without-code",
    category: "use-case",
    title: "How to Let Users Design Their Own PDF Templates (Without Code)",
    excerpt:
      "A safe, controlled architecture for user-customizable PDF output without exposing your system to template drift.",
    keyword: "dynamic PDF templates",
  },
  {
    slug: "how-to-generate-invoices-programmatically-with-an-api",
    category: "programmatic",
    title: "How to Generate Invoices Programmatically with an API",
    excerpt:
      "Use template versioning and idempotent render calls to deliver reliable invoice automation from backend jobs.",
    keyword: "invoice generation API",
  },
  {
    slug: "how-to-generate-shipping-labels-at-scale",
    category: "programmatic",
    title: "How to Generate Shipping Labels at Scale",
    excerpt:
      "Batch, retry, and queue-friendly techniques for high-volume shipping label generation.",
    keyword: "programmatic PDF generation",
  },
  {
    slug: "how-to-generate-bulk-certificates-from-a-csv",
    category: "programmatic",
    title: "How to Generate Bulk Certificates from a CSV",
    excerpt:
      "Convert structured CSV records into branded certificates with a deterministic template pipeline.",
    keyword: "document automation API",
  },
  {
    slug: "how-to-generate-dynamic-reports-from-json-data",
    category: "programmatic",
    title: "How to Generate Dynamic Reports from JSON Data",
    excerpt:
      "Render data-rich reports from nested JSON payloads while keeping template logic readable.",
    keyword: "dynamic PDF templates",
  },
  {
    slug: "how-to-generate-personalized-letters-in-bulk",
    category: "programmatic",
    title: "How to Generate Personalized Letters in Bulk",
    excerpt:
      "Scale personalization with merge-style data models and reusable paragraph fragments.",
    keyword: "programmatic PDF generation",
  },
  {
    slug: "how-to-generate-multi-page-pdf-statements",
    category: "programmatic",
    title: "How to Generate Multi-Page PDF Statements",
    excerpt:
      "Handle grouped line items, page breaks, and consistent totals in multi-page statements.",
    keyword: "PDF generation for SaaS",
  },
  {
    slug: "how-to-generate-barcoded-warehouse-labels",
    category: "programmatic",
    title: "How to Generate Barcoded Warehouse Labels",
    excerpt:
      "Build scan-first warehouse labels with predictable dimensions and high print readability.",
    keyword: "programmatic PDF generation",
  },
  {
    slug: "how-to-generate-custom-quotes-and-proposals-automatically",
    category: "programmatic",
    title: "How to Generate Custom Quotes/Proposals Automatically",
    excerpt:
      "Automate quote and proposal generation with pricing rules and reusable template sections.",
    keyword: "document automation API",
  },
  {
    slug: "how-to-generate-pdf-receipts-from-stripe-webhooks",
    category: "programmatic",
    title: "How to Generate PDF Receipts from Stripe Webhooks",
    excerpt:
      "Trigger receipt generation directly from billing events with idempotent request semantics.",
    keyword: "HTML to PDF API",
  },
  {
    slug: "how-to-generate-tax-documents-programmatically",
    category: "programmatic",
    title: "How to Generate Tax Documents (W-9, 1099) Programmatically",
    excerpt:
      "A safer template strategy for regulated tax output with strong version control and traceability.",
    keyword: "document automation API",
  },
  {
    slug: "best-pdf-generation-library-2026",
    category: "pain",
    title: "Best PDF Generation Library in 2026: What Actually Holds Up in Production",
    excerpt:
      "A practical evaluation framework for choosing a PDF stack when reliability, speed, and maintenance all matter.",
    keyword: "best PDF generation library 2026",
  },
  {
    slug: "how-to-automate-report-generation-with-an-api",
    category: "programmatic",
    title: "How to Automate Report Generation with an API",
    excerpt:
      "Design a report pipeline with template versioning, queue-safe rendering, and predictable API contracts.",
    keyword: "automate report generation API",
  },
  {
    slug: "puppeteer-pdf-slow-performance-fix",
    category: "pain",
    title: "Puppeteer PDF Slow Performance Fix: Practical Steps That Work",
    excerpt:
      "A bottleneck-first approach to reducing Puppeteer PDF latency, with migration options when tuning is not enough.",
    keyword: "Puppeteer PDF slow performance fix",
  },
];

type TemplateSpec = {
  slug: string;
  topic: string;
  useCase: string;
  priority?: boolean;
};

const templateSpecs: TemplateSpec[] = [
  {
    slug: "shipping-label",
    topic: "Shipping Label",
    useCase:
      "Generate carrier-ready labels from checkout and fulfillment systems without hand-editing layouts.",
    priority: true,
  },
  {
    slug: "invoice",
    topic: "Invoice",
    useCase:
      "Standardize invoice output across subscriptions, one-time charges, and finance reconciliation workflows.",
    priority: true,
  },
  {
    slug: "packing-slip",
    topic: "Packing Slip",
    useCase:
      "Package operations need a reliable summary of order lines, SKUs, and shipment notes.",
  },
  {
    slug: "receipt",
    topic: "Receipt",
    useCase:
      "Automatically issue receipts from payment events with consistent branding and tax line clarity.",
    priority: true,
  },
  {
    slug: "certificate",
    topic: "Certificate",
    useCase:
      "Create verifiable completion, attendance, and achievement certificates from user records.",
    priority: true,
  },
  {
    slug: "contract-agreement",
    topic: "Contract/Agreement",
    useCase:
      "Render legal-ready agreements with dynamic clauses and signature metadata placeholders.",
  },
  {
    slug: "resume-cv",
    topic: "Resume/CV",
    useCase:
      "Generate clean candidate resumes from structured profile fields with reusable section components.",
  },
  {
    slug: "report",
    topic: "Report",
    useCase:
      "Turn analytics and operational datasets into polished report documents with predictable structure.",
  },
  {
    slug: "boarding-pass",
    topic: "Boarding Pass",
    useCase:
      "Create travel-ready boarding passes with scannable identifiers and strict space constraints.",
  },
  {
    slug: "ticket-event-pass",
    topic: "Ticket/Event Pass",
    useCase:
      "Issue digital and printable event passes with attendee metadata and barcode fields.",
  },
  {
    slug: "prescription-label",
    topic: "Prescription Label",
    useCase:
      "Generate pharmacy labels with dosage instructions, identifiers, and regulated formatting requirements.",
  },
  {
    slug: "return-label",
    topic: "Return Label",
    useCase:
      "Streamline returns by generating pre-formatted return labels from order state transitions.",
  },
  {
    slug: "business-card",
    topic: "Business Card",
    useCase:
      "Produce consistent business cards from employee directories and role metadata.",
  },
  {
    slug: "warehouse-pick-list",
    topic: "Warehouse Pick List",
    useCase:
      "Create pick lists optimized for warehouse paths, item grouping, and fulfillment speed.",
  },
  {
    slug: "purchase-order",
    topic: "Purchase Order",
    useCase:
      "Automate purchase order generation with supplier-specific terms and itemized totals.",
  },
];

type CompareSpec = {
  slug: string;
  target: string;
  subtitle: string;
  priority?: boolean;
};

const compareSpecs: CompareSpec[] = [
  {
    slug: "puppeteer",
    target: "Puppeteer",
    subtitle: "Browser rendering flexibility vs API-first throughput and maintenance.",
    priority: true,
  },
  {
    slug: "wkhtmltopdf",
    target: "wkhtmltopdf",
    subtitle: "Legacy HTML conversion compatibility vs reliable template control.",
  },
  {
    slug: "latex",
    target: "LaTeX",
    subtitle: "Academic-grade typesetting vs API-first production workflow speed.",
  },
  {
    slug: "react-pdf",
    target: "React-PDF",
    subtitle: "Component-driven rendering vs strict document template separation.",
  },
  {
    slug: "anvil-pdf",
    target: "Anvil PDF",
    subtitle: "Managed document platform features vs code-first template ownership.",
  },
  {
    slug: "pdfmonkey",
    target: "PDFMonkey",
    subtitle: "Template SaaS workflows vs deeper developer customization controls.",
  },
  {
    slug: "carbone-io",
    target: "Carbone.io",
    subtitle: "Data-driven document generation vs straightforward implementation simplicity.",
  },
];

type IndustrySpec = {
  slug: string;
  industry: string;
  documents: string[];
};

const industrySpecs: IndustrySpec[] = [
  {
    slug: "ecommerce",
    industry: "E-commerce",
    documents: ["shipping labels", "receipts", "packing slips", "return labels"],
  },
  {
    slug: "healthcare",
    industry: "Healthcare",
    documents: ["prescription labels", "reports", "intake forms", "discharge summaries"],
  },
  {
    slug: "logistics",
    industry: "Logistics",
    documents: ["BOLs", "manifests", "shipping labels", "warehouse pick lists"],
  },
  {
    slug: "education",
    industry: "Education",
    documents: ["certificates", "transcripts", "ID cards", "exam reports"],
  },
  {
    slug: "finance",
    industry: "Finance",
    documents: ["statements", "invoices", "tax docs", "compliance summaries"],
  },
  {
    slug: "legal",
    industry: "Legal",
    documents: ["contracts", "NDAs", "compliance docs", "matter summaries"],
  },
  {
    slug: "hr",
    industry: "HR",
    documents: ["offer letters", "pay stubs", "onboarding packs", "policy acknowledgements"],
  },
];

const copyByLocale: Record<Locale, ContentHubCopy> = {
  en: {
    navBlogs: "Blogs",
    navPlayground: "Playground",
    readMore: "Read article",
    relatedTitle: "Related resources",
    faqTitle: "FAQ",
    updatedLabel: "Updated",
    quickAnswerTitle: "Quick answer",
    keyTakeawaysTitle: "Key takeaways",
    tryLiveLabel: "Try it live",
    collections: {
      blog: {
        label: "Developer blog",
        title: "Guides for PDF generation APIs and document automation",
        description:
          "Practical implementation guides, architecture comparisons, and scaling patterns for programmatic PDF generation.",
      },
      templates: {
        label: "Template tutorials",
        title: "How to create production-ready PDF templates",
        description:
          "Reusable Typst template walkthroughs with copyable code, API examples, and customization tips for high-intent use cases.",
      },
      compare: {
        label: "Comparisons",
        title: "Head-to-head: DocuForge vs the alternatives",
        description:
          "Implementation-level guidance to help engineering teams evaluate API-first and browser-driven rendering stacks.",
      },
      industries: {
        label: "Industry guides",
        title: "Document automation by industry",
        description:
          "Use-case landing pages for teams in commerce, logistics, healthcare, finance, legal, education, and HR.",
      },
    },
    titles: {
      howToCreate: (topic) => `How to Create a ${topic} PDF Template`,
      howToGenerate: (topic) => `How to Generate ${topic} Programmatically`,
      compare: (target) => `DocuForge vs ${target} for PDF Generation`,
      industry: (industry) => `PDF Generation for ${industry}`,
    },
    cta: {
      title: "Stop hand-crafting PDF pipelines — use DocuForge",
      body: "Use the DocuForge playground to validate templates live, then run the same payloads in production.",
      primary: "Try DocuForge free",
      secondary: "Open playground",
    },
  },
  fr: {
    navBlogs: "Blog",
    navPlayground: "Playground",
    readMore: "Lire l'article",
    relatedTitle: "Ressources associees",
    faqTitle: "FAQ",
    updatedLabel: "Mis a jour",
    quickAnswerTitle: "Reponse rapide",
    keyTakeawaysTitle: "Points cles",
    tryLiveLabel: "Tester en direct",
    collections: {
      blog: {
        label: "Blog developpeur",
        title: "Guides PDF generation API et automatisation documentaire",
        description:
          "Guides pratiques, comparatifs d'architecture et patterns de scalabilite pour Typst et la generation PDF programmatique.",
      },
      templates: {
        label: "Tutoriels templates",
        title: "Creer des templates PDF prets pour la production",
        description:
          "Tutoriels Typst avec code copiable, exemples API et conseils de personnalisation.",
      },
      compare: {
        label: "Comparatifs",
        title: "DocuForge vs autres outils de generation PDF",
        description:
          "Comparatifs techniques pour aider les equipes a choisir la bonne stack de rendu.",
      },
      industries: {
        label: "Guides metiers",
        title: "Automatisation documentaire par secteur",
        description:
          "Pages d'usage pour e-commerce, logistique, sante, finance, legal, education et RH.",
      },
    },
    titles: {
      howToCreate: (topic) => `Comment creer un template PDF ${topic}`,
      howToGenerate: (topic) => `Comment generer ${topic} par API`,
      compare: (target) => `DocuForge vs ${target} pour la generation PDF`,
      industry: (industry) => `Generation PDF pour ${industry}`,
    },
    cta: {
      title: "Livrez plus vite avec une API orientee templates",
      body: "Testez vos templates dans le playground, puis reutilisez la meme requete en production.",
      primary: "Essayer DocuForge gratuitement",
      secondary: "Ouvrir le playground",
    },
  },
  de: {
    navBlogs: "Blog",
    navPlayground: "Playground",
    readMore: "Artikel lesen",
    relatedTitle: "Verwandte Inhalte",
    faqTitle: "FAQ",
    updatedLabel: "Aktualisiert",
    quickAnswerTitle: "Kurzantwort",
    keyTakeawaysTitle: "Wichtigste Punkte",
    tryLiveLabel: "Live testen",
    collections: {
      blog: {
        label: "Developer Blog",
        title: "Guides fur PDF APIs und Dokumentautomatisierung",
        description:
          "Praxisnahe Guides, Tool-Vergleiche und Skalierungsansatze fur Typst und programmatische PDF-Erzeugung.",
      },
      templates: {
        label: "Template Tutorials",
        title: "Produktionsreife PDF Templates erstellen",
        description:
          "Wiederverwendbare Typst-Beispiele mit Code, API-Requests und Customization-Tipps.",
      },
      compare: {
        label: "Vergleiche",
        title: "DocuForge im Vergleich zu anderen PDF Tools",
        description:
          "Technische Vergleiche fur Engineering-Teams mit Fokus auf Betrieb und Geschwindigkeit.",
      },
      industries: {
        label: "Branchen",
        title: "Dokumentautomatisierung nach Branche",
        description:
          "Use-Case Seiten fur Commerce, Logistik, Healthcare, Finance, Legal, Education und HR.",
      },
    },
    titles: {
      howToCreate: (topic) => `${topic} PDF Template erstellen`,
      howToGenerate: (topic) => `${topic} programmatisch erzeugen`,
      compare: (target) => `DocuForge vs ${target} fur PDF Generierung`,
      industry: (industry) => `PDF Generierung fur ${industry}`,
    },
    cta: {
      title: "Schneller liefern mit einer Template-first API",
      body: "Templates live testen und dieselbe Payload direkt in Produktion verwenden.",
      primary: "DocuForge kostenlos testen",
      secondary: "Playground offnen",
    },
  },
  it: {
    navBlogs: "Blog",
    navPlayground: "Playground",
    readMore: "Leggi articolo",
    relatedTitle: "Risorse correlate",
    faqTitle: "FAQ",
    updatedLabel: "Aggiornato",
    quickAnswerTitle: "Risposta rapida",
    keyTakeawaysTitle: "Punti chiave",
    tryLiveLabel: "Provalo live",
    collections: {
      blog: {
        label: "Blog developer",
        title: "Guide per PDF generation API e automazione documentale",
        description:
          "Guide pratiche, confronti architetturali e pattern di scalabilita per Typst e PDF programmatici.",
      },
      templates: {
        label: "Tutorial template",
        title: "Come creare template PDF pronti per la produzione",
        description:
          "Tutorial Typst con codice copiabile, esempi API e suggerimenti di personalizzazione.",
      },
      compare: {
        label: "Confronti",
        title: "DocuForge vs altri tool di PDF generation",
        description:
          "Confronti tecnici orientati a scelta stack, costi e complessita operativa.",
      },
      industries: {
        label: "Guide settore",
        title: "Automazione documentale per settore",
        description:
          "Pagine use case per e-commerce, sanita, logistica, finance, legal, education e HR.",
      },
    },
    titles: {
      howToCreate: (topic) => `Come creare un template PDF ${topic}`,
      howToGenerate: (topic) => `Come generare ${topic} in modo programmatico`,
      compare: (target) => `DocuForge vs ${target} per PDF generation`,
      industry: (industry) => `PDF generation per ${industry}`,
    },
    cta: {
      title: "Rilascia piu velocemente con un'API template-first",
      body: "Prova i template nel playground e usa la stessa richiesta in produzione.",
      primary: "Prova DocuForge gratis",
      secondary: "Apri playground",
    },
  },
  es: {
    navBlogs: "Blog",
    navPlayground: "Playground",
    readMore: "Leer articulo",
    relatedTitle: "Recursos relacionados",
    faqTitle: "FAQ",
    updatedLabel: "Actualizado",
    quickAnswerTitle: "Respuesta rapida",
    keyTakeawaysTitle: "Puntos clave",
    tryLiveLabel: "Probar en vivo",
    collections: {
      blog: {
        label: "Blog developer",
        title: "Guias de PDF generation API y automatizacion documental",
        description:
          "Guias practicas, comparativas tecnicas y patrones de escalado para Typst y PDFs programaticos.",
      },
      templates: {
        label: "Tutoriales de templates",
        title: "Como crear templates PDF listos para produccion",
        description:
          "Tutoriales Typst con codigo copiable, ejemplos API y consejos de personalizacion.",
      },
      compare: {
        label: "Comparativas",
        title: "DocuForge vs otras herramientas de PDF generation",
        description:
          "Comparativas para equipos de ingenieria enfocados en rendimiento y mantenibilidad.",
      },
      industries: {
        label: "Guias por industria",
        title: "Automatizacion de documentos por industria",
        description:
          "Paginas de uso para ecommerce, salud, logistica, finanzas, legal, educacion y RRHH.",
      },
    },
    titles: {
      howToCreate: (topic) => `Como crear una plantilla PDF ${topic}`,
      howToGenerate: (topic) => `Como generar ${topic} programaticamente`,
      compare: (target) => `DocuForge vs ${target} para PDF generation`,
      industry: (industry) => `PDF generation para ${industry}`,
    },
    cta: {
      title: "Entrega mas rapido con una API orientada a plantillas",
      body: "Prueba plantillas en el playground y reutiliza la misma solicitud en produccion.",
      primary: "Probar DocuForge gratis",
      secondary: "Abrir playground",
    },
  },
  ar: {
    navBlogs: "المدونة",
    navPlayground: "Playground",
    readMore: "اقرا المقال",
    relatedTitle: "محتوى مرتبط",
    faqTitle: "الاسئلة الشائعة",
    updatedLabel: "اخر تحديث",
    quickAnswerTitle: "اجابة سريعة",
    keyTakeawaysTitle: "اهم النقاط",
    tryLiveLabel: "جرب مباشرة",
    collections: {
      blog: {
        label: "مدونة المطور",
        title: "ادلة PDF generation API و اتمتة المستندات",
        description:
          "ادلة عملية ومقارنات تقنية لتصميم قوالب Typst وتوليد PDF بشكل برمجي.",
      },
      templates: {
        label: "دروس القوالب",
        title: "كيفية انشاء قوالب PDF جاهزة للانتاج",
        description:
          "شروحات Typst مع كود قابل للنسخ وامثلة API ونصائح تخصيص.",
      },
      compare: {
        label: "مقارنات",
        title: "DocuForge مقارنة بادوات PDF اخرى",
        description:
          "مقارنات تقنية تساعد الفرق الهندسية على اختيار بنية التوليد المناسبة.",
      },
      industries: {
        label: "حلول حسب القطاع",
        title: "اتمتة المستندات حسب الصناعة",
        description:
          "صفحات استخدام للتجارة الالكترونية والصحة واللوجستيات والمالية والقانون والموارد البشرية.",
      },
    },
    titles: {
      howToCreate: (topic) => `كيفية انشاء قالب PDF ${topic}`,
      howToGenerate: (topic) => `كيفية توليد ${topic} برمجيا`,
      compare: (target) => `DocuForge مقابل ${target} لتوليد PDF`,
      industry: (industry) => `توليد PDF لقطاع ${industry}`,
    },
    cta: {
      title: "اطلق اسرع عبر API مبنية على القوالب",
      body: "اختبر القوالب في Playground ثم استخدم نفس الطلب في بيئة الانتاج.",
      primary: "جرب DocuForge مجانا",
      secondary: "افتح Playground",
    },
  },
  zh: {
    navBlogs: "博客",
    navPlayground: "Playground",
    readMore: "阅读文章",
    relatedTitle: "相关文章",
    faqTitle: "常见问题",
    updatedLabel: "更新于",
    quickAnswerTitle: "快速结论",
    keyTakeawaysTitle: "关键要点",
    tryLiveLabel: "在线试用",
    collections: {
      blog: {
        label: "开发者博客",
        title: "PDF generation API 与文档自动化指南",
        description:
          "面向工程团队的实战指南、架构对比与扩展模式，覆盖 Typst 与程序化 PDF 生成。",
      },
      templates: {
        label: "模板教程",
        title: "如何创建可用于生产的 PDF 模板",
        description:
          "包含可复制 Typst 代码、API 调用示例和定制建议的模板页面集合。",
      },
      compare: {
        label: "对比",
        title: "DocuForge 与其他 PDF 工具对比",
        description:
          "帮助技术团队从性能、维护性和交付效率角度选择工具。",
      },
      industries: {
        label: "行业方案",
        title: "按行业的文档自动化",
        description:
          "覆盖电商、医疗、物流、教育、金融、法务与人力资源场景。",
      },
    },
    titles: {
      howToCreate: (topic) => `如何创建 ${topic} PDF 模板`,
      howToGenerate: (topic) => `如何以编程方式生成 ${topic}`,
      compare: (target) => `DocuForge 与 ${target} 的 PDF 生成对比`,
      industry: (industry) => `${industry} 行业的 PDF 生成`,
    },
    cta: {
      title: "通过模板优先 API 更快交付",
      body: "先在 Playground 实时测试模板，再将同一请求投入生产。",
      primary: "免费试用 DocuForge",
      secondary: "打开 Playground",
    },
  },
};

const fixedBlogTitles: Partial<Record<Locale, Record<string, string>>> = {
  fr: {
    "why-we-built-docuforge-pdf-generation-shouldnt-be-this-hard":
      "Pourquoi nous avons cree DocuForge : la generation PDF ne devrait pas etre aussi complexe",
    "typst-vs-html-css-for-pdf-templates":
      "Typst vs HTML/CSS pour les templates PDF - comparaison developpeur",
    "puppeteer-pdf-generation-is-slow-heres-a-faster-alternative":
      "La generation PDF avec Puppeteer est lente - voici une alternative plus rapide",
  },
  de: {
    "why-we-built-docuforge-pdf-generation-shouldnt-be-this-hard":
      "Warum wir DocuForge gebaut haben: PDF Generierung sollte nicht so schwer sein",
    "typst-vs-html-css-for-pdf-templates":
      "Typst vs HTML/CSS fur PDF Templates - Entwicklervergleich",
    "puppeteer-pdf-generation-is-slow-heres-a-faster-alternative":
      "Puppeteer PDF ist langsam - hier ist eine schnellere Alternative",
  },
  it: {
    "why-we-built-docuforge-pdf-generation-shouldnt-be-this-hard":
      "Perche abbiamo creato DocuForge: la PDF generation non dovrebbe essere cosi difficile",
    "typst-vs-html-css-for-pdf-templates":
      "Typst vs HTML/CSS per template PDF - confronto per developer",
    "puppeteer-pdf-generation-is-slow-heres-a-faster-alternative":
      "Puppeteer PDF e lento - ecco un'alternativa piu veloce",
  },
  es: {
    "why-we-built-docuforge-pdf-generation-shouldnt-be-this-hard":
      "Por que construimos DocuForge: la generacion PDF no deberia ser tan dificil",
    "typst-vs-html-css-for-pdf-templates":
      "Typst vs HTML/CSS para plantillas PDF - comparacion para developers",
    "puppeteer-pdf-generation-is-slow-heres-a-faster-alternative":
      "La generacion PDF con Puppeteer es lenta - aqui tienes una alternativa mas rapida",
  },
  ar: {
    "why-we-built-docuforge-pdf-generation-shouldnt-be-this-hard":
      "لماذا بنينا DocuForge: توليد PDF لا يجب ان يكون بهذا التعقيد",
    "typst-vs-html-css-for-pdf-templates":
      "Typst مقابل HTML/CSS لقوالب PDF - مقارنة للمطورين",
    "puppeteer-pdf-generation-is-slow-heres-a-faster-alternative":
      "توليد PDF عبر Puppeteer بطيء - هذا بديل اسرع",
  },
  zh: {
    "why-we-built-docuforge-pdf-generation-shouldnt-be-this-hard":
      "我们为什么构建 DocuForge：PDF 生成不该这么难",
    "typst-vs-html-css-for-pdf-templates":
      "Typst 与 HTML/CSS 的 PDF 模板对比（开发者视角）",
    "puppeteer-pdf-generation-is-slow-heres-a-faster-alternative":
      "Puppeteer PDF 生成太慢：一个更快的替代方案",
  },
};

function getCopy(locale: Locale): ContentHubCopy {
  return copyByLocale[locale] ?? copyByLocale.en;
}

export function getContentHubCopy(locale: Locale): ContentHubCopy {
  return getCopy(locale);
}

function toPath(collection: ContentCollection, slug: string) {
  return `/${collection}/${slug}`;
}

function normalizeTitle(locale: Locale, spec: BlogSpec): string {
  return fixedBlogTitles[locale]?.[spec.slug] ?? spec.title;
}

function buildArticleCodeExample(slug: string) {
  return `curl -X POST "$DOCUFORGE_API_URL/v1/render" \\
  -H "X-API-Key: $DOCUFORGE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "tpl_${slug.replaceAll("-", "_")}",
    "data": {
      "document_id": "${slug.toUpperCase().slice(0, 12)}-001",
      "generated_at": "2026-02-19T12:00:00Z"
    }
  }' \\
  --output document.pdf`;
}

function buildTemplateTypst(topic: string) {
  return `#set page(paper: "a4", margin: 12pt)
#set text(font: "Inter", size: 10pt)

#let payload = sys.inputs

#grid(
  columns: (2fr, 1fr),
  gutter: 12pt,
  [#text(size: 18pt, weight: "bold")[${topic}]],
  [#align(right)[#text(weight: "semibold")[#payload.document_id]]],
)

#v(8pt)
#line(length: 100%)
#v(8pt)

#for (label, value) in (
  ("Customer", payload.customer),
  ("Date", payload.date),
  ("Reference", payload.reference),
) {
  #grid(columns: (1fr, 2fr), [#text(fill: rgb("#666"))[#label]], [#value])
}

#v(10pt)
#table(
  columns: (2fr, auto, auto),
  inset: 6pt,
  stroke: rgb("#ddd"),
  [*Item*], [*Qty*], [*Amount*],
  ..payload.items.map(item => (
    item.name,
    str(item.qty),
    "$" + str(item.amount),
  )).flatten(),
)

#align(right)[#text(weight: "bold")[Total: $ #payload.total]]`;
}

function buildTemplateJsonExample() {
  return `{
  "document_id": "DOC-1001",
  "customer": "Acme Fulfillment",
  "date": "2026-02-19",
  "reference": "REF-9920",
  "items": [
    { "name": "Widget A", "qty": 2, "amount": 49.99 },
    { "name": "Widget B", "qty": 1, "amount": 19.99 }
  ],
  "total": 119.97
}`;
}

function buildJavascriptExample(slug: string) {
  return `const response = await fetch(\`\${process.env.DOCUFORGE_API_URL}/v1/render\`, {
  method: "POST",
  headers: {
    "X-API-Key": process.env.DOCUFORGE_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    template_id: "tpl_${slug.replaceAll("-", "_")}",
    data: payload,
  }),
});

const pdf = await response.arrayBuffer();`;
}

function buildPythonExample(slug: string) {
  return `import requests

resp = requests.post(
    f"{API_URL}/v1/render",
    headers={"X-API-Key": API_KEY, "Content-Type": "application/json"},
    json={
        "template_id": "tpl_${slug.replaceAll("-", "_")}",
        "data": payload,
    },
    timeout=30,
)

with open("output.pdf", "wb") as f:
    f.write(resp.content)`;
}

function buildBlogDocument(spec: BlogSpec, locale: Locale): ContentDocument {
  const copy = getCopy(locale);
  const title = normalizeTitle(locale, spec);
  const metaTitle = `${title} | DocuForge`;
  const metaDescription = `${spec.excerpt} Learn implementation patterns, code examples, and rollout guidance for ${spec.keyword}.`;
  const intro = `When your PDF pipeline cracks at 2 AM and customers are waiting on invoices, debugging headless Chromium is the last thing you want to do. This guide cuts to what actually matters for ${spec.keyword} in production: templates that render the same way every time, render jobs that survive queue spikes, and an API surface with clear failure modes so on-call is boring.`;

  const profileByCategory: Record<
    BlogSpec["category"],
    {
      quickAnswer: string;
      implementationTitle: string;
      implementationParagraphs: string[];
      takeaways: string[];
      valueProps: string[];
      faq: ContentFaq[];
    }
  > = {
    foundation: {
      quickAnswer:
        "Use a Typst template contract, keep preview and production paths separate, and make version promotion explicit.",
      implementationTitle: "Architecture baseline",
      implementationParagraphs: [
        "Treat each document family as a versioned template with a stable JSON schema. This prevents layout drift and keeps changes reviewable.",
        "Use preview rendering for iteration and production rendering for published versions only. That split avoids accidental draft leakage.",
      ],
      takeaways: [
        "Typst templates render the same way every time — no surprises from print CSS quirks.",
        "Versioned publish flow keeps document behavior auditable.",
        "Typed responses and stable error payloads reduce debugging time.",
        "Queue-friendly render routes keep throughput predictable under load.",
      ],
      valueProps: [
        "Rust + Typst engine avoids headless browser overhead in production.",
        "Clear API contract for auth, render, usage, and template lifecycle.",
        "Security controls include hashed API keys and signed webhook events.",
      ],
      faq: [
        {
          question: "How should we start migrating existing PDF workflows?",
          answer:
            "Move one high-volume document first, lock the data contract, and run both systems in parallel until render parity is verified.",
        },
        {
          question: "What usually breaks first in production?",
          answer:
            "Unversioned template edits and weak payload validation. Put both under explicit release and schema checks.",
        },
      ],
    },
    pain: {
      quickAnswer:
        "Remove browser rendering from the hot path, stabilize template inputs, and run rendering behind retry-aware queues.",
      implementationTitle: "Bottleneck-first fix strategy",
      implementationParagraphs: [
        "Profile p50/p95 render latency and separate CPU-bound rendering from request orchestration. Browser startup and CSS layout variability are frequent latency multipliers.",
        "Adopt idempotent job processing with bounded retries and observable failure codes so incidents can be triaged quickly.",
      ],
      takeaways: [
        "Latency problems usually come from runtime variability, not template complexity.",
        "Queue retry policy should be explicit, bounded, and observable.",
        "Use separate preview and production routes to contain blast radius.",
        "Treat render failures as typed events, not generic logs.",
      ],
      valueProps: [
        "Predictable Typst rendering reduces variance compared with browser-based pipelines.",
        "Usage limits and rate controls are enforced at API boundaries.",
        "Structured errors make fallback and retry logic straightforward.",
      ],
      faq: [
        {
          question: "Can we keep Puppeteer and still improve performance?",
          answer:
            "Yes, with pooling and caching, but beyond a threshold operational cost and variance often remain high; measure against a deterministic alternative.",
        },
        {
          question: "What metrics should we track first?",
          answer:
            "Track p50/p95 render duration, failure rate by error code, and queue retry depth per document type.",
        },
      ],
    },
    tutorial: {
      quickAnswer:
        "Start with one practical template, wire JSON inputs to stable fields, and move the same payload from preview to production.",
      implementationTitle: "Implementation flow",
      implementationParagraphs: [
        "Define the template input schema before writing layout logic. This keeps your API payload stable as the design evolves.",
        "Use published template versions in production and keep fast preview loops for authoring. This gives velocity without sacrificing change control.",
      ],
      takeaways: [
        "Schema-first templates reduce regression risk during design edits.",
        "Preview loops should be fast; production renders should be repeatable.",
        "Small reusable template fragments beat copy-paste document blocks.",
        "Keep code examples close to real production payloads.",
      ],
      valueProps: [
        "Template versioning and publish workflow are built into the platform.",
        "Playground and docs map directly to the same API render contract.",
        "Typed endpoints keep integration logic consistent across teams.",
      ],
      faq: [
        {
          question: "Should template logic include business rules?",
          answer:
            "Keep heavy business rules in backend payload preparation; templates should focus on deterministic presentation.",
        },
        {
          question: "How do we reduce template drift over time?",
          answer:
            "Use reusable snippets, version every release, and run sample payload regression previews before publishing.",
        },
      ],
    },
    "use-case": {
      quickAnswer:
        "Model each use case with a dedicated template contract, then standardize payload mapping from upstream systems.",
      implementationTitle: "Use-case pattern",
      implementationParagraphs: [
        "Keep branding and tenant-specific values in data, not forked layouts. This preserves consistency while supporting customization.",
        "Design a minimal document schema and transform source events into it at ingestion boundaries. Stable schemas simplify multi-team ownership.",
      ],
      takeaways: [
        "One template family per document intent scales better than per-customer forks.",
        "Normalization layers prevent upstream system changes from breaking layout logic.",
        "Webhooks and retries should be signed and auditable.",
        "Security and compliance requirements should be encoded in routing and key scope.",
      ],
      valueProps: [
        "API-key and JWT paths are separated by endpoint intent.",
        "Webhook signatures and HTTPS validation are enforced in production paths.",
        "Version promotion supports controlled rollout across customer segments.",
      ],
      faq: [
        {
          question: "How do we handle per-customer branding without template sprawl?",
          answer:
            "Store brand variables in payload data and keep the underlying template shared per document class.",
        },
        {
          question: "What is the safest rollout strategy?",
          answer:
            "Publish new versions behind a subset of traffic, compare outputs, then promote globally once parity checks pass.",
        },
      ],
    },
    programmatic: {
      quickAnswer:
        "Treat rendering as a backend job pipeline: idempotent requests, queue control, and deterministic templates.",
      implementationTitle: "Production automation pattern",
      implementationParagraphs: [
        "Feed render jobs through queues partitioned by document type or priority. This prevents a noisy workload from starving critical documents.",
        "Attach stable idempotency keys per business document event so retries do not create duplicate outputs.",
      ],
      takeaways: [
        "Queue partitioning and idempotency are mandatory at scale.",
        "Template version IDs should be explicit in production render events.",
        "Monitor usage and quotas by plan and document family.",
        "Keep failure handling deterministic with typed error branches.",
      ],
      valueProps: [
        "Render API is queue-friendly with predictable request/response envelopes.",
        "Usage and billing endpoints support operational visibility.",
        "No headless Chrome dependency in the main render engine path.",
      ],
      faq: [
        {
          question: "How do we avoid duplicate documents on retries?",
          answer:
            "Use business-event idempotency keys and persist render outcomes before acknowledging queue completion.",
        },
        {
          question: "What should we put in dead-letter queues?",
          answer:
            "Jobs with non-retryable schema/template failures and jobs that exceeded bounded retry policy.",
        },
      ],
    },
  };

  const profile = profileByCategory[spec.category];

  const blocks: ContentBlock[] = [
    {
      kind: "paragraph",
      title: copy.quickAnswerTitle,
      paragraphs: [profile.quickAnswer],
    },
    {
      kind: "paragraph",
      title: profile.implementationTitle,
      paragraphs: profile.implementationParagraphs,
    },
    {
      kind: "code",
      title: "API request example",
      language: "bash",
      code: buildArticleCodeExample(spec.slug),
    },
    {
      kind: "list",
      title: copy.keyTakeawaysTitle,
      items: profile.takeaways,
    },
    {
      kind: "list",
      title: "Why teams choose DocuForge for this workflow",
      items: profile.valueProps,
    },
    {
      kind: "links",
      title: copy.relatedTitle,
      links: [
        { href: "/docs", title: "DocuForge API docs" },
        { href: "/docs#security", title: "Security controls and governance" },
        { href: "/docs#mcp", title: "MCP integration docs" },
        { href: "/templates/invoice", title: "Invoice template tutorial" },
        { href: "/templates/shipping-label", title: "Shipping label template tutorial" },
        { href: "/playground", title: "Template playground" },
      ],
    },
  ];

  return {
    collection: "blog",
    category: spec.category,
    slug: spec.slug,
    title,
    metaTitle,
    metaDescription,
    excerpt: spec.excerpt,
    intro,
    keywords: [spec.keyword, ...coreKeywords],
    blocks,
    ctaTitle: copy.cta.title,
    ctaBody: copy.cta.body,
    ctaPrimaryLabel: copy.cta.primary,
    ctaPrimaryHref: "/register",
    ctaSecondaryLabel: copy.cta.secondary,
    ctaSecondaryHref: "/playground",
    related: [],
    updatedAt: "2026-02-24",
    priority: Boolean(spec.priority),
    faq: profile.faq,
  };
}

function buildTemplateDocument(spec: TemplateSpec, locale: Locale): ContentDocument {
  const copy = getCopy(locale);
  const title = copy.titles.howToCreate(spec.topic);
  const metaTitle = `${title} | DocuForge`;
  const metaDescription = `Learn how to create and generate ${spec.topic.toLowerCase()} PDFs programmatically using Typst templates and the DocuForge API.`;
  const intro = `${spec.useCase} This tutorial shows a full template workflow you can ship today: preview the target output, copy the Typst template, pass dynamic data via API, and productionize with repeatable request payloads.`;

  const slugSafe = spec.slug.replaceAll("-", "_");
  const blocks: ContentBlock[] = [
    {
      kind: "paragraph",
      title: "1. What you'll build",
      paragraphs: [
        `You will build a ${spec.topic} PDF template that accepts dynamic data and renders consistently across environments.`,
        "The final document includes branded header content, structured rows, and predictable totals suitable for programmatic generation.",
      ],
    },
    {
      kind: "code",
      title: "2. The Typst template code (copyable)",
      language: "typst",
      code: buildTemplateTypst(spec.topic),
    },
    {
      kind: "code",
      title: "3. Passing dynamic data via API",
      language: "json",
      code: buildTemplateJsonExample(),
    },
    {
      kind: "code",
      title: "4. Full API request example (curl)",
      language: "bash",
      code: `curl -X POST "$DOCUFORGE_API_URL/v1/render" \\
  -H "X-API-Key: $DOCUFORGE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template_id": "tpl_${slugSafe}",
    "data": {
      "document_id": "DOC-1001",
      "customer": "Acme Fulfillment",
      "date": "2026-02-19",
      "reference": "REF-9920",
      "items": [
        { "name": "Widget A", "qty": 2, "amount": 49.99 },
        { "name": "Widget B", "qty": 1, "amount": 19.99 }
      ],
      "total": 119.97
    }
  }' \\
  --output ${spec.slug}.pdf`,
    },
    {
      kind: "code",
      title: "4. Full API request example (JavaScript)",
      language: "ts",
      code: buildJavascriptExample(spec.slug),
    },
    {
      kind: "code",
      title: "4. Full API request example (Python)",
      language: "python",
      code: buildPythonExample(spec.slug),
    },
    {
      kind: "list",
      title: "5. Customization tips (logo, barcode, layout)",
      items: [
        "Keep document width and spacing constants in one place to avoid drift.",
        "Prefer deterministic barcode input values generated by your backend.",
        "Store brand colors and typography in template variables for easy theme updates.",
        "Use reusable snippets for repeated footers, legal text, and totals.",
      ],
    },
    {
      kind: "links",
      title: `6. ${copy.tryLiveLabel}`,
      links: [{ href: "/playground", title: copy.cta.secondary }],
    },
  ];

  const faq: ContentFaq[] = [
    {
      question: `Can I reuse this ${spec.topic.toLowerCase()} template across multiple customers?`,
      answer:
        "Yes. Keep customer-specific values in the data payload and keep the layout logic in the template.",
    },
    {
      question: "Which endpoint should I use in production?",
      answer:
        "Use POST /v1/render with an API key for production traffic, and POST /v1/render/preview for draft iteration.",
    },
  ];

  return {
    collection: "templates",
    category: "template",
    slug: spec.slug,
    title,
    metaTitle,
    metaDescription,
    excerpt: spec.useCase,
    intro,
    keywords: [title, "Typst PDF generation", "generate PDF from template", ...coreKeywords],
    blocks,
    faq,
    ctaTitle: "Generate this with DocuForge in seconds",
    ctaBody: "Use the same template in preview and production routes with a stable request payload.",
    ctaPrimaryLabel: copy.cta.primary,
    ctaPrimaryHref: "/register",
    ctaSecondaryLabel: copy.cta.secondary,
    ctaSecondaryHref: "/playground",
    related: [],
    updatedAt: "2026-02-19",
    priority: Boolean(spec.priority),
  };
}

function buildComparisonDocument(spec: CompareSpec, locale: Locale): ContentDocument {
  const copy = getCopy(locale);
  const title = copy.titles.compare(spec.target);
  const metaTitle = `${title} | DocuForge`;
  const metaDescription = `Compare DocuForge and ${spec.target} for performance, template maintainability, developer experience, and API workflow fit.`;
  const intro = `Teams evaluating ${spec.target} are usually balancing delivery speed, infrastructure overhead, and template maintainability. This comparison is written for implementation decisions, not marketing checklists. It highlights where each option fits, where migration cost appears, and what to benchmark before committing.`;

  const blocks: ContentBlock[] = [
    {
      kind: "paragraph",
      title: "Decision context",
      paragraphs: [
        spec.subtitle,
        "Choose based on your dominant constraint: rendering throughput, template ownership model, or operational complexity.",
      ],
    },
    {
      kind: "list",
      title: "What to benchmark first",
      items: [
        "Median and p95 render time for your top 3 templates.",
        "Error rate under queue burst load and retry behavior.",
        "Template authoring overhead for non-trivial multi-page documents.",
        "Cost profile at projected monthly document volume.",
      ],
    },
    {
      kind: "code",
      title: "Benchmark harness starter (Node.js)",
      language: "ts",
      code: `import { performance } from "node:perf_hooks";

async function benchmark(run: () => Promise<void>, rounds = 20) {
  const durations: number[] = [];
  for (let i = 0; i < rounds; i += 1) {
    const start = performance.now();
    await run();
    durations.push(performance.now() - start);
  }
  durations.sort((a, b) => a - b);
  return {
    p50: durations[Math.floor(durations.length * 0.5)],
    p95: durations[Math.floor(durations.length * 0.95)],
  };
}`,
    },
    {
      kind: "links",
      title: copy.relatedTitle,
      links: [
        { href: "/blog/puppeteer-pdf-generation-is-slow-heres-a-faster-alternative", title: "Performance alternatives guide" },
        { href: "/templates/invoice", title: "Invoice template tutorial" },
      ],
    },
  ];

  return {
    collection: "compare",
    category: "comparison",
    slug: spec.slug,
    title,
    metaTitle,
    metaDescription,
    excerpt: spec.subtitle,
    intro,
    keywords: [title, "Puppeteer PDF alternative", "best PDF generation library 2026", ...coreKeywords],
    blocks,
    faq: [
      {
        question: "Should we migrate all templates at once?",
        answer:
          "No. Start with one high-volume document category, measure latency and error reduction, then migrate incrementally.",
      },
      {
        question: "What makes comparison results credible?",
        answer:
          "Use the same payload set, the same infrastructure class, and compare at p50 and p95 latencies with failure rate.",
      },
    ],
    ctaTitle: copy.cta.title,
    ctaBody: copy.cta.body,
    ctaPrimaryLabel: copy.cta.primary,
    ctaPrimaryHref: "/register",
    ctaSecondaryLabel: copy.cta.secondary,
    ctaSecondaryHref: "/playground",
    related: [],
    updatedAt: "2026-02-19",
    priority: Boolean(spec.priority),
  };
}

function buildIndustryDocument(spec: IndustrySpec, locale: Locale): ContentDocument {
  const copy = getCopy(locale);
  const title = copy.titles.industry(spec.industry);
  const metaTitle = `${title} | DocuForge`;
  const metaDescription = `${title} with template-first automation for ${spec.documents.join(", ")} and other operational workflows.`;
  const intro = `${spec.industry} teams often need consistent documents across customer communication, operations, and compliance. A template-first API reduces manual overhead by keeping layout logic centralized while data stays dynamic. This guide outlines the highest-impact document types and an implementation model that can scale with real traffic.`;

  const blocks: ContentBlock[] = [
    {
      kind: "list",
      title: "High-impact document workflows",
      items: spec.documents.map((item) => `Automate ${item} with reusable data contracts.`),
    },
    {
      kind: "paragraph",
      title: "Recommended architecture",
      paragraphs: [
        "Use one template family per workflow, then map source-system fields into a normalized document payload before rendering.",
        "Route preview workflows through authenticated user sessions and production workflows through API keys with monthly quota monitoring.",
      ],
    },
    {
      kind: "code",
      title: "Queue worker pseudocode",
      language: "ts",
      code: `for await (const job of queue.consume("document-jobs")) {
  const payload = mapSourceToDocument(job.data);
  await renderWithTemplate(job.templateId, payload);
  await markJobDone(job.id);
}`,
    },
    {
      kind: "links",
      title: copy.relatedTitle,
      links: [
        { href: "/templates/shipping-label", title: "Shipping label template" },
        { href: "/templates/invoice", title: "Invoice template" },
        { href: "/blog/how-to-generate-invoices-programmatically-with-an-api", title: "Programmatic invoice guide" },
      ],
    },
  ];

  return {
    collection: "industries",
    category: "industry",
    slug: spec.slug,
    title,
    metaTitle,
    metaDescription,
    excerpt: `${spec.industry} document automation patterns for API-first teams.`,
    intro,
    keywords: [title, "document automation API", ...coreKeywords],
    blocks,
    faq: [
      {
        question: `Which ${spec.industry} document should we automate first?`,
        answer:
          "Start with the highest-frequency document that currently causes manual rework, then standardize upstream payload mapping.",
      },
      {
        question: "How do we keep compliance-sensitive documents stable?",
        answer:
          "Use versioned templates with explicit release steps and audit-friendly change notes for each update.",
      },
    ],
    ctaTitle: copy.cta.title,
    ctaBody: copy.cta.body,
    ctaPrimaryLabel: copy.cta.primary,
    ctaPrimaryHref: "/register",
    ctaSecondaryLabel: copy.cta.secondary,
    ctaSecondaryHref: "/playground",
    related: [],
    updatedAt: "2026-02-19",
    priority: false,
  };
}

function buildCollection(collection: ContentCollection, locale: Locale): ContentDocument[] {
  switch (collection) {
    case "blog":
      return blogSpecs.map((spec) => buildBlogDocument(spec, locale));
    case "templates":
      return templateSpecs.map((spec) => buildTemplateDocument(spec, locale));
    case "compare":
      return compareSpecs.map((spec) => buildComparisonDocument(spec, locale));
    case "industries":
      return industrySpecs.map((spec) => buildIndustryDocument(spec, locale));
    default:
      return [];
  }
}

function withRelated(docs: ContentDocument[]): ContentDocument[] {
  return docs.map((doc) => {
    const related = docs
      .filter((candidate) => candidate.slug !== doc.slug)
      .sort((a, b) => Number(b.priority) - Number(a.priority))
      .slice(0, 3)
      .map((candidate) => ({
        href: toPath(candidate.collection, candidate.slug),
        title: candidate.title,
      }));

    return { ...doc, related };
  });
}

export function listContent(collection: ContentCollection, locale: Locale): ContentDocument[] {
  return withRelated(buildCollection(collection, locale)).sort((a, b) => {
    if (a.priority !== b.priority) return a.priority ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export function getContentBySlug(
  collection: ContentCollection,
  slug: string,
  locale: Locale
): ContentDocument | null {
  const docs = listContent(collection, locale);
  return docs.find((doc) => doc.slug === slug) ?? null;
}

export function getCollectionMeta(collection: ContentCollection, locale: Locale): CollectionMeta {
  return getCopy(locale).collections[collection];
}

export function getContentHubNav(locale: Locale) {
  const copy = getCopy(locale);
  return {
    blogLabel: copy.navBlogs,
    playgroundLabel: copy.navPlayground,
  };
}

export function listAllContentPaths(): Array<{ collection: ContentCollection; slug: string }> {
  return [
    ...blogSpecs.map((item) => ({ collection: "blog" as const, slug: item.slug })),
    ...templateSpecs.map((item) => ({ collection: "templates" as const, slug: item.slug })),
    ...compareSpecs.map((item) => ({ collection: "compare" as const, slug: item.slug })),
    ...industrySpecs.map((item) => ({ collection: "industries" as const, slug: item.slug })),
  ];
}
