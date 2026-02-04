import type { Locale } from "@/src/lib/i18n-config";

export type DocsContent = {
  label: string;
  title: string;
  subtitle: string;
  navLabel: string;
  nav: Array<{ id: string; label: string }>;
  baseUrlsTitle: string;
  baseUrlsDev: string;
  baseUrlsProd: string;
  overview: {
    title: string;
    body: string;
    cards: Array<{ title: string; body: string }>;
  };
  auth: {
    title: string;
    body: string;
    noteToken: string;
    noteKeys: string;
  };
  quickStart: {
    title: string;
    body: string;
  };
  render: {
    title: string;
    body: string;
    endpoints: Array<{ endpoint: string; description: string }>;
  };
  templates: {
    title: string;
    body: string;
    endpoints: Array<{ endpoint: string; description: string }>;
  };
  assets: {
    title: string;
    body: string;
    endpoints: Array<{ endpoint: string; description: string }>;
  };
  ai: {
    title: string;
    body: string;
    endpoints: Array<{ endpoint: string; description: string }>;
  };
  usage: {
    title: string;
    body: string;
    endpoints: Array<{ endpoint: string; description: string }>;
  };
  errors: {
    title: string;
    body: string;
    codes: Array<{ title: string; body: string }>;
  };
  cta: {
    title: string;
    body: string;
    primary: string;
    secondary: string;
  };
};

const baseNav = [
  { id: "overview", label: "Overview" },
  { id: "auth", label: "Authentication" },
  { id: "quick-start", label: "Quick start" },
  { id: "render", label: "Rendering" },
  { id: "templates", label: "Templates" },
  { id: "assets", label: "Assets" },
  { id: "ai", label: "AI" },
  { id: "usage", label: "Usage and billing" },
  { id: "errors", label: "Errors" },
];

const docsContent: Record<Locale, DocsContent> = {
  en: {
    label: "API Documentation",
    title: "Build PDF workflows with a predictable API.",
    subtitle:
      "This is the source of truth for DocuForge endpoints, authentication, and error handling. Everything is designed to stay close to the console so your mental model remains consistent.",
    navLabel: "On this page",
    nav: baseNav,
    baseUrlsTitle: "Base URLs",
    baseUrlsDev: "Dev: http://localhost:3000",
    baseUrlsProd: "Prod: https://api.docuforge.dev",
    overview: {
      title: "Overview",
      body:
        "DocuForge exposes a REST API for authentication, template management, rendering, assets, billing, and AI-assisted edits. All authenticated endpoints require a JWT in the Authorization header.",
      cards: [
        {
          title: "Environment aware",
          body: "Use local URLs in development and swap to production in deploys.",
        },
        {
          title: "Typed responses",
          body: "Every endpoint returns a stable schema and a consistent error object.",
        },
      ],
    },
    auth: {
      title: "Authentication",
      body:
        "Register or log in to receive a JWT. Include the token in the Authorization header for all protected endpoints.",
      noteToken:
        "Store tokens securely. The console keeps the JWT in localStorage and redirects to /login when a 401 response is returned.",
      noteKeys:
        "Production renders use API keys instead: send the key via the X-API-Key header when calling /v1/render.",
    },
    quickStart: {
      title: "Quick start",
      body:
        "Render a preview PDF from template source and JSON data. This endpoint returns a PDF blob and an X-Render-Duration header.",
    },
    render: {
      title: "Rendering",
      body:
        "Preview renders are designed for fast feedback while you edit templates. The console debounces renders by default and cancels in-flight requests with an AbortController.",
      endpoints: [
        {
          endpoint: "POST /v1/render/preview",
          description:
            "Render a PDF from source, files, and data with JWT auth. Returns a PDF blob.",
        },
        {
          endpoint: "POST /v1/render",
          description:
            "Render a published template with X-API-Key auth. Returns a PDF blob.",
        },
      ],
    },
    templates: {
      title: "Templates",
      body:
        "Templates are versioned. The live version is the default for renders, while drafts stay local until published.",
      endpoints: [
        { endpoint: "GET /v1/templates", description: "List templates" },
        { endpoint: "GET /v1/templates/:id", description: "Fetch template detail" },
        {
          endpoint: "GET /v1/templates/:id/versions/:versionId",
          description: "Fetch version source",
        },
        { endpoint: "POST /v1/templates", description: "Create a new template" },
        { endpoint: "POST /v1/templates/:id/publish", description: "Publish a version" },
        { endpoint: "PATCH /v1/templates/:id", description: "Update template metadata" },
        { endpoint: "POST /v1/templates/:id/fork", description: "Fork official template" },
        { endpoint: "DELETE /v1/templates/:id", description: "Delete a template" },
      ],
    },
    assets: {
      title: "Assets",
      body:
        "Assets let you upload images, fonts, or data files and reference them inside templates.",
      endpoints: [
        {
          endpoint: "POST /v1/assets/upload",
          description: "Upload a file and receive a signed URL.",
        },
        {
          endpoint: "GET /v1/assets",
          description: "List uploaded assets for the current user.",
        },
        {
          endpoint: "DELETE /v1/assets/:id",
          description: "Remove an asset from storage.",
        },
      ],
    },
    ai: {
      title: "AI",
      body: "Use AI to generate or modify Typst templates. AI credits are limited by plan.",
      endpoints: [
        {
          endpoint: "POST /v1/ai/generate",
          description: "Generate Typst code from a prompt or reference.",
        },
        {
          endpoint: "POST /v1/ai/edit",
          description: "Modify an existing template with instructions.",
        },
      ],
    },
    usage: {
      title: "Usage and billing",
      body:
        "Usage limits are enforced monthly. The billing API creates a Stripe checkout session for upgrades.",
      endpoints: [
        {
          endpoint: "GET /v1/usage",
          description: "Return monthly render usage and limits.",
        },
        {
          endpoint: "POST /v1/billing/checkout",
          description: "Create a Stripe checkout session.",
        },
      ],
    },
    errors: {
      title: "Errors",
      body:
        "The API returns JSON errors with a stable shape. Use the error code to map UI states.",
      codes: [
        {
          title: "401 unauthorized",
          body: "Missing or expired JWT. The console will redirect to /login.",
        },
        {
          title: "402 payment_required",
          body: "Plan limit reached. Prompt the user to upgrade.",
        },
        {
          title: "429 rate_limited",
          body: "Back off and retry after the provided delay.",
        },
        {
          title: "500 internal_error",
          body: "Unexpected issue. Retry or report to support.",
        },
      ],
    },
    cta: {
      title: "Ready to build?",
      body: "Open the console to start shipping PDFs, or jump back to the landing page to review the platform.",
      primary: "Open console",
      secondary: "Back to landing",
    },
  },
  fr: {
    label: "Documentation API",
    title: "Créez des workflows PDF avec une API prévisible.",
    subtitle:
      "Référence officielle des endpoints DocuForge, de l’authentification et des erreurs. Tout reste aligné avec la console pour garder un modèle mental simple.",
    navLabel: "Sur cette page",
    nav: [
      { id: "overview", label: "Vue d’ensemble" },
      { id: "auth", label: "Authentification" },
      { id: "quick-start", label: "Démarrage rapide" },
      { id: "render", label: "Rendu" },
      { id: "templates", label: "Modèles" },
      { id: "assets", label: "Assets" },
      { id: "ai", label: "IA" },
      { id: "usage", label: "Usage et facturation" },
      { id: "errors", label: "Erreurs" },
    ],
    baseUrlsTitle: "URLs de base",
    baseUrlsDev: "Dev : http://localhost:3000",
    baseUrlsProd: "Prod : https://api.docuforge.dev",
    overview: {
      title: "Vue d’ensemble",
      body:
        "DocuForge expose une API REST pour l’authentification, la gestion des modèles, le rendu, les assets, la facturation et les éditions assistées par IA. Tous les endpoints protégés exigent un JWT dans l’en‑tête Authorization.",
      cards: [
        {
          title: "Contexte d’environnement",
          body: "Utilisez les URLs locales en dev et basculez en production au déploiement.",
        },
        {
          title: "Réponses typées",
          body: "Chaque endpoint renvoie un schéma stable et un objet d’erreur cohérent.",
        },
      ],
    },
    auth: {
      title: "Authentification",
      body:
        "Inscrivez‑vous ou connectez‑vous pour obtenir un JWT. Incluez ce token dans l’en‑tête Authorization pour tous les endpoints protégés.",
      noteToken:
        "Stockez les tokens en sécurité. La console conserve le JWT dans localStorage et redirige vers /login lors d’un 401.",
      noteKeys:
        "Les rendus en production utilisent des clés API : envoyez la clé via l’en‑tête X-API-Key pour /v1/render.",
    },
    quickStart: {
      title: "Démarrage rapide",
      body:
        "Rendez un PDF de prévisualisation à partir du source et de données JSON. L’endpoint renvoie un blob PDF et l’en‑tête X-Render-Duration.",
    },
    render: {
      title: "Rendu",
      body:
        "Les rendus de prévisualisation sont optimisés pour le feedback rapide. La console débounce les rendus et annule les requêtes en cours via AbortController.",
      endpoints: [
        {
          endpoint: "POST /v1/render/preview",
          description:
            "Rend un PDF à partir du source, des fichiers et des données avec JWT. Renvoie un blob PDF.",
        },
        {
          endpoint: "POST /v1/render",
          description:
            "Rend un template publié avec une clé X-API-Key. Renvoie un blob PDF.",
        },
      ],
    },
    templates: {
      title: "Modèles",
      body:
        "Les modèles sont versionnés. La version live est utilisée pour les rendus, les brouillons restent locaux jusqu’à publication.",
      endpoints: [
        { endpoint: "GET /v1/templates", description: "Lister les modèles" },
        { endpoint: "GET /v1/templates/:id", description: "Détails d’un modèle" },
        {
          endpoint: "GET /v1/templates/:id/versions/:versionId",
          description: "Récupérer le source d’une version",
        },
        { endpoint: "POST /v1/templates", description: "Créer un modèle" },
        { endpoint: "POST /v1/templates/:id/publish", description: "Publier une version" },
        { endpoint: "PATCH /v1/templates/:id", description: "Mettre à jour les métadonnées" },
        { endpoint: "POST /v1/templates/:id/fork", description: "Forker un modèle officiel" },
        { endpoint: "DELETE /v1/templates/:id", description: "Supprimer un modèle" },
      ],
    },
    assets: {
      title: "Assets",
      body:
        "Les assets permettent d’uploader images, polices ou fichiers de données et de les référencer dans les templates.",
      endpoints: [
        {
          endpoint: "POST /v1/assets/upload",
          description: "Uploader un fichier et recevoir une URL signée.",
        },
        {
          endpoint: "GET /v1/assets",
          description: "Lister les assets de l’utilisateur courant.",
        },
        {
          endpoint: "DELETE /v1/assets/:id",
          description: "Supprimer un asset du stockage.",
        },
      ],
    },
    ai: {
      title: "IA",
      body:
        "Utilisez l’IA pour générer ou modifier des templates Typst. Les crédits IA sont limités par plan.",
      endpoints: [
        {
          endpoint: "POST /v1/ai/generate",
          description: "Générer du code Typst à partir d’un prompt ou d’une référence.",
        },
        {
          endpoint: "POST /v1/ai/edit",
          description: "Modifier un template existant via des instructions.",
        },
      ],
    },
    usage: {
      title: "Usage et facturation",
      body:
        "Les limites d’usage sont mensuelles. L’API billing crée une session Stripe pour les upgrades.",
      endpoints: [
        {
          endpoint: "GET /v1/usage",
          description: "Retourne l’usage mensuel et les limites.",
        },
        {
          endpoint: "POST /v1/billing/checkout",
          description: "Crée une session Stripe de paiement.",
        },
      ],
    },
    errors: {
      title: "Erreurs",
      body:
        "L’API renvoie des erreurs JSON au format stable. Utilisez le code d’erreur pour mapper l’UI.",
      codes: [
        {
          title: "401 unauthorized",
          body: "JWT manquant ou expiré. La console redirige vers /login.",
        },
        {
          title: "402 payment_required",
          body: "Limite du plan atteinte. Proposez une mise à niveau.",
        },
        {
          title: "429 rate_limited",
          body: "Ralentir et réessayer après le délai indiqué.",
        },
        {
          title: "500 internal_error",
          body: "Erreur inattendue. Réessayez ou contactez le support.",
        },
      ],
    },
    cta: {
      title: "Prêt à construire ?",
      body:
        "Ouvrez la console pour livrer vos PDFs, ou revenez sur la page d’accueil pour revoir la plateforme.",
      primary: "Ouvrir la console",
      secondary: "Retour à l’accueil",
    },
  },
  de: {
    label: "API-Dokumentation",
    title: "Baue PDF-Workflows mit einer vorhersehbaren API.",
    subtitle:
      "Die Referenz für DocuForge-Endpunkte, Authentifizierung und Fehlerbehandlung. Alles bleibt nahe an der Konsole, damit dein mentales Modell konsistent bleibt.",
    navLabel: "Auf dieser Seite",
    nav: [
      { id: "overview", label: "Überblick" },
      { id: "auth", label: "Authentifizierung" },
      { id: "quick-start", label: "Schnellstart" },
      { id: "render", label: "Rendering" },
      { id: "templates", label: "Vorlagen" },
      { id: "assets", label: "Assets" },
      { id: "ai", label: "KI" },
      { id: "usage", label: "Nutzung & Abrechnung" },
      { id: "errors", label: "Fehler" },
    ],
    baseUrlsTitle: "Basis-URLs",
    baseUrlsDev: "Dev: http://localhost:3000",
    baseUrlsProd: "Prod: https://api.docuforge.dev",
    overview: {
      title: "Überblick",
      body:
        "DocuForge stellt eine REST-API für Authentifizierung, Vorlagenverwaltung, Rendering, Assets, Abrechnung und KI-gestützte Änderungen bereit. Alle geschützten Endpunkte benötigen ein JWT im Authorization-Header.",
      cards: [
        {
          title: "Umgebungsbewusst",
          body: "Nutze lokale URLs in der Entwicklung und wechsle bei Deploys auf Produktion.",
        },
        {
          title: "Typisierte Antworten",
          body: "Jeder Endpunkt liefert ein stabiles Schema und ein konsistentes Fehlerobjekt.",
        },
      ],
    },
    auth: {
      title: "Authentifizierung",
      body:
        "Registriere dich oder melde dich an, um ein JWT zu erhalten. Sende das Token im Authorization-Header für alle geschützten Endpunkte.",
      noteToken:
        "Tokens sicher speichern. Die Konsole legt das JWT in localStorage ab und leitet bei 401 zu /login um.",
      noteKeys:
        "Produktive Renderings nutzen API-Keys: sende den Key im X-API-Key-Header an /v1/render.",
    },
    quickStart: {
      title: "Schnellstart",
      body:
        "Erzeuge eine Preview-PDF aus Template-Source und JSON-Daten. Der Endpunkt liefert ein PDF-Blob und den Header X-Render-Duration.",
    },
    render: {
      title: "Rendering",
      body:
        "Preview-Renderings sind für schnelles Feedback optimiert. Die Konsole debounct Renderings und bricht laufende Requests per AbortController ab.",
      endpoints: [
        {
          endpoint: "POST /v1/render/preview",
          description:
            "Rendert ein PDF aus Source, Dateien und Daten mit JWT. Gibt ein PDF-Blob zurück.",
        },
        {
          endpoint: "POST /v1/render",
          description:
            "Rendert ein veröffentlichtes Template mit X-API-Key. Gibt ein PDF-Blob zurück.",
        },
      ],
    },
    templates: {
      title: "Vorlagen",
      body:
        "Vorlagen sind versioniert. Die Live-Version wird gerendert, Entwürfe bleiben lokal bis zur Veröffentlichung.",
      endpoints: [
        { endpoint: "GET /v1/templates", description: "Vorlagen auflisten" },
        { endpoint: "GET /v1/templates/:id", description: "Vorlagendetails abrufen" },
        {
          endpoint: "GET /v1/templates/:id/versions/:versionId",
          description: "Versions-Source abrufen",
        },
        { endpoint: "POST /v1/templates", description: "Neue Vorlage erstellen" },
        { endpoint: "POST /v1/templates/:id/publish", description: "Version veröffentlichen" },
        { endpoint: "PATCH /v1/templates/:id", description: "Metadaten aktualisieren" },
        { endpoint: "POST /v1/templates/:id/fork", description: "Offizielle Vorlage forken" },
        { endpoint: "DELETE /v1/templates/:id", description: "Vorlage löschen" },
      ],
    },
    assets: {
      title: "Assets",
      body:
        "Assets erlauben das Hochladen von Bildern, Fonts oder Daten und deren Nutzung in Templates.",
      endpoints: [
        {
          endpoint: "POST /v1/assets/upload",
          description: "Datei hochladen und signierte URL erhalten.",
        },
        {
          endpoint: "GET /v1/assets",
          description: "Assets des aktuellen Nutzers auflisten.",
        },
        {
          endpoint: "DELETE /v1/assets/:id",
          description: "Asset aus dem Speicher entfernen.",
        },
      ],
    },
    ai: {
      title: "KI",
      body:
        "Nutze KI, um Typst-Templates zu generieren oder zu ändern. KI-Credits sind abhängig vom Plan.",
      endpoints: [
        {
          endpoint: "POST /v1/ai/generate",
          description: "Typst-Code aus Prompt oder Referenz erzeugen.",
        },
        {
          endpoint: "POST /v1/ai/edit",
          description: "Ein bestehendes Template per Anweisung ändern.",
        },
      ],
    },
    usage: {
      title: "Nutzung & Abrechnung",
      body:
        "Nutzungslimits gelten monatlich. Die Billing-API erstellt eine Stripe-Checkout-Session für Upgrades.",
      endpoints: [
        {
          endpoint: "GET /v1/usage",
          description: "Monatliche Nutzung und Limits zurückgeben.",
        },
        {
          endpoint: "POST /v1/billing/checkout",
          description: "Stripe-Checkout-Session erstellen.",
        },
      ],
    },
    errors: {
      title: "Fehler",
      body:
        "Die API liefert JSON-Fehler mit stabilem Format. Nutze den Fehlercode zur UI-Zuordnung.",
      codes: [
        {
          title: "401 unauthorized",
          body: "JWT fehlt oder ist abgelaufen. Die Konsole leitet zu /login um.",
        },
        {
          title: "402 payment_required",
          body: "Planlimit erreicht. Upgrade vorschlagen.",
        },
        {
          title: "429 rate_limited",
          body: "Zurückoffen und nach der angegebenen Verzögerung erneut versuchen.",
        },
        {
          title: "500 internal_error",
          body: "Unerwarteter Fehler. Erneut versuchen oder Support kontaktieren.",
        },
      ],
    },
    cta: {
      title: "Bereit zu starten?",
      body:
        "Öffne die Konsole, um PDFs zu shippen, oder gehe zurück zur Landing Page.",
      primary: "Konsole öffnen",
      secondary: "Zur Landing Page",
    },
  },
  it: {
    label: "Documentazione API",
    title: "Crea workflow PDF con un’API prevedibile.",
    subtitle:
      "La fonte ufficiale per endpoint DocuForge, autenticazione ed errori. Tutto resta coerente con la console per un modello mentale semplice.",
    navLabel: "In questa pagina",
    nav: [
      { id: "overview", label: "Panoramica" },
      { id: "auth", label: "Autenticazione" },
      { id: "quick-start", label: "Avvio rapido" },
      { id: "render", label: "Rendering" },
      { id: "templates", label: "Template" },
      { id: "assets", label: "Asset" },
      { id: "ai", label: "IA" },
      { id: "usage", label: "Utilizzo e fatturazione" },
      { id: "errors", label: "Errori" },
    ],
    baseUrlsTitle: "URL base",
    baseUrlsDev: "Dev: http://localhost:3000",
    baseUrlsProd: "Prod: https://api.docuforge.dev",
    overview: {
      title: "Panoramica",
      body:
        "DocuForge espone una REST API per autenticazione, gestione template, rendering, asset, billing e modifiche assistite da IA. Gli endpoint protetti richiedono un JWT nell’header Authorization.",
      cards: [
        {
          title: "Ambiente consapevole",
          body: "Usa URL locali in sviluppo e passa alla produzione in deploy.",
        },
        {
          title: "Risposte tipizzate",
          body: "Ogni endpoint restituisce uno schema stabile e un oggetto errore coerente.",
        },
      ],
    },
    auth: {
      title: "Autenticazione",
      body:
        "Registrati o accedi per ottenere un JWT. Includi il token nell’header Authorization per tutti gli endpoint protetti.",
      noteToken:
        "Conserva i token in modo sicuro. La console salva il JWT in localStorage e reindirizza a /login quando riceve un 401.",
      noteKeys:
        "I render in produzione usano le API key: invia la chiave nell’header X-API-Key verso /v1/render.",
    },
    quickStart: {
      title: "Avvio rapido",
      body:
        "Esegui un render di anteprima da source e dati JSON. L’endpoint restituisce un blob PDF e l’header X-Render-Duration.",
    },
    render: {
      title: "Rendering",
      body:
        "I render di anteprima sono pensati per feedback rapido. La console applica debounce e annulla le richieste in corso con AbortController.",
      endpoints: [
        {
          endpoint: "POST /v1/render/preview",
          description:
            "Renderizza un PDF da source, file e dati con JWT. Restituisce un blob PDF.",
        },
        {
          endpoint: "POST /v1/render",
          description:
            "Renderizza un template pubblicato con X-API-Key. Restituisce un blob PDF.",
        },
      ],
    },
    templates: {
      title: "Template",
      body:
        "I template sono versionati. La versione live è usata per i render, le bozze restano locali fino alla pubblicazione.",
      endpoints: [
        { endpoint: "GET /v1/templates", description: "Elenca i template" },
        { endpoint: "GET /v1/templates/:id", description: "Dettagli del template" },
        {
          endpoint: "GET /v1/templates/:id/versions/:versionId",
          description: "Recupera la source della versione",
        },
        { endpoint: "POST /v1/templates", description: "Crea un template" },
        { endpoint: "POST /v1/templates/:id/publish", description: "Pubblica una versione" },
        { endpoint: "PATCH /v1/templates/:id", description: "Aggiorna i metadati" },
        { endpoint: "POST /v1/templates/:id/fork", description: "Forka un template ufficiale" },
        { endpoint: "DELETE /v1/templates/:id", description: "Elimina un template" },
      ],
    },
    assets: {
      title: "Asset",
      body:
        "Gli asset permettono di caricare immagini, font o file dati e usarli nei template.",
      endpoints: [
        {
          endpoint: "POST /v1/assets/upload",
          description: "Carica un file e ricevi un URL firmato.",
        },
        {
          endpoint: "GET /v1/assets",
          description: "Elenca gli asset dell’utente corrente.",
        },
        {
          endpoint: "DELETE /v1/assets/:id",
          description: "Rimuovi un asset dallo storage.",
        },
      ],
    },
    ai: {
      title: "IA",
      body:
        "Usa l’IA per generare o modificare template Typst. I crediti IA sono limitati dal piano.",
      endpoints: [
        {
          endpoint: "POST /v1/ai/generate",
          description: "Genera codice Typst da un prompt o riferimento.",
        },
        {
          endpoint: "POST /v1/ai/edit",
          description: "Modifica un template esistente tramite istruzioni.",
        },
      ],
    },
    usage: {
      title: "Utilizzo e fatturazione",
      body:
        "I limiti di utilizzo sono mensili. L’API billing crea una sessione di checkout Stripe per gli upgrade.",
      endpoints: [
        {
          endpoint: "GET /v1/usage",
          description: "Restituisce utilizzo mensile e limiti.",
        },
        {
          endpoint: "POST /v1/billing/checkout",
          description: "Crea una sessione di checkout Stripe.",
        },
      ],
    },
    errors: {
      title: "Errori",
      body:
        "L’API restituisce errori JSON con formato stabile. Usa il codice errore per lo stato UI.",
      codes: [
        {
          title: "401 unauthorized",
          body: "JWT mancante o scaduto. La console reindirizza a /login.",
        },
        {
          title: "402 payment_required",
          body: "Limite del piano raggiunto. Suggerisci un upgrade.",
        },
        {
          title: "429 rate_limited",
          body: "Attendi e riprova dopo il delay indicato.",
        },
        {
          title: "500 internal_error",
          body: "Errore imprevisto. Riprova o contatta il supporto.",
        },
      ],
    },
    cta: {
      title: "Pronto a costruire?",
      body:
        "Apri la console per pubblicare PDF, oppure torna alla landing per rivedere la piattaforma.",
      primary: "Apri console",
      secondary: "Torna alla landing",
    },
  },
  es: {
    label: "Documentación API",
    title: "Crea flujos PDF con una API predecible.",
    subtitle:
      "La referencia oficial de endpoints DocuForge, autenticación y errores. Todo está alineado con la consola para mantener un modelo mental claro.",
    navLabel: "En esta página",
    nav: [
      { id: "overview", label: "Resumen" },
      { id: "auth", label: "Autenticación" },
      { id: "quick-start", label: "Inicio rápido" },
      { id: "render", label: "Renderizado" },
      { id: "templates", label: "Plantillas" },
      { id: "assets", label: "Assets" },
      { id: "ai", label: "IA" },
      { id: "usage", label: "Uso y facturación" },
      { id: "errors", label: "Errores" },
    ],
    baseUrlsTitle: "URLs base",
    baseUrlsDev: "Dev: http://localhost:3000",
    baseUrlsProd: "Prod: https://api.docuforge.dev",
    overview: {
      title: "Resumen",
      body:
        "DocuForge expone una API REST para autenticación, gestión de plantillas, renderizado, assets, facturación y ediciones con IA. Los endpoints protegidos requieren un JWT en el header Authorization.",
      cards: [
        {
          title: "Consciente del entorno",
          body: "Usa URLs locales en desarrollo y cambia a producción en los despliegues.",
        },
        {
          title: "Respuestas tipadas",
          body: "Cada endpoint devuelve un esquema estable y un objeto de error consistente.",
        },
      ],
    },
    auth: {
      title: "Autenticación",
      body:
        "Regístrate o inicia sesión para recibir un JWT. Incluye el token en el header Authorization para todos los endpoints protegidos.",
      noteToken:
        "Guarda los tokens de forma segura. La consola guarda el JWT en localStorage y redirige a /login cuando recibe un 401.",
      noteKeys:
        "Los renders en producción usan API keys: envía la clave en el header X-API-Key a /v1/render.",
    },
    quickStart: {
      title: "Inicio rápido",
      body:
        "Renderiza un PDF de vista previa desde el source y datos JSON. El endpoint devuelve un blob PDF y el header X-Render-Duration.",
    },
    render: {
      title: "Renderizado",
      body:
        "Los renders de vista previa están optimizados para feedback rápido. La consola aplica debounce y cancela solicitudes en curso con AbortController.",
      endpoints: [
        {
          endpoint: "POST /v1/render/preview",
          description:
            "Renderiza un PDF desde source, archivos y datos con JWT. Devuelve un blob PDF.",
        },
        {
          endpoint: "POST /v1/render",
          description:
            "Renderiza una plantilla publicada con X-API-Key. Devuelve un blob PDF.",
        },
      ],
    },
    templates: {
      title: "Plantillas",
      body:
        "Las plantillas son versionadas. La versión live se usa para renderizar, los borradores quedan locales hasta publicarse.",
      endpoints: [
        { endpoint: "GET /v1/templates", description: "Listar plantillas" },
        { endpoint: "GET /v1/templates/:id", description: "Detalle de plantilla" },
        {
          endpoint: "GET /v1/templates/:id/versions/:versionId",
          description: "Obtener el source de una versión",
        },
        { endpoint: "POST /v1/templates", description: "Crear una plantilla" },
        { endpoint: "POST /v1/templates/:id/publish", description: "Publicar una versión" },
        { endpoint: "PATCH /v1/templates/:id", description: "Actualizar metadatos" },
        { endpoint: "POST /v1/templates/:id/fork", description: "Hacer fork de una plantilla oficial" },
        { endpoint: "DELETE /v1/templates/:id", description: "Eliminar una plantilla" },
      ],
    },
    assets: {
      title: "Assets",
      body:
        "Los assets te permiten subir imágenes, fuentes o archivos de datos y referenciarlos en plantillas.",
      endpoints: [
        {
          endpoint: "POST /v1/assets/upload",
          description: "Subir un archivo y recibir una URL firmada.",
        },
        {
          endpoint: "GET /v1/assets",
          description: "Listar assets del usuario actual.",
        },
        {
          endpoint: "DELETE /v1/assets/:id",
          description: "Eliminar un asset del almacenamiento.",
        },
      ],
    },
    ai: {
      title: "IA",
      body:
        "Usa IA para generar o modificar plantillas Typst. Los créditos de IA dependen del plan.",
      endpoints: [
        {
          endpoint: "POST /v1/ai/generate",
          description: "Generar código Typst desde un prompt o referencia.",
        },
        {
          endpoint: "POST /v1/ai/edit",
          description: "Modificar una plantilla existente con instrucciones.",
        },
      ],
    },
    usage: {
      title: "Uso y facturación",
      body:
        "Los límites de uso son mensuales. La API de billing crea una sesión de checkout de Stripe para upgrades.",
      endpoints: [
        {
          endpoint: "GET /v1/usage",
          description: "Devuelve el uso mensual y límites.",
        },
        {
          endpoint: "POST /v1/billing/checkout",
          description: "Crear una sesión de checkout Stripe.",
        },
      ],
    },
    errors: {
      title: "Errores",
      body:
        "La API devuelve errores JSON con un formato estable. Usa el código de error para estados de UI.",
      codes: [
        {
          title: "401 unauthorized",
          body: "JWT ausente o expirado. La consola redirige a /login.",
        },
        {
          title: "402 payment_required",
          body: "Límite del plan alcanzado. Sugiere una actualización.",
        },
        {
          title: "429 rate_limited",
          body: "Reduce el ritmo y reintenta tras el delay indicado.",
        },
        {
          title: "500 internal_error",
          body: "Error inesperado. Reintenta o contacta soporte.",
        },
      ],
    },
    cta: {
      title: "¿Listo para construir?",
      body:
        "Abre la consola para empezar a enviar PDFs o vuelve a la landing para revisar la plataforma.",
      primary: "Abrir consola",
      secondary: "Volver a la landing",
    },
  },
  ar: {
    label: "توثيق واجهة البرمجة",
    title: "ابنِ تدفقات PDF عبر واجهة برمجية موثوقة.",
    subtitle:
      "المرجع الأساسي لنقاط النهاية في DocuForge والمصادقة ومعالجة الأخطاء. كل شيء مصمم ليبقى قريباً من الكونسول لتبقى الرؤية واضحة.",
    navLabel: "في هذه الصفحة",
    nav: [
      { id: "overview", label: "نظرة عامة" },
      { id: "auth", label: "المصادقة" },
      { id: "quick-start", label: "بدء سريع" },
      { id: "render", label: "الرندر" },
      { id: "templates", label: "القوالب" },
      { id: "assets", label: "الأصول" },
      { id: "ai", label: "الذكاء الاصطناعي" },
      { id: "usage", label: "الاستخدام والفوترة" },
      { id: "errors", label: "الأخطاء" },
    ],
    baseUrlsTitle: "عناوين الأساس",
    baseUrlsDev: "Dev: http://localhost:3000",
    baseUrlsProd: "Prod: https://api.docuforge.dev",
    overview: {
      title: "نظرة عامة",
      body:
        "توفّر DocuForge واجهة REST للمصادقة وإدارة القوالب والرندر والأصول والفوترة وتعديلات الذكاء الاصطناعي. جميع نقاط النهاية المحمية تتطلب JWT ضمن ترويسة Authorization.",
      cards: [
        {
          title: "وعي بالبيئة",
          body: "استخدم عناوين محلية في التطوير وانتقل للإنتاج عند النشر.",
        },
        {
          title: "استجابات مُهيكلة",
          body: "كل نقطة نهاية تُرجع مخططاً ثابتاً وكائناً متسقاً للأخطاء.",
        },
      ],
    },
    auth: {
      title: "المصادقة",
      body:
        "سجّل أو سجّل الدخول للحصول على JWT. أرسل التوكن في ترويسة Authorization لجميع النقاط المحمية.",
      noteToken:
        "احفظ التوكنات بأمان. الكونسول يخزن JWT في localStorage ويعيد التوجيه إلى /login عند ظهور 401.",
      noteKeys:
        "الرندر في الإنتاج يعتمد مفاتيح API: أرسل المفتاح في ترويسة X-API-Key عند /v1/render.",
    },
    quickStart: {
      title: "بدء سريع",
      body:
        "نفّذ رندراً تجريبياً من المصدر وبيانات JSON. تُرجع هذه النقطة Blob PDF وترويسة X-Render-Duration.",
    },
    render: {
      title: "الرندر",
      body:
        "الرندر التجريبي مخصص لتغذية راجعة سريعة. الكونسول يطبق debounce ويلغي الطلبات الجارية عبر AbortController.",
      endpoints: [
        {
          endpoint: "POST /v1/render/preview",
          description:
            "ينشئ PDF من المصدر والملفات والبيانات باستخدام JWT. يعيد Blob PDF.",
        },
        {
          endpoint: "POST /v1/render",
          description:
            "ينشئ PDF لقالب منشور باستخدام X-API-Key. يعيد Blob PDF.",
        },
      ],
    },
    templates: {
      title: "القوالب",
      body:
        "القوالب مُصدَّرة بإصدارات. الإصدار المباشر يُستخدم للرندر، والمسودات تبقى محلية حتى النشر.",
      endpoints: [
        { endpoint: "GET /v1/templates", description: "قائمة القوالب" },
        { endpoint: "GET /v1/templates/:id", description: "تفاصيل القالب" },
        {
          endpoint: "GET /v1/templates/:id/versions/:versionId",
          description: "جلب مصدر الإصدار",
        },
        { endpoint: "POST /v1/templates", description: "إنشاء قالب" },
        { endpoint: "POST /v1/templates/:id/publish", description: "نشر إصدار" },
        { endpoint: "PATCH /v1/templates/:id", description: "تحديث البيانات الوصفية" },
        { endpoint: "POST /v1/templates/:id/fork", description: "نسخ قالب رسمي" },
        { endpoint: "DELETE /v1/templates/:id", description: "حذف قالب" },
      ],
    },
    assets: {
      title: "الأصول",
      body:
        "الأصول تتيح رفع الصور والخطوط أو ملفات البيانات واستخدامها داخل القوالب.",
      endpoints: [
        {
          endpoint: "POST /v1/assets/upload",
          description: "رفع ملف والحصول على رابط موقّع.",
        },
        {
          endpoint: "GET /v1/assets",
          description: "عرض أصول المستخدم الحالي.",
        },
        {
          endpoint: "DELETE /v1/assets/:id",
          description: "حذف أصل من التخزين.",
        },
      ],
    },
    ai: {
      title: "الذكاء الاصطناعي",
      body:
        "استخدم الذكاء الاصطناعي لإنشاء أو تعديل قوالب Typst. أرصدة الذكاء محدودة حسب الخطة.",
      endpoints: [
        {
          endpoint: "POST /v1/ai/generate",
          description: "توليد كود Typst من وصف أو مرجع.",
        },
        {
          endpoint: "POST /v1/ai/edit",
          description: "تعديل قالب موجود عبر تعليمات.",
        },
      ],
    },
    usage: {
      title: "الاستخدام والفوترة",
      body:
        "حدود الاستخدام شهرية. واجهة الفوترة تنشئ جلسة Stripe للترقية.",
      endpoints: [
        {
          endpoint: "GET /v1/usage",
          description: "إرجاع الاستخدام الشهري والحدود.",
        },
        {
          endpoint: "POST /v1/billing/checkout",
          description: "إنشاء جلسة Stripe للدفع.",
        },
      ],
    },
    errors: {
      title: "الأخطاء",
      body:
        "تُرجع الواجهة أخطاء JSON بصيغة ثابتة. استخدم رمز الخطأ لتحديد حالة الواجهة.",
      codes: [
        {
          title: "401 unauthorized",
          body: "JWT مفقود أو منتهي. الكونسول يعيد التوجيه إلى /login.",
        },
        {
          title: "402 payment_required",
          body: "تم الوصول إلى حد الخطة. اطلب الترقية.",
        },
        {
          title: "429 rate_limited",
          body: "خفّض السرعة وأعد المحاولة بعد التأخير المحدد.",
        },
        {
          title: "500 internal_error",
          body: "خطأ غير متوقع. أعد المحاولة أو تواصل مع الدعم.",
        },
      ],
    },
    cta: {
      title: "جاهز للبناء؟",
      body:
        "افتح الكونسول لبدء إرسال ملفات PDF، أو عد إلى صفحة الهبوط لمراجعة المنصة.",
      primary: "فتح الكونسول",
      secondary: "العودة للهبوط",
    },
  },
  zh: {
    label: "API 文档",
    title: "用可预测的 API 构建 PDF 工作流。",
    subtitle:
      "这是 DocuForge 端点、认证与错误处理的权威参考。所有设计与控制台保持一致，让你的心智模型始终清晰。",
    navLabel: "本页内容",
    nav: [
      { id: "overview", label: "概览" },
      { id: "auth", label: "认证" },
      { id: "quick-start", label: "快速开始" },
      { id: "render", label: "渲染" },
      { id: "templates", label: "模板" },
      { id: "assets", label: "资源" },
      { id: "ai", label: "AI" },
      { id: "usage", label: "用量与计费" },
      { id: "errors", label: "错误" },
    ],
    baseUrlsTitle: "基础 URL",
    baseUrlsDev: "Dev: http://localhost:3000",
    baseUrlsProd: "Prod: https://api.docuforge.dev",
    overview: {
      title: "概览",
      body:
        "DocuForge 提供用于认证、模板管理、渲染、资源、计费与 AI 编辑的 REST API。所有受保护的端点都需要在 Authorization 头中携带 JWT。",
      cards: [
        {
          title: "环境感知",
          body: "开发使用本地 URL，部署时切换到生产地址。",
        },
        {
          title: "类型化响应",
          body: "每个端点返回稳定的结构和一致的错误对象。",
        },
      ],
    },
    auth: {
      title: "认证",
      body:
        "注册或登录以获取 JWT。所有受保护端点都需在 Authorization 头中携带该 token。",
      noteToken:
        "请安全保存 token。控制台将 JWT 存在 localStorage 中，并在 401 时重定向到 /login。",
      noteKeys:
        "生产渲染使用 API Key：调用 /v1/render 时通过 X-API-Key 头发送。",
    },
    quickStart: {
      title: "快速开始",
      body:
        "通过模板源码和 JSON 数据渲染预览 PDF。该端点返回 PDF blob 和 X-Render-Duration 头。",
    },
    render: {
      title: "渲染",
      body:
        "预览渲染用于快速反馈。控制台默认会 debounce 渲染，并用 AbortController 取消进行中的请求。",
      endpoints: [
        {
          endpoint: "POST /v1/render/preview",
          description: "使用 JWT 从源码、文件和数据渲染 PDF，返回 PDF blob。",
        },
        {
          endpoint: "POST /v1/render",
          description: "使用 X-API-Key 渲染已发布模板，返回 PDF blob。",
        },
      ],
    },
    templates: {
      title: "模板",
      body:
        "模板是版本化的。渲染默认使用 live 版本，草稿在发布前保持本地。",
      endpoints: [
        { endpoint: "GET /v1/templates", description: "列出模板" },
        { endpoint: "GET /v1/templates/:id", description: "获取模板详情" },
        {
          endpoint: "GET /v1/templates/:id/versions/:versionId",
          description: "获取版本源码",
        },
        { endpoint: "POST /v1/templates", description: "创建新模板" },
        { endpoint: "POST /v1/templates/:id/publish", description: "发布版本" },
        { endpoint: "PATCH /v1/templates/:id", description: "更新模板元数据" },
        { endpoint: "POST /v1/templates/:id/fork", description: "Fork 官方模板" },
        { endpoint: "DELETE /v1/templates/:id", description: "删除模板" },
      ],
    },
    assets: {
      title: "资源",
      body:
        "资源用于上传图片、字体或数据文件，并在模板中引用。",
      endpoints: [
        {
          endpoint: "POST /v1/assets/upload",
          description: "上传文件并获取签名 URL。",
        },
        {
          endpoint: "GET /v1/assets",
          description: "列出当前用户的资源。",
        },
        {
          endpoint: "DELETE /v1/assets/:id",
          description: "从存储中移除资源。",
        },
      ],
    },
    ai: {
      title: "AI",
      body: "使用 AI 生成或修改 Typst 模板。AI 额度由套餐决定。",
      endpoints: [
        {
          endpoint: "POST /v1/ai/generate",
          description: "根据提示或参考生成 Typst 代码。",
        },
        {
          endpoint: "POST /v1/ai/edit",
          description: "根据指令修改现有模板。",
        },
      ],
    },
    usage: {
      title: "用量与计费",
      body: "用量按月统计。计费 API 会创建 Stripe Checkout 会话用于升级。",
      endpoints: [
        {
          endpoint: "GET /v1/usage",
          description: "返回当月渲染用量与限额。",
        },
        {
          endpoint: "POST /v1/billing/checkout",
          description: "创建 Stripe Checkout 会话。",
        },
      ],
    },
    errors: {
      title: "错误",
      body: "API 返回稳定结构的 JSON 错误。使用错误码映射 UI 状态。",
      codes: [
        {
          title: "401 unauthorized",
          body: "JWT 缺失或已过期。控制台会重定向到 /login。",
        },
        {
          title: "402 payment_required",
          body: "达到套餐上限。提示用户升级。",
        },
        {
          title: "429 rate_limited",
          body: "降低请求频率并在延迟后重试。",
        },
        {
          title: "500 internal_error",
          body: "意外错误。重试或联系支持。",
        },
      ],
    },
    cta: {
      title: "准备开始了吗？",
      body: "打开控制台开始交付 PDF，或返回落地页了解平台。",
      primary: "打开控制台",
      secondary: "返回落地页",
    },
  },
};

export function getDocsContent(locale: Locale) {
  return docsContent[locale] ?? docsContent.en;
}
