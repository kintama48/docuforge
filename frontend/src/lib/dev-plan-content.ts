import type { Locale } from "@/src/lib/i18n-config";

export type DevPlanCopy = {
  name: string;
  price: string;
  description: string;
  blurb: string;
  cta: string;
  upgradeLabel: string;
};

const copyByLocale: Record<Locale, DevPlanCopy> = {
  en: {
    name: "Dev",
    price: "$19",
    description: "The sweet spot for solo developers shipping real workloads.",
    blurb: "Expanded limits for active builders and side projects in production.",
    cta: "Upgrade to Dev",
    upgradeLabel: "Upgrade to Dev",
  },
  fr: {
    name: "Dev",
    price: "$19",
    description: "Le point ideal pour les developpeurs qui passent en production.",
    blurb: "Des limites etendues pour les produits en croissance.",
    cta: "Passer au plan Dev",
    upgradeLabel: "Passer a Dev",
  },
  de: {
    name: "Dev",
    price: "$19",
    description: "Der Sweet Spot fur Entwickler mit produktiven Workloads.",
    blurb: "Mehr Kapazitat fur aktive Projekte und schnelle Iteration.",
    cta: "Auf Dev upgraden",
    upgradeLabel: "Auf Dev upgraden",
  },
  it: {
    name: "Dev",
    price: "$19",
    description: "Il piano ideale per developer con workload reali.",
    blurb: "Limiti piu alti per progetti live e team in crescita.",
    cta: "Passa a Dev",
    upgradeLabel: "Passa a Dev",
  },
  es: {
    name: "Dev",
    price: "$19",
    description: "El punto ideal para developers con uso real en produccion.",
    blurb: "Mas capacidad para proyectos activos y despliegues continuos.",
    cta: "Subir a Dev",
    upgradeLabel: "Subir a Dev",
  },
  ar: {
    name: "Dev",
    price: "$19",
    description: "الخطة المناسبة للمطورين مع احمال عمل حقيقية.",
    blurb: "حدود اعلى للمشاريع النشطة واطلاقات اسرع.",
    cta: "الترقية الى Dev",
    upgradeLabel: "الترقية الى Dev",
  },
  zh: {
    name: "Dev",
    price: "$19",
    description: "适合真实业务负载开发者的最佳价位。",
    blurb: "更高额度，支持正在上线和持续迭代的项目。",
    cta: "升级到 Dev",
    upgradeLabel: "升级到 Dev",
  },
};

export function getDevPlanCopy(locale: Locale): DevPlanCopy {
  return copyByLocale[locale] ?? copyByLocale.en;
}
