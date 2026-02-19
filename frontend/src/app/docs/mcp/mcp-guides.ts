import type { Locale } from "@/src/lib/i18n-config";

type McpGuide = {
  title: string;
  description: string;
  steps: string[];
  githubDoc: string;
};

type McpGuideSet = {
  overview: McpGuide;
  cursor: McpGuide;
  claude: McpGuide;
  codex: McpGuide;
};

const guides: Record<Locale, McpGuideSet> = {
  en: {
    overview: {
      title: "DocuForge MCP Overview",
      description:
        "Use the DocuForge MCP server to list templates, render previews, render production PDFs, and fetch usage directly from MCP-enabled clients.",
      steps: [
        "Set MCP server URL to https://mcp.docuforge.app/mcp (or your self-hosted endpoint).",
        "Pass Authorization: Bearer <MCP_SERVER_TOKEN> in MCP client headers.",
        "Configure DocuForge API credentials in the MCP server environment.",
        "Call tools: docuforge_get_usage, docuforge_list_templates, docuforge_get_template, docuforge_render_pdf, docuforge_render_preview_pdf.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/overview.md",
    },
    cursor: {
      title: "DocuForge MCP Setup in Cursor",
      description:
        "Connect Cursor to DocuForge MCP so prompts can call template and render tools directly.",
      steps: [
        "Open Cursor MCP settings and add a new HTTP MCP server.",
        "Set endpoint to your MCP server URL and attach bearer token auth.",
        "Validate with a read-only tool call such as docuforge_get_usage.",
        "Run render-preview calls before production render calls.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/cursor.md",
    },
    claude: {
      title: "DocuForge MCP Setup in Claude",
      description:
        "Use Claude with DocuForge MCP tools for template retrieval and PDF generation workflows.",
      steps: [
        "Register the MCP endpoint in your Claude MCP integration settings.",
        "Provide bearer token headers and verify the connection.",
        "Test docuforge_list_templates and docuforge_get_template before rendering.",
        "Use docuforge_render_preview_pdf for draft validation.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/claude.md",
    },
    codex: {
      title: "DocuForge MCP Setup in Codex",
      description:
        "Configure Codex with DocuForge MCP tools to automate template and rendering operations.",
      steps: [
        "Add the MCP server URL and bearer token to your Codex MCP config.",
        "Confirm auth by calling docuforge_get_usage.",
        "Use docuforge_get_template to inspect live template metadata.",
        "Render previews first, then finalize with docuforge_render_pdf.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/codex.md",
    },
  },
  fr: {
    overview: {
      title: "Vue d'ensemble MCP DocuForge",
      description:
        "Connectez vos clients MCP a DocuForge pour lister des templates et generer des PDF.",
      steps: [
        "Definissez l'endpoint MCP et activez l'auth Bearer.",
        "Configurez les credentials API DocuForge dans l'environnement du serveur MCP.",
        "Testez docuforge_get_usage puis docuforge_list_templates.",
        "Utilisez le rendu preview avant le rendu production.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/overview.md",
    },
    cursor: {
      title: "Configuration MCP DocuForge dans Cursor",
      description: "Configurez Cursor pour appeler les outils MCP DocuForge.",
      steps: [
        "Ajoutez un serveur MCP HTTP.",
        "Ajoutez le token Bearer.",
        "Validez via docuforge_get_usage.",
        "Utilisez preview puis render.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/cursor.md",
    },
    claude: {
      title: "Configuration MCP DocuForge dans Claude",
      description: "Branchez Claude sur les outils DocuForge via MCP.",
      steps: [
        "Declarez l'endpoint MCP.",
        "Ajoutez l'auth Bearer.",
        "Listez les templates puis recuperez les details.",
        "Rendez en preview avant production.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/claude.md",
    },
    codex: {
      title: "Configuration MCP DocuForge dans Codex",
      description: "Automatisez templates et rendu PDF depuis Codex via MCP.",
      steps: [
        "Configurez URL MCP + token.",
        "Validez l'acces avec docuforge_get_usage.",
        "Inspectez les templates avec docuforge_get_template.",
        "Utilisez preview puis render final.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/codex.md",
    },
  },
  de: {
    overview: {
      title: "DocuForge MCP Uberblick",
      description: "Verbinde MCP-Clients mit DocuForge fur Templates und PDF-Rendering.",
      steps: [
        "MCP URL setzen und Bearer Auth aktivieren.",
        "DocuForge API Credentials im MCP Server hinterlegen.",
        "Mit docuforge_get_usage testen.",
        "Erst Preview, dann Production Render.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/overview.md",
    },
    cursor: {
      title: "DocuForge MCP in Cursor",
      description: "Cursor mit DocuForge MCP Tools verbinden.",
      steps: [
        "HTTP MCP Server eintragen.",
        "Bearer Token konfigurieren.",
        "Mit docuforge_get_usage verifizieren.",
        "Preview-Render vor Final-Render nutzen.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/cursor.md",
    },
    claude: {
      title: "DocuForge MCP in Claude",
      description: "Claude mit DocuForge Tools uber MCP nutzen.",
      steps: [
        "MCP Endpoint registrieren.",
        "Bearer Auth setzen.",
        "Templates auflisten und abrufen.",
        "Preview zuerst ausfuhren.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/claude.md",
    },
    codex: {
      title: "DocuForge MCP in Codex",
      description: "Codex mit DocuForge MCP fur PDF Workflows konfigurieren.",
      steps: [
        "MCP URL und Token eintragen.",
        "Mit docuforge_get_usage testen.",
        "Template Details laden.",
        "Preview und finalen Render trennen.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/codex.md",
    },
  },
  it: {
    overview: {
      title: "Panoramica MCP DocuForge",
      description: "Collega client MCP a DocuForge per template e rendering PDF.",
      steps: [
        "Imposta endpoint MCP con auth Bearer.",
        "Configura credenziali API nel server MCP.",
        "Verifica con docuforge_get_usage.",
        "Usa preview prima del render finale.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/overview.md",
    },
    cursor: {
      title: "Setup MCP DocuForge in Cursor",
      description: "Configura Cursor per usare gli strumenti MCP DocuForge.",
      steps: ["Aggiungi server HTTP MCP.", "Imposta token Bearer.", "Verifica connessione.", "Usa preview poi render."],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/cursor.md",
    },
    claude: {
      title: "Setup MCP DocuForge in Claude",
      description: "Integra Claude con gli strumenti DocuForge via MCP.",
      steps: ["Registra endpoint MCP.", "Configura auth Bearer.", "Lista template.", "Render preview prima del finale."],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/claude.md",
    },
    codex: {
      title: "Setup MCP DocuForge in Codex",
      description: "Automatizza flussi PDF in Codex con MCP.",
      steps: ["Configura URL MCP e token.", "Valida accesso.", "Recupera template.", "Esegui preview e poi render."],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/codex.md",
    },
  },
  es: {
    overview: {
      title: "Resumen MCP de DocuForge",
      description: "Conecta clientes MCP con DocuForge para templates y render de PDF.",
      steps: [
        "Configura el endpoint MCP con autenticacion Bearer.",
        "Carga credenciales API en el servidor MCP.",
        "Valida con docuforge_get_usage.",
        "Usa preview antes del render final.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/overview.md",
    },
    cursor: {
      title: "Setup MCP DocuForge en Cursor",
      description: "Conecta Cursor a herramientas MCP de DocuForge.",
      steps: ["Agrega servidor MCP HTTP.", "Configura token Bearer.", "Valida conexion.", "Ejecuta preview y luego render."],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/cursor.md",
    },
    claude: {
      title: "Setup MCP DocuForge en Claude",
      description: "Integra Claude con las herramientas DocuForge por MCP.",
      steps: ["Registra endpoint.", "Configura auth.", "Lista templates.", "Usa preview antes de produccion."],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/claude.md",
    },
    codex: {
      title: "Setup MCP DocuForge en Codex",
      description: "Automatiza flujos PDF en Codex con MCP.",
      steps: ["Configura URL y token.", "Valida acceso.", "Carga template.", "Ejecuta preview y render final."],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/codex.md",
    },
  },
  ar: {
    overview: {
      title: "نظرة عامة على MCP في DocuForge",
      description: "اربط عملاء MCP مع DocuForge لادارة القوالب وتوليد PDF.",
      steps: [
        "حدد عنوان MCP مع مصادقة Bearer.",
        "اضف بيانات API داخل خادم MCP.",
        "تحقق عبر docuforge_get_usage.",
        "نفذ preview قبل render النهائي.",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/overview.md",
    },
    cursor: {
      title: "اعداد MCP في Cursor",
      description: "ربط Cursor بادوات DocuForge عبر MCP.",
      steps: ["اضف خادم MCP HTTP.", "اضف Bearer token.", "اختبر الاتصال.", "استخدم preview ثم render."],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/cursor.md",
    },
    claude: {
      title: "اعداد MCP في Claude",
      description: "استخدام Claude مع ادوات DocuForge عبر MCP.",
      steps: ["سجل endpoint.", "اضف المصادقة.", "اعرض القوالب.", "ابدأ ب preview."],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/claude.md",
    },
    codex: {
      title: "اعداد MCP في Codex",
      description: "تشغيل تدفقات PDF في Codex عبر MCP.",
      steps: ["اضبط URL وtoken.", "تحقق من الوصول.", "اجلب القالب.", "نفذ preview ثم render نهائي."],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/codex.md",
    },
  },
  zh: {
    overview: {
      title: "DocuForge MCP 概览",
      description: "将 MCP 客户端连接到 DocuForge，完成模板与 PDF 渲染工作流。",
      steps: [
        "配置 MCP 端点并启用 Bearer 鉴权。",
        "在 MCP 服务端设置 DocuForge API 凭证。",
        "先调用 docuforge_get_usage 验证连接。",
        "先预览渲染，再执行正式渲染。",
      ],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/overview.md",
    },
    cursor: {
      title: "Cursor 中的 DocuForge MCP 配置",
      description: "在 Cursor 中接入 DocuForge MCP 工具。",
      steps: ["添加 HTTP MCP 服务器。", "配置 Bearer Token。", "验证连接。", "先预览后正式渲染。"],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/cursor.md",
    },
    claude: {
      title: "Claude 中的 DocuForge MCP 配置",
      description: "通过 MCP 在 Claude 中调用 DocuForge 能力。",
      steps: ["注册 MCP 端点。", "设置鉴权。", "先读取模板。", "先预览再生产渲染。"],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/claude.md",
    },
    codex: {
      title: "Codex 中的 DocuForge MCP 配置",
      description: "在 Codex 中通过 MCP 自动化 PDF 流程。",
      steps: ["配置 MCP URL 与 Token。", "验证权限。", "获取模板。", "执行预览与正式渲染。"],
      githubDoc: "https://github.com/docuforge/docuforge/blob/main/docs/mcp/codex.md",
    },
  },
};

export function getMcpGuide(locale: Locale, key: keyof McpGuideSet): McpGuide {
  const set = guides[locale] ?? guides.en;
  return set[key];
}
