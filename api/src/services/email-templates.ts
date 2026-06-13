import type { EmailLocale } from './email-locale';
import { env } from '../config/env';

export const otpEmailTemplateIds = ['email_verification', 'login_2fa'] as const;
export type OtpEmailTemplateId = (typeof otpEmailTemplateIds)[number];

export const standardEmailTemplateIds = [
  'welcome_first_message',
  'billing_subscription_started',
  'billing_plan_changed',
  'billing_subscription_canceled',
  'support_acknowledgement',
] as const;
export type StandardEmailTemplateId = (typeof standardEmailTemplateIds)[number];

export const emailTemplateIds = [...otpEmailTemplateIds, ...standardEmailTemplateIds] as const;
export type EmailTemplateId = (typeof emailTemplateIds)[number];

export interface OtpEmailTemplateInput {
  locale: EmailLocale;
  code: string;
  ttlMinutes: number;
}

export interface WelcomeEmailTemplateInput {
  locale: EmailLocale;
  dashboardUrl: string;
}

export interface BillingSubscriptionStartedEmailTemplateInput {
  locale: EmailLocale;
  planName: string;
  manageBillingUrl: string;
}

export interface BillingPlanChangedEmailTemplateInput {
  locale: EmailLocale;
  previousPlanName: string;
  planName: string;
  manageBillingUrl: string;
}

export interface BillingSubscriptionCanceledEmailTemplateInput {
  locale: EmailLocale;
  previousPlanName: string;
  restartBillingUrl: string;
  supportEmail: string;
}

export interface SupportAcknowledgementEmailTemplateInput {
  locale: EmailLocale;
  ticketId: string;
  supportEmail: string;
}

export interface EmailTemplateInputById {
  email_verification: OtpEmailTemplateInput;
  login_2fa: OtpEmailTemplateInput;
  welcome_first_message: WelcomeEmailTemplateInput;
  billing_subscription_started: BillingSubscriptionStartedEmailTemplateInput;
  billing_plan_changed: BillingPlanChangedEmailTemplateInput;
  billing_subscription_canceled: BillingSubscriptionCanceledEmailTemplateInput;
  support_acknowledgement: SupportAcknowledgementEmailTemplateInput;
}

export interface RenderedEmailTemplate {
  subject: string;
  text: string;
  html: string;
}

interface OtpTemplateCopy {
  subject: string;
  title: string;
  intro: string;
  textPrefix: string;
}

interface StandardTemplateCopy {
  subject: string;
  title: string;
  intro: string;
  bodyLines: string[];
  ctaLabel?: string;
  footerLabel: string;
}

interface LocaleCopy {
  brand: string;
  codeLabel: string;
  expiresLabel: string;
  ignoreLabel: string;
  otpFooterLabel: string;
  otpTemplates: Record<OtpEmailTemplateId, OtpTemplateCopy>;
  standardTemplates: Record<StandardEmailTemplateId, StandardTemplateCopy>;
}

const DOCUFORGE_LOGO_URL = 'https://www.docuforge.app/brand/logo-square-64.png';
const DOCUFORGE_LOGO_HERO_URL = 'https://www.docuforge.app/brand/logo-square-256.png';
const DOCUFORGE_SITE_URL = 'https://docuforge.app';

const copyByLocale: Record<EmailLocale, LocaleCopy> = {
  en: {
    brand: 'DocuForge',
    codeLabel: 'Verification code',
    expiresLabel: 'This code expires in {{minutes}} minute(s).',
    ignoreLabel: 'If you did not request this code, you can safely ignore this email.',
    otpFooterLabel: 'Security notification from DocuForge',
    otpTemplates: {
      email_verification: {
        subject: 'Verify your DocuForge email',
        title: 'Email verification',
        intro: 'Use this 6-digit code to verify your DocuForge account.',
        textPrefix: 'Your DocuForge verification code is',
      },
      login_2fa: {
        subject: 'Your DocuForge login verification code',
        title: 'Two-factor authentication',
        intro: 'Use this 6-digit code to complete sign-in to your DocuForge console.',
        textPrefix: 'Your DocuForge login code is',
      },
    },
    standardTemplates: {
      welcome_first_message: {
        subject: 'Welcome to DocuForge — your workspace is ready',
        title: 'Your DocuForge workspace is ready',
        intro: 'Welcome aboard. Your account is active and ready for production document workflows.',
        bodyLines: [
          'You can start with a starter template, generate your first PDF, and connect the API in minutes.',
          'If you need onboarding help, reply to hello@docuforge.app and our team will assist directly.',
        ],
        ctaLabel: 'Open console',
        footerLabel: 'Welcome from the DocuForge team',
      },
      billing_subscription_started: {
        subject: 'Your DocuForge subscription is active',
        title: 'Subscription confirmed',
        intro: 'Your {{plan_name}} plan is now active.',
        bodyLines: [
          'Usage limits and billing controls have been updated in your workspace.',
          'For invoice requests or procurement support, contact billing@docuforge.app.',
        ],
        ctaLabel: 'Manage billing',
        footerLabel: 'Billing update from DocuForge',
      },
      billing_plan_changed: {
        subject: 'Your DocuForge plan was updated',
        title: 'Plan change confirmed',
        intro: 'Your plan changed from {{previous_plan_name}} to {{plan_name}}.',
        bodyLines: [
          'New limits are active now. You can review usage and billing at any time from settings.',
          'Need a custom contract? Reach out at billing@docuforge.app.',
        ],
        ctaLabel: 'Review billing',
        footerLabel: 'Billing update from DocuForge',
      },
      billing_subscription_canceled: {
        subject: 'Your DocuForge subscription was canceled',
        title: 'Subscription canceled',
        intro: 'Your {{previous_plan_name}} subscription has ended and your workspace is now on the Free plan.',
        bodyLines: [
          'Your existing data remains available and you can reactivate paid billing at any time.',
          'If this was unexpected, contact {{support_email}} and we will help immediately.',
        ],
        ctaLabel: 'Review plans',
        footerLabel: 'Billing update from DocuForge',
      },
      support_acknowledgement: {
        subject: 'We received your DocuForge request',
        title: 'Support request received',
        intro: 'Thanks for contacting us. Your request is logged as ticket {{ticket_id}}.',
        bodyLines: [
          'Our team reviews inbound requests in priority order and will follow up from {{support_email}}.',
          'If you have extra logs or screenshots, reply to this email so we can accelerate the fix.',
        ],
        footerLabel: 'DocuForge support acknowledgement',
      },
    },
  },
  fr: {
    brand: 'DocuForge',
    codeLabel: 'Code de verification',
    expiresLabel: 'Ce code expire dans {{minutes}} minute(s).',
    ignoreLabel: 'Si vous n\'avez pas demande ce code, ignorez simplement cet email.',
    otpFooterLabel: 'Notification de securite DocuForge',
    otpTemplates: {
      email_verification: {
        subject: 'Vérifiez votre adresse e-mail DocuForge',
        title: 'Verification de l\'email',
        intro: 'Utilisez ce code a 6 chiffres pour verifier votre compte DocuForge.',
        textPrefix: 'Votre code de verification DocuForge est',
      },
      login_2fa: {
        subject: 'Votre code de connexion à DocuForge',
        title: 'Authentification a deux facteurs',
        intro: 'Utilisez ce code a 6 chiffres pour finaliser la connexion a votre console DocuForge.',
        textPrefix: 'Votre code de connexion DocuForge est',
      },
    },
    standardTemplates: {
      welcome_first_message: {
        subject: 'Bienvenue sur DocuForge — votre espace est prêt',
        title: 'Votre espace DocuForge est pret',
        intro: 'Bienvenue. Votre compte est actif et pret pour vos workflows documentaires.',
        bodyLines: [
          'Demarrez avec un template officiel, lancez votre premier rendu PDF et connectez l\'API.',
          'Pour un accompagnement, repondez a hello@docuforge.app.',
        ],
        ctaLabel: 'Ouvrir la console',
        footerLabel: 'Message de bienvenue DocuForge',
      },
      billing_subscription_started: {
        subject: 'Votre abonnement DocuForge est activé',
        title: 'Abonnement confirme',
        intro: 'Votre plan {{plan_name}} est maintenant actif.',
        bodyLines: [
          'Vos limites et controles de facturation ont ete mis a jour.',
          'Pour les factures et achats, contactez billing@docuforge.app.',
        ],
        ctaLabel: 'Gerer la facturation',
        footerLabel: 'Mise a jour de facturation DocuForge',
      },
      billing_plan_changed: {
        subject: 'Votre plan DocuForge a été mis à jour',
        title: 'Changement de plan confirme',
        intro: 'Votre plan est passe de {{previous_plan_name}} a {{plan_name}}.',
        bodyLines: [
          'Les nouvelles limites sont actives immediatement dans votre espace.',
          'Besoin d\'un contrat enterprise ? billing@docuforge.app.',
        ],
        ctaLabel: 'Voir la facturation',
        footerLabel: 'Mise a jour de facturation DocuForge',
      },
      billing_subscription_canceled: {
        subject: 'Votre abonnement DocuForge a été résilié',
        title: 'Abonnement resilie',
        intro: 'Votre abonnement {{previous_plan_name}} est termine et votre espace repasse au plan Free.',
        bodyLines: [
          'Vos donnees restent disponibles et vous pouvez reactiver un plan payant a tout moment.',
          'Si ce changement est inattendu, contactez {{support_email}}.',
        ],
        ctaLabel: 'Voir les plans',
        footerLabel: 'Mise a jour de facturation DocuForge',
      },
      support_acknowledgement: {
        subject: 'Nous avons bien reçu votre demande DocuForge',
        title: 'Demande de support recue',
        intro: 'Merci de nous avoir contactes. Votre ticket est {{ticket_id}}.',
        bodyLines: [
          'Notre equipe repond depuis {{support_email}} selon la priorite du sujet.',
          'Vous pouvez repondre a cet email avec des logs ou captures supplementaires.',
        ],
        footerLabel: 'Accuse de reception support DocuForge',
      },
    },
  },
  de: {
    brand: 'DocuForge',
    codeLabel: 'Bestaetigungscode',
    expiresLabel: 'Dieser Code laeuft in {{minutes}} Minute(n) ab.',
    ignoreLabel: 'Falls Sie diesen Code nicht angefordert haben, koennen Sie diese E-Mail ignorieren.',
    otpFooterLabel: 'Sicherheitsbenachrichtigung von DocuForge',
    otpTemplates: {
      email_verification: {
        subject: 'Bestätigen Sie Ihre DocuForge-E-Mail-Adresse',
        title: 'E-Mail-Bestaetigung',
        intro: 'Verwenden Sie diesen 6-stelligen Code, um Ihr DocuForge-Konto zu bestaetigen.',
        textPrefix: 'Ihr DocuForge-Bestaetigungscode lautet',
      },
      login_2fa: {
        subject: 'Ihr DocuForge-Anmelde-Bestätigungscode',
        title: 'Zwei-Faktor-Authentifizierung',
        intro: 'Verwenden Sie diesen 6-stelligen Code, um die Anmeldung bei Ihrer DocuForge-Konsole abzuschliessen.',
        textPrefix: 'Ihr DocuForge-Login-Code lautet',
      },
    },
    standardTemplates: {
      welcome_first_message: {
        subject: 'Willkommen bei DocuForge — Ihr Workspace ist bereit',
        title: 'Ihr DocuForge Workspace ist bereit',
        intro: 'Willkommen. Ihr Konto ist aktiv und bereit fuer produktive Dokument-Workflows.',
        bodyLines: [
          'Starten Sie mit einer Vorlage, erzeugen Sie Ihr erstes PDF und verbinden Sie die API.',
          'Bei Fragen antworten Sie direkt an hello@docuforge.app.',
        ],
        ctaLabel: 'Konsole oeffnen',
        footerLabel: 'Willkommensnachricht von DocuForge',
      },
      billing_subscription_started: {
        subject: 'Ihr DocuForge-Abonnement ist jetzt aktiv',
        title: 'Abonnement bestaetigt',
        intro: 'Ihr {{plan_name}} Plan ist jetzt aktiv.',
        bodyLines: [
          'Nutzungsgrenzen und Abrechnungseinstellungen wurden aktualisiert.',
          'Bei Rechnungsfragen: billing@docuforge.app.',
        ],
        ctaLabel: 'Abrechnung verwalten',
        footerLabel: 'Abrechnungsupdate von DocuForge',
      },
      billing_plan_changed: {
        subject: 'Ihr DocuForge-Plan wurde aktualisiert',
        title: 'Planwechsel bestaetigt',
        intro: 'Ihr Plan wurde von {{previous_plan_name}} auf {{plan_name}} geaendert.',
        bodyLines: [
          'Die neuen Limits sind sofort aktiv.',
          'Fuer Enterprise-Konditionen schreiben Sie an billing@docuforge.app.',
        ],
        ctaLabel: 'Abrechnung ansehen',
        footerLabel: 'Abrechnungsupdate von DocuForge',
      },
      billing_subscription_canceled: {
        subject: 'Ihr DocuForge-Abonnement wurde beendet',
        title: 'Abonnement beendet',
        intro: 'Ihr {{previous_plan_name}} Abonnement wurde beendet und Ihr Workspace laeuft jetzt im Free-Plan.',
        bodyLines: [
          'Ihre Daten bleiben erhalten und Sie koennen jederzeit erneut upgraden.',
          'Falls das nicht beabsichtigt war, kontaktieren Sie {{support_email}}.',
        ],
        ctaLabel: 'Plaene ansehen',
        footerLabel: 'Abrechnungsupdate von DocuForge',
      },
      support_acknowledgement: {
        subject: 'Wir haben Ihre DocuForge-Anfrage erhalten',
        title: 'Supportanfrage erhalten',
        intro: 'Danke fuer Ihre Nachricht. Ihr Ticket lautet {{ticket_id}}.',
        bodyLines: [
          'Unser Team antwortet von {{support_email}} in Prioritaetsreihenfolge.',
          'Sie koennen auf diese E-Mail mit weiteren Logs und Screenshots antworten.',
        ],
        footerLabel: 'DocuForge Support-Bestaetigung',
      },
    },
  },
  it: {
    brand: 'DocuForge',
    codeLabel: 'Codice di verifica',
    expiresLabel: 'Questo codice scade tra {{minutes}} minuto(i).',
    ignoreLabel: 'Se non hai richiesto questo codice, puoi ignorare questa email.',
    otpFooterLabel: 'Notifica di sicurezza DocuForge',
    otpTemplates: {
      email_verification: {
        subject: 'Verifica la tua email DocuForge',
        title: 'Verifica email',
        intro: 'Usa questo codice a 6 cifre per verificare il tuo account DocuForge.',
        textPrefix: 'Il tuo codice di verifica DocuForge e',
      },
      login_2fa: {
        subject: 'Il tuo codice di accesso DocuForge',
        title: 'Autenticazione a due fattori',
        intro: 'Usa questo codice a 6 cifre per completare l\'accesso alla console DocuForge.',
        textPrefix: 'Il tuo codice di accesso DocuForge e',
      },
    },
    standardTemplates: {
      welcome_first_message: {
        subject: 'Benvenuto in DocuForge',
        title: 'Il tuo workspace DocuForge e pronto',
        intro: 'Benvenuto. Il tuo account e attivo e pronto per workflow documentali in produzione.',
        bodyLines: [
          'Inizia da un template base, genera il primo PDF e collega l\'API in pochi minuti.',
          'Per supporto onboarding puoi rispondere a hello@docuforge.app.',
        ],
        ctaLabel: 'Apri console',
        footerLabel: 'Messaggio di benvenuto DocuForge',
      },
      billing_subscription_started: {
        subject: 'Il tuo abbonamento DocuForge è attivo',
        title: 'Abbonamento confermato',
        intro: 'Il tuo piano {{plan_name}} e ora attivo.',
        bodyLines: [
          'I limiti di utilizzo e le impostazioni di fatturazione sono stati aggiornati.',
          'Per richieste fiscali o acquisti: billing@docuforge.app.',
        ],
        ctaLabel: 'Gestisci fatturazione',
        footerLabel: 'Aggiornamento fatturazione DocuForge',
      },
      billing_plan_changed: {
        subject: 'Il tuo piano DocuForge è stato aggiornato',
        title: 'Cambio piano confermato',
        intro: 'Il tuo piano e passato da {{previous_plan_name}} a {{plan_name}}.',
        bodyLines: [
          'I nuovi limiti sono attivi immediatamente.',
          'Per contratto enterprise: billing@docuforge.app.',
        ],
        ctaLabel: 'Rivedi fatturazione',
        footerLabel: 'Aggiornamento fatturazione DocuForge',
      },
      billing_subscription_canceled: {
        subject: 'Il tuo abbonamento DocuForge è stato annullato',
        title: 'Abbonamento annullato',
        intro: 'Il tuo abbonamento {{previous_plan_name}} e terminato e il workspace e tornato al piano Free.',
        bodyLines: [
          'I tuoi dati restano disponibili e puoi riattivare un piano premium quando vuoi.',
          'Se non era previsto, contatta {{support_email}}.',
        ],
        ctaLabel: 'Vedi piani',
        footerLabel: 'Aggiornamento fatturazione DocuForge',
      },
      support_acknowledgement: {
        subject: 'Abbiamo ricevuto la tua richiesta DocuForge',
        title: 'Richiesta supporto ricevuta',
        intro: 'Grazie per averci contattato. Il tuo ticket e {{ticket_id}}.',
        bodyLines: [
          'Il team risponde da {{support_email}} in base alla priorita.',
          'Puoi rispondere a questa email con log o screenshot aggiuntivi.',
        ],
        footerLabel: 'Conferma supporto DocuForge',
      },
    },
  },
  es: {
    brand: 'DocuForge',
    codeLabel: 'Codigo de verificacion',
    expiresLabel: 'Este codigo vence en {{minutes}} minuto(s).',
    ignoreLabel: 'Si no solicitaste este codigo, puedes ignorar este correo.',
    otpFooterLabel: 'Notificacion de seguridad de DocuForge',
    otpTemplates: {
      email_verification: {
        subject: 'Verifica tu dirección de correo en DocuForge',
        title: 'Verificacion de email',
        intro: 'Usa este codigo de 6 digitos para verificar tu cuenta de DocuForge.',
        textPrefix: 'Tu codigo de verificacion de DocuForge es',
      },
      login_2fa: {
        subject: 'Tu código de acceso a DocuForge',
        title: 'Autenticacion de dos factores',
        intro: 'Usa este codigo de 6 digitos para completar el inicio de sesion en tu consola de DocuForge.',
        textPrefix: 'Tu codigo de acceso de DocuForge es',
      },
    },
    standardTemplates: {
      welcome_first_message: {
        subject: 'Bienvenido a DocuForge — tu espacio está listo',
        title: 'Tu espacio de DocuForge esta listo',
        intro: 'Bienvenido. Tu cuenta ya esta activa para flujos documentales en produccion.',
        bodyLines: [
          'Empieza con una plantilla base, genera tu primer PDF y conecta la API en minutos.',
          'Si necesitas ayuda de onboarding, responde a hello@docuforge.app.',
        ],
        ctaLabel: 'Abrir consola',
        footerLabel: 'Mensaje de bienvenida de DocuForge',
      },
      billing_subscription_started: {
        subject: 'Tu suscripción de DocuForge está activa',
        title: 'Suscripcion confirmada',
        intro: 'Tu plan {{plan_name}} ya esta activo.',
        bodyLines: [
          'Tus limites y controles de facturacion se actualizaron correctamente.',
          'Para facturas o compras: billing@docuforge.app.',
        ],
        ctaLabel: 'Gestionar facturacion',
        footerLabel: 'Actualizacion de facturacion DocuForge',
      },
      billing_plan_changed: {
        subject: 'Tu plan de DocuForge fue actualizado con éxito',
        title: 'Cambio de plan confirmado',
        intro: 'Tu plan cambio de {{previous_plan_name}} a {{plan_name}}.',
        bodyLines: [
          'Los nuevos limites estan activos de inmediato.',
          'Para contrato enterprise, escribe a billing@docuforge.app.',
        ],
        ctaLabel: 'Revisar facturacion',
        footerLabel: 'Actualizacion de facturacion DocuForge',
      },
      billing_subscription_canceled: {
        subject: 'Tu suscripción de DocuForge fue cancelada',
        title: 'Suscripcion cancelada',
        intro: 'Tu suscripcion {{previous_plan_name}} finalizo y tu espacio ahora esta en el plan Free.',
        bodyLines: [
          'Tus datos siguen disponibles y puedes reactivar un plan pago cuando quieras.',
          'Si fue inesperado, contacta a {{support_email}}.',
        ],
        ctaLabel: 'Ver planes',
        footerLabel: 'Actualizacion de facturacion DocuForge',
      },
      support_acknowledgement: {
        subject: 'Recibimos tu solicitud en DocuForge',
        title: 'Solicitud de soporte recibida',
        intro: 'Gracias por escribirnos. Tu ticket es {{ticket_id}}.',
        bodyLines: [
          'Nuestro equipo responde desde {{support_email}} por prioridad.',
          'Puedes responder a este email con logs o capturas adicionales.',
        ],
        footerLabel: 'Confirmacion de soporte DocuForge',
      },
    },
  },
  ar: {
    brand: 'DocuForge',
    codeLabel: 'رمز التحقق',
    expiresLabel: 'تنتهي صلاحية هذا الرمز خلال {{minutes}} دقيقة.',
    ignoreLabel: 'إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.',
    otpFooterLabel: 'إشعار أمني من DocuForge',
    otpTemplates: {
      email_verification: {
        subject: 'تحقق من بريدك في DocuForge',
        title: 'تأكيد البريد الإلكتروني',
        intro: 'استخدم هذا الرمز المكوّن من 6 أرقام لتأكيد حسابك في DocuForge.',
        textPrefix: 'رمز التحقق الخاص بك في DocuForge هو',
      },
      login_2fa: {
        subject: 'رمز تسجيل الدخول في DocuForge',
        title: 'المصادقة الثنائية',
        intro: 'استخدم هذا الرمز المكوّن من 6 أرقام لإكمال تسجيل الدخول إلى لوحة DocuForge.',
        textPrefix: 'رمز تسجيل الدخول الخاص بك في DocuForge هو',
      },
    },
    standardTemplates: {
      welcome_first_message: {
        subject: 'مرحبًا بك في DocuForge',
        title: 'مساحة DocuForge الخاصة بك جاهزة',
        intro: 'مرحبًا بك. حسابك مفعّل وجاهز لبدء سير عمل المستندات.',
        bodyLines: [
          'ابدأ بقالب جاهز، وأنشئ أول PDF، ثم اربط واجهة API خلال دقائق.',
          'إذا كنت تحتاج مساعدة في الإعداد، راسلنا على hello@docuforge.app.',
        ],
        ctaLabel: 'افتح اللوحة',
        footerLabel: 'رسالة ترحيب من فريق DocuForge',
      },
      billing_subscription_started: {
        subject: 'اشتراكك في DocuForge أصبح نشطًا',
        title: 'تم تأكيد الاشتراك',
        intro: 'خطة {{plan_name}} أصبحت نشطة الآن.',
        bodyLines: [
          'تم تحديث حدود الاستخدام وإعدادات الفوترة في حسابك.',
          'لأي استفسار مالي أو فواتير تواصل مع billing@docuforge.app.',
        ],
        ctaLabel: 'إدارة الفوترة',
        footerLabel: 'تحديث فوترة من DocuForge',
      },
      billing_plan_changed: {
        subject: 'تم تحديث خطة DocuForge الخاصة بك',
        title: 'تم تأكيد تغيير الخطة',
        intro: 'تم تغيير خطتك من {{previous_plan_name}} إلى {{plan_name}}.',
        bodyLines: [
          'الحدود الجديدة أصبحت فعالة الآن.',
          'للعقود المخصصة تواصل عبر billing@docuforge.app.',
        ],
        ctaLabel: 'مراجعة الفوترة',
        footerLabel: 'تحديث فوترة من DocuForge',
      },
      billing_subscription_canceled: {
        subject: 'تم إلغاء اشتراكك في DocuForge',
        title: 'تم إلغاء الاشتراك',
        intro: 'انتهى اشتراك {{previous_plan_name}} وتم تحويل حسابك إلى خطة Free.',
        bodyLines: [
          'تبقى بياناتك متاحة ويمكنك إعادة التفعيل في أي وقت.',
          'إذا كان هذا غير متوقع، تواصل معنا عبر {{support_email}}.',
        ],
        ctaLabel: 'عرض الخطط',
        footerLabel: 'تحديث فوترة من DocuForge',
      },
      support_acknowledgement: {
        subject: 'استلمنا طلبك في DocuForge',
        title: 'تم استلام طلب الدعم',
        intro: 'شكرًا لتواصلك معنا. رقم التذكرة هو {{ticket_id}}.',
        bodyLines: [
          'سيقوم فريقنا بالرد من {{support_email}} حسب أولوية الطلب.',
          'يمكنك الرد على هذه الرسالة وإضافة السجلات أو لقطات الشاشة.',
        ],
        footerLabel: 'تأكيد استلام من دعم DocuForge',
      },
    },
  },
  zh: {
    brand: 'DocuForge',
    codeLabel: '验证码',
    expiresLabel: '该验证码将在 {{minutes}} 分钟后失效。',
    ignoreLabel: '如果这不是你的请求，请忽略此邮件。',
    otpFooterLabel: 'DocuForge 安全通知',
    otpTemplates: {
      email_verification: {
        subject: '验证你的 DocuForge 邮箱',
        title: '邮箱验证',
        intro: '请使用这个 6 位验证码完成 DocuForge 账号验证。',
        textPrefix: '你的 DocuForge 验证码是',
      },
      login_2fa: {
        subject: '你的 DocuForge 登录验证码',
        title: '两步验证',
        intro: '请使用这个 6 位验证码完成 DocuForge 控制台登录。',
        textPrefix: '你的 DocuForge 登录验证码是',
      },
    },
    standardTemplates: {
      welcome_first_message: {
        subject: '欢迎使用 DocuForge',
        title: '你的 DocuForge 工作区已就绪',
        intro: '欢迎加入。你的账号已激活，可立即开始文档工作流。',
        bodyLines: [
          '你可以从模板开始，生成第一份 PDF，并快速接入 API。',
          '如果需要上手帮助，请回复 hello@docuforge.app。',
        ],
        ctaLabel: '打开控制台',
        footerLabel: '来自 DocuForge 团队的欢迎邮件',
      },
      billing_subscription_started: {
        subject: '你的 DocuForge 订阅已生效',
        title: '订阅已确认',
        intro: '你的 {{plan_name}} 计划现已生效。',
        bodyLines: [
          '你的用量限制和计费设置已同步更新。',
          '如需账单或采购支持，请联系 billing@docuforge.app。',
        ],
        ctaLabel: '管理计费',
        footerLabel: 'DocuForge 计费通知',
      },
      billing_plan_changed: {
        subject: '你的 DocuForge 计划已更新',
        title: '计划变更已确认',
        intro: '你的计划已从 {{previous_plan_name}} 调整为 {{plan_name}}。',
        bodyLines: [
          '新额度已立即生效，可在设置中查看。',
          '如需定制合同，请联系 billing@docuforge.app。',
        ],
        ctaLabel: '查看计费',
        footerLabel: 'DocuForge 计费通知',
      },
      billing_subscription_canceled: {
        subject: '你的 DocuForge 订阅已取消',
        title: '订阅已取消',
        intro: '你的 {{previous_plan_name}} 订阅已结束，当前账号已切换为 Free 计划。',
        bodyLines: [
          '你的数据仍可访问，后续可随时重新开通付费计划。',
          '如果这不是你的预期，请联系 {{support_email}}。',
        ],
        ctaLabel: '查看计划',
        footerLabel: 'DocuForge 计费通知',
      },
      support_acknowledgement: {
        subject: '我们已收到你的 DocuForge 请求',
        title: '支持请求已收到',
        intro: '感谢联系。你的工单编号是 {{ticket_id}}。',
        bodyLines: [
          '我们的支持团队将通过 {{support_email}} 按优先级回复。',
          '你可以直接回复本邮件补充日志或截图。',
        ],
        footerLabel: 'DocuForge 支持确认',
      },
    },
  },
};

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function assertUrl(value: string, label: string): void {
  assertNonEmpty(value, label);
  try {
    const parsed = new URL(value);
    if (!parsed.protocol || !parsed.host) {
      throw new Error('invalid');
    }
  } catch {
    throw new Error(`${label} must be an absolute URL`);
  }
}

function assertOtpInput(input: OtpEmailTemplateInput): void {
  if (!/^\d{6}$/.test(input.code)) {
    throw new Error('OTP email template requires a 6-digit code');
  }
  if (!Number.isFinite(input.ttlMinutes) || input.ttlMinutes <= 0) {
    throw new Error('OTP email template requires ttlMinutes > 0');
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function interpolate(template: string, tokens: Record<string, string | number>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, token: string) => {
    if (!(token in tokens)) {
      throw new Error(`Missing template token: ${token}`);
    }
    return String(tokens[token]);
  });
}

function interpolateLines(lines: string[], tokens: Record<string, string | number>): string[] {
  return lines.map((line) => interpolate(line, tokens));
}

function renderLogoHeader(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">
  <tr><td align="center">
    <a href="${DOCUFORGE_SITE_URL}" style="text-decoration:none;">
      <img src="${DOCUFORGE_LOGO_HERO_URL}" alt="DocuForge" height="40" style="display:block;height:40px;max-height:40px;border:0;outline:none;" />
    </a>
  </td></tr>
</table>`;
}

function renderBrandHeader(brand: string, align: 'left' | 'right'): string {
  const imagePadding = align === 'right' ? '0 0 0 10px' : '0 10px 0 0';
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 10px 0;">
  <tr>
    <td style="vertical-align:middle;padding:${imagePadding};">
      <img src="${DOCUFORGE_LOGO_URL}" alt="${escapeHtml(brand)} logo" width="28" height="28" style="display:block;border-radius:7px;outline:none;border:0;" />
    </td>
    <td style="vertical-align:middle;">
      <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(248,250,252,0.68);font-weight:600;text-align:${align};">${escapeHtml(brand)}</p>
    </td>
  </tr>
</table>`;
}

// Wire renderLegalFooter() into the email shells once KAN-37/38/39 merge.
export function renderLegalFooter(): string {
  const termsUrl = escapeHtml(env.LEGAL_TERMS_URL);
  const privacyUrl = escapeHtml(env.LEGAL_PRIVACY_URL);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 16px 0;">
  <tr><td align="center" style="font-size: 12px; color: #666;">
    <a href="${termsUrl}" style="color: #666; text-decoration: underline; margin: 0 8px;">Terms of Service</a>
    ·
    <a href="${privacyUrl}" style="color: #666; text-decoration: underline; margin: 0 8px;">Privacy Policy</a>
  </td></tr>
</table>`;
}

function renderOtpHtml(
  locale: EmailLocale,
  title: string,
  intro: string,
  codeLabel: string,
  code: string,
  expiresLabel: string,
  ignoreLabel: string,
  footerLabel: string,
  brand: string
): string {
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const align: 'left' | 'right' = locale === 'ar' ? 'right' : 'left';
  const escapedCode = escapeHtml(code);

  return `<!doctype html>
<html lang="${locale}" dir="${direction}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#05070d;color:#f8fafc;font-family:'Exo','Segoe UI','Noto Sans',Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#05070d;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">
            <tr><td>${renderLogoHeader()}</td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border:1px solid rgba(248,250,252,0.16);border-radius:20px;background:#0f1117;box-shadow:0 24px 70px rgba(0,0,0,0.45);overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 10px 28px;text-align:${align};">
                ${renderBrandHeader(brand, align)}
                <h1 style="margin:0;font-size:22px;line-height:1.2;font-weight:700;color:#ffffff;">${escapeHtml(title)}</h1>
                <p style="margin:12px 0 0 0;font-size:14px;line-height:1.65;color:rgba(248,250,252,0.86);">${escapeHtml(intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 28px 24px 28px;text-align:${align};">
                <p style="margin:0 0 8px 0;font-size:12px;color:rgba(248,250,252,0.72);">${escapeHtml(codeLabel)}</p>
                <p style="margin:0;display:inline-block;padding:12px 16px;border-radius:12px;background:#1f2937;border:1px solid #3b82f6;color:#ffffff;font-size:28px;letter-spacing:0.18em;font-family:'IBM Plex Mono','SFMono-Regular',Consolas,monospace;">${escapedCode}</p>
                <p style="margin:16px 0 0 0;font-size:13px;line-height:1.5;color:rgba(248,250,252,0.84);">${escapeHtml(expiresLabel)}</p>
                <p style="margin:8px 0 0 0;font-size:12px;line-height:1.5;color:rgba(248,250,252,0.64);">${escapeHtml(ignoreLabel)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 20px 28px;border-top:1px solid rgba(248,250,252,0.12);text-align:${align};">
                <p style="margin:0;font-size:11px;line-height:1.5;color:rgba(248,250,252,0.58);">${escapeHtml(footerLabel)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderStandardHtml(
  locale: EmailLocale,
  title: string,
  intro: string,
  bodyLines: string[],
  ctaLabel: string | undefined,
  ctaUrl: string | undefined,
  footerLabel: string,
  brand: string
): string {
  const direction = locale === 'ar' ? 'rtl' : 'ltr';
  const align: 'left' | 'right' = locale === 'ar' ? 'right' : 'left';
  const ctaBlock = ctaLabel && ctaUrl
    ? `<p style="margin:20px 0 0 0;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#2563eb;border:1px solid #1d4ed8;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 14px;border-radius:10px;">${escapeHtml(ctaLabel)}</a></p>`
    : '';

  const bodyHtml = bodyLines
    .map(
      (line) =>
        `<p style="margin:10px 0 0 0;font-size:14px;line-height:1.65;color:rgba(248,250,252,0.84);">${escapeHtml(line)}</p>`
    )
    .join('');

  return `<!doctype html>
<html lang="${locale}" dir="${direction}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#05070d;color:#f8fafc;font-family:'Exo','Segoe UI','Noto Sans',Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#05070d;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;">
            <tr><td>${renderLogoHeader()}</td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;border:1px solid rgba(248,250,252,0.16);border-radius:20px;background:#0f1117;box-shadow:0 24px 70px rgba(0,0,0,0.45);overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 20px 28px;text-align:${align};">
                ${renderBrandHeader(brand, align)}
                <h1 style="margin:0;font-size:22px;line-height:1.2;font-weight:700;color:#ffffff;">${escapeHtml(title)}</h1>
                <p style="margin:12px 0 0 0;font-size:14px;line-height:1.65;color:rgba(248,250,252,0.86);">${escapeHtml(intro)}</p>
                ${bodyHtml}
                ${ctaBlock}
              </td>
            </tr>
            <tr>
              <td style="padding:12px 28px 20px 28px;border-top:1px solid rgba(248,250,252,0.12);text-align:${align};">
                <p style="margin:0;font-size:11px;line-height:1.5;color:rgba(248,250,252,0.58);">${escapeHtml(footerLabel)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderOtpTemplate(templateId: OtpEmailTemplateId, input: OtpEmailTemplateInput): RenderedEmailTemplate {
  assertOtpInput(input);

  const localeCopy = copyByLocale[input.locale] ?? copyByLocale.en;
  const templateCopy = localeCopy.otpTemplates[templateId];
  const expiresLine = interpolate(localeCopy.expiresLabel, { minutes: input.ttlMinutes });
  const text = `${templateCopy.textPrefix} ${input.code}. ${expiresLine}`;
  const html = renderOtpHtml(
    input.locale,
    templateCopy.title,
    templateCopy.intro,
    localeCopy.codeLabel,
    input.code,
    expiresLine,
    localeCopy.ignoreLabel,
    localeCopy.otpFooterLabel,
    localeCopy.brand
  );

  return {
    subject: templateCopy.subject,
    text,
    html,
  };
}

function renderStandardTemplate(
  templateId: StandardEmailTemplateId,
  locale: EmailLocale,
  tokens: Record<string, string | number>,
  ctaUrl?: string
): RenderedEmailTemplate {
  const localeCopy = copyByLocale[locale] ?? copyByLocale.en;
  const templateCopy = localeCopy.standardTemplates[templateId];

  const subject = interpolate(templateCopy.subject, tokens);
  const title = interpolate(templateCopy.title, tokens);
  const intro = interpolate(templateCopy.intro, tokens);
  const bodyLines = interpolateLines(templateCopy.bodyLines, tokens);
  const footerLabel = interpolate(templateCopy.footerLabel, tokens);

  if (templateCopy.ctaLabel && !ctaUrl) {
    throw new Error(`${templateId} requires a CTA URL`);
  }

  const textLines = [intro, ...bodyLines];
  if (templateCopy.ctaLabel && ctaUrl) {
    textLines.push(`${templateCopy.ctaLabel}: ${ctaUrl}`);
  }
  textLines.push(footerLabel);

  const text = textLines.join('\n\n');
  const html = renderStandardHtml(
    locale,
    title,
    intro,
    bodyLines,
    templateCopy.ctaLabel,
    ctaUrl,
    footerLabel,
    localeCopy.brand
  );

  return {
    subject,
    text,
    html,
  };
}

function renderWelcomeTemplate(input: WelcomeEmailTemplateInput): RenderedEmailTemplate {
  assertUrl(input.dashboardUrl, 'dashboardUrl');
  return renderStandardTemplate('welcome_first_message', input.locale, {}, input.dashboardUrl);
}

function renderBillingSubscriptionStartedTemplate(
  input: BillingSubscriptionStartedEmailTemplateInput
): RenderedEmailTemplate {
  assertNonEmpty(input.planName, 'planName');
  assertUrl(input.manageBillingUrl, 'manageBillingUrl');
  return renderStandardTemplate(
    'billing_subscription_started',
    input.locale,
    { plan_name: input.planName },
    input.manageBillingUrl
  );
}

function renderBillingPlanChangedTemplate(input: BillingPlanChangedEmailTemplateInput): RenderedEmailTemplate {
  assertNonEmpty(input.previousPlanName, 'previousPlanName');
  assertNonEmpty(input.planName, 'planName');
  assertUrl(input.manageBillingUrl, 'manageBillingUrl');
  return renderStandardTemplate(
    'billing_plan_changed',
    input.locale,
    {
      previous_plan_name: input.previousPlanName,
      plan_name: input.planName,
    },
    input.manageBillingUrl
  );
}

function renderBillingSubscriptionCanceledTemplate(
  input: BillingSubscriptionCanceledEmailTemplateInput
): RenderedEmailTemplate {
  assertNonEmpty(input.previousPlanName, 'previousPlanName');
  assertNonEmpty(input.supportEmail, 'supportEmail');
  assertUrl(input.restartBillingUrl, 'restartBillingUrl');
  return renderStandardTemplate(
    'billing_subscription_canceled',
    input.locale,
    {
      previous_plan_name: input.previousPlanName,
      support_email: input.supportEmail,
    },
    input.restartBillingUrl
  );
}

function renderSupportAcknowledgementTemplate(
  input: SupportAcknowledgementEmailTemplateInput
): RenderedEmailTemplate {
  assertNonEmpty(input.ticketId, 'ticketId');
  assertNonEmpty(input.supportEmail, 'supportEmail');
  return renderStandardTemplate('support_acknowledgement', input.locale, {
    ticket_id: input.ticketId,
    support_email: input.supportEmail,
  });
}

const renderers: {
  [K in EmailTemplateId]: (input: EmailTemplateInputById[K]) => RenderedEmailTemplate;
} = {
  email_verification: (input) => renderOtpTemplate('email_verification', input),
  login_2fa: (input) => renderOtpTemplate('login_2fa', input),
  welcome_first_message: renderWelcomeTemplate,
  billing_subscription_started: renderBillingSubscriptionStartedTemplate,
  billing_plan_changed: renderBillingPlanChangedTemplate,
  billing_subscription_canceled: renderBillingSubscriptionCanceledTemplate,
  support_acknowledgement: renderSupportAcknowledgementTemplate,
};

export function renderEmailTemplate<K extends EmailTemplateId>(
  templateId: K,
  input: EmailTemplateInputById[K]
): RenderedEmailTemplate {
  return renderers[templateId](input);
}

export function renderOtpEmailTemplate(
  templateId: OtpEmailTemplateId,
  input: OtpEmailTemplateInput
): RenderedEmailTemplate {
  return renderEmailTemplate(templateId, input);
}
