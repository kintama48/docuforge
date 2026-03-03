import type { Locale } from "@/src/lib/i18n-config";

export type SecurityAndMcpCopy = {
  securityTitle: string;
  securitySubtitle: string;
  mcpTitle: string;
  mcpSubtitle: string;
  mcpQuickStartTitle: string;
  mcpEndpointLabel: string;
  mcpAuthLabel: string;
  mcpHeaderLabel: string;
  mcpToolsTitle: string;
  mcpLinksTitle: string;
  mcpOverviewLabel: string;
  mcpCursorLabel: string;
  mcpClaudeLabel: string;
  mcpCodexLabel: string;
};

const copyByLocale: Record<Locale, SecurityAndMcpCopy> = {
  en: {
    securityTitle: "Security and Governance",
    securitySubtitle:
      "DocuForge ships with practical defaults for authentication, request safety, and webhook integrity.",
    mcpTitle: "MCP Integration",
    mcpSubtitle:
      "Connect DocuForge to MCP-enabled clients to generate PDFs through tool calls and structured workflows.",
    mcpQuickStartTitle: "MCP quick start",
    mcpEndpointLabel: "Endpoint",
    mcpAuthLabel: "Auth",
    mcpHeaderLabel: "Header",
    mcpToolsTitle: "Core MCP tools",
    mcpLinksTitle: "Detailed setup guides",
    mcpOverviewLabel: "MCP overview",
    mcpCursorLabel: "Cursor setup",
    mcpClaudeLabel: "Claude setup",
    mcpCodexLabel: "Codex setup",
  },
  fr: {
    securityTitle: "Sécurité et gouvernance",
    securitySubtitle:
      "DocuForge fournit des bases solides pour l'authentification, la sécurité des requêtes et l'intégrité des webhooks.",
    mcpTitle: "Intégration MCP",
    mcpSubtitle:
      "Connectez DocuForge aux clients compatibles MCP pour générer des PDF via des appels d'outils structurés.",
    mcpQuickStartTitle: "Démarrage rapide MCP",
    mcpEndpointLabel: "Endpoint",
    mcpAuthLabel: "Auth",
    mcpHeaderLabel: "Header",
    mcpToolsTitle: "Outils MCP principaux",
    mcpLinksTitle: "Guides de configuration",
    mcpOverviewLabel: "Vue d'ensemble MCP",
    mcpCursorLabel: "Configuration Cursor",
    mcpClaudeLabel: "Configuration Claude",
    mcpCodexLabel: "Configuration Codex",
  },
  de: {
    securityTitle: "Sicherheit und Governance",
    securitySubtitle:
      "DocuForge liefert praxistaugliche Standards fur Authentifizierung, Request-Sicherheit und Webhook-Integritat.",
    mcpTitle: "MCP-Integration",
    mcpSubtitle:
      "Verbinde DocuForge mit MCP-Clients, um PDFs uber Tool-Calls und strukturierte Workflows zu erzeugen.",
    mcpQuickStartTitle: "MCP Schnellstart",
    mcpEndpointLabel: "Endpoint",
    mcpAuthLabel: "Auth",
    mcpHeaderLabel: "Header",
    mcpToolsTitle: "Zentrale MCP-Tools",
    mcpLinksTitle: "Setup-Guides",
    mcpOverviewLabel: "MCP-Uberblick",
    mcpCursorLabel: "Cursor Setup",
    mcpClaudeLabel: "Claude Setup",
    mcpCodexLabel: "Codex Setup",
  },
  it: {
    securityTitle: "Sicurezza e governance",
    securitySubtitle:
      "DocuForge offre impostazioni pratiche per autenticazione, sicurezza delle richieste e integrita webhook.",
    mcpTitle: "Integrazione MCP",
    mcpSubtitle:
      "Collega DocuForge ai client MCP per generare PDF tramite tool call e workflow strutturati.",
    mcpQuickStartTitle: "Avvio rapido MCP",
    mcpEndpointLabel: "Endpoint",
    mcpAuthLabel: "Auth",
    mcpHeaderLabel: "Header",
    mcpToolsTitle: "Strumenti MCP principali",
    mcpLinksTitle: "Guide di configurazione",
    mcpOverviewLabel: "Panoramica MCP",
    mcpCursorLabel: "Setup Cursor",
    mcpClaudeLabel: "Setup Claude",
    mcpCodexLabel: "Setup Codex",
  },
  es: {
    securityTitle: "Seguridad y gobernanza",
    securitySubtitle:
      "DocuForge incluye bases practicas para autenticacion, seguridad de requests e integridad de webhooks.",
    mcpTitle: "Integracion MCP",
    mcpSubtitle:
      "Conecta DocuForge a clientes compatibles con MCP para generar PDFs con tool calls y flujos estructurados.",
    mcpQuickStartTitle: "Inicio rapido MCP",
    mcpEndpointLabel: "Endpoint",
    mcpAuthLabel: "Auth",
    mcpHeaderLabel: "Header",
    mcpToolsTitle: "Herramientas MCP principales",
    mcpLinksTitle: "Guias de configuracion",
    mcpOverviewLabel: "Resumen MCP",
    mcpCursorLabel: "Setup en Cursor",
    mcpClaudeLabel: "Setup en Claude",
    mcpCodexLabel: "Setup en Codex",
  },
  ar: {
    securityTitle: "الامان والحوكمة",
    securitySubtitle:
      "يوفر DocuForge اساسا عمليا للمصادقة وسلامة الطلبات وتكامل الويب هوك.",
    mcpTitle: "تكامل MCP",
    mcpSubtitle:
      "اربط DocuForge مع العملاء الداعمين لـ MCP لتوليد PDF عبر استدعاءات ادوات مهيكلة.",
    mcpQuickStartTitle: "بداية سريعة لـ MCP",
    mcpEndpointLabel: "Endpoint",
    mcpAuthLabel: "Auth",
    mcpHeaderLabel: "Header",
    mcpToolsTitle: "ادوات MCP الاساسية",
    mcpLinksTitle: "ادلة الاعداد",
    mcpOverviewLabel: "نظرة عامة MCP",
    mcpCursorLabel: "اعداد Cursor",
    mcpClaudeLabel: "اعداد Claude",
    mcpCodexLabel: "اعداد Codex",
  },
  zh: {
    securityTitle: "安全与治理",
    securitySubtitle: "DocuForge 提供认证、请求安全与 webhook 完整性的实用默认能力。",
    mcpTitle: "MCP 集成",
    mcpSubtitle: "将 DocuForge 接入支持 MCP 的客户端，通过工具调用生成 PDF。",
    mcpQuickStartTitle: "MCP 快速开始",
    mcpEndpointLabel: "Endpoint",
    mcpAuthLabel: "Auth",
    mcpHeaderLabel: "Header",
    mcpToolsTitle: "核心 MCP 工具",
    mcpLinksTitle: "详细配置指南",
    mcpOverviewLabel: "MCP 概览",
    mcpCursorLabel: "Cursor 配置",
    mcpClaudeLabel: "Claude 配置",
    mcpCodexLabel: "Codex 配置",
  },
};

const securityCapabilities = [
  "Customer documents stay protected in transit and at rest, so teams can clear security reviews without custom hardening work.",
  "Password-protected delivery is built in for regulated workflows, keeping finance and legal PDFs safe to share.",
  "Credentials are protected by default, reducing leak risk and shrinking breach blast radius.",
  "JWT and API-key auth paths are isolated by endpoint intent.",
  "Stripe webhook signatures are verified before billing events are processed.",
  "Outbound webhooks are signed with HMAC SHA-256 and retried with backoff.",
  "Webhook URL creation enforces HTTPS in production.",
  "Plan-aware rate limiting protects render, preview, and AI endpoints.",
  "Validation middleware enforces request schemas with predictable error payloads.",
  "Auth, billing, usage, and render mutation routes are explicitly non-cacheable.",
  "MCP server access requires bearer token auth and optional allowed-origin checks.",
];

const mcpTools = [
  "docuforge_get_usage",
  "docuforge_list_templates",
  "docuforge_get_template",
  "docuforge_render_pdf",
  "docuforge_render_preview_pdf",
];

export function getSecurityAndMcpCopy(locale: Locale): SecurityAndMcpCopy {
  return copyByLocale[locale] ?? copyByLocale.en;
}

export function getSecurityCapabilities(): string[] {
  return securityCapabilities;
}

export function getMcpTools(): string[] {
  return mcpTools;
}

export function getMcpLinks() {
  return {
    overview: "/docs/mcp",
    cursor: "/docs/mcp/cursor",
    claude: "/docs/mcp/claude",
    codex: "/docs/mcp/codex",
  };
}
