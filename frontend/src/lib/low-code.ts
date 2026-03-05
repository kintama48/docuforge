import { assertPresent } from "@/src/lib/assert";

export type LowCodePage = "a4" | "letter";

export type LowCodeSpec = {
  version: 1;
  meta?: {
    page?: LowCodePage;
    margin?: string;
  };
  theme?: {
    primary?: string;
    text?: string;
    muted?: string;
    font?: string;
  };
  blocks: LowCodeBlock[];
};

export type LowCodeBlock =
  | {
      type: "header";
      props: {
        title: string;
        subtitle?: string;
        align?: "left" | "center" | "right";
      };
    }
  | {
      type: "paragraph";
      props: {
        text: string;
      };
    }
  | {
      type: "divider";
      props?: Record<string, never>;
    }
  | {
      type: "line_items_table";
      props: {
        title?: string;
        items_path?: string;
        columns?: Array<"name" | "description" | "qty" | "price" | "total">;
      };
    };

export type LowCodeBlockType = LowCodeBlock["type"];
export type LowCodeTableColumn = "name" | "description" | "qty" | "price" | "total";

export type GuidedTemplatePreset = {
  id: string;
  name: string;
  spec: LowCodeSpec;
};

export function cloneLowCodeSpec(spec: LowCodeSpec): LowCodeSpec {
  return JSON.parse(JSON.stringify(spec)) as LowCodeSpec;
}

export function createLowCodeBlock(type: LowCodeBlockType): LowCodeBlock {
  switch (type) {
    case "header":
      return {
        type: "header",
        props: {
          title: "{{invoice.title}}",
          subtitle: "{{invoice.date}}",
          align: "left",
        },
      };
    case "paragraph":
      return {
        type: "paragraph",
        props: {
          text: "Write your content here...",
        },
      };
    case "divider":
      return {
        type: "divider",
      };
    case "line_items_table":
      return {
        type: "line_items_table",
        props: {
          title: "Items",
          items_path: "items",
          columns: ["name", "qty", "price", "total"],
        },
      };
  }
}

export const LOW_CODE_BLOCK_TYPE_OPTIONS: Array<{
  type: LowCodeBlockType;
  label: string;
}> = [
  { type: "header", label: "Header" },
  { type: "paragraph", label: "Paragraph" },
  { type: "divider", label: "Divider" },
  { type: "line_items_table", label: "Line Items Table" },
];

const guidedTemplatePresets: GuidedTemplatePreset[] = [
  {
    id: "guided-invoice",
    name: "Guided Invoice",
    spec: {
      version: 1,
      meta: { page: "a4", margin: "24pt" },
      theme: {
        primary: "#0D2659",
        text: "#111827",
        muted: "#6B7280",
        font: "Inter",
      },
      blocks: [
        {
          type: "header",
          props: {
            title: "{{invoice.title}}",
            subtitle: "{{invoice.date}}",
          },
        },
        {
          type: "paragraph",
          props: {
            text: "{{customer.name}}",
          },
        },
        {
          type: "divider",
        },
        {
          type: "line_items_table",
          props: {
            title: "Items",
            items_path: "items",
            columns: ["name", "qty", "price", "total"],
          },
        },
      ],
    },
  },
];

export function listGuidedTemplatePresets(): GuidedTemplatePreset[] {
  return guidedTemplatePresets.map((preset) => ({
    id: preset.id,
    name: preset.name,
    spec: cloneLowCodeSpec(preset.spec),
  }));
}

export function getGuidedTemplatePreset(id: string): GuidedTemplatePreset | null {
  const preset = guidedTemplatePresets.find((item) => item.id === id);
  if (!preset) return null;
  return {
    id: preset.id,
    name: preset.name,
    spec: cloneLowCodeSpec(preset.spec),
  };
}

const MUSTACHE_FIELD_PATTERN = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g;

function parseMustacheFieldPaths(value: string): string[] {
  const matches = value.matchAll(MUSTACHE_FIELD_PATTERN);
  const fields = new Set<string>();
  for (const match of matches) {
    if (match[1]) fields.add(match[1]);
  }
  return Array.from(fields);
}

export function collectLowCodeFields(specInput: LowCodeSpec): string[] {
  const fields = new Set<string>();

  for (const block of specInput.blocks) {
    if (block.type === "header") {
      parseMustacheFieldPaths(block.props.title).forEach((path) => fields.add(path));
      if (block.props.subtitle) {
        parseMustacheFieldPaths(block.props.subtitle).forEach((path) =>
          fields.add(path)
        );
      }
      continue;
    }

    if (block.type === "paragraph") {
      parseMustacheFieldPaths(block.props.text).forEach((path) => fields.add(path));
      continue;
    }

    if (block.type === "line_items_table") {
      const path = block.props.items_path || "items";
      fields.add(path);
      const columns = block.props.columns ?? ["name", "qty", "price", "total"];
      columns.forEach((column) => fields.add(`${path}[].${column}`));
    }
  }

  return Array.from(fields).sort();
}

export function inferLowCodeDefaults(specInput: LowCodeSpec): Record<string, unknown> {
  const paths = collectLowCodeFields(specInput);
  const output: Record<string, unknown> = {};

  for (const path of paths) {
    if (path.includes("[].")) {
      const [listName, child] = path.split("[].");
      if (!Array.isArray(output[listName])) {
        output[listName] = [{}];
      }
      const first = (output[listName] as Record<string, unknown>[])[0];
      first[child] = "";
      continue;
    }

    const segments = path.split(".");
    let cursor: Record<string, unknown> = output;
    for (let index = 0; index < segments.length; index += 1) {
      const segment = assertPresent(segments[index], `Missing path segment at index ${index}`);
      if (index === segments.length - 1) {
        cursor[segment] = "";
        break;
      }
      if (!cursor[segment] || typeof cursor[segment] !== "object" || Array.isArray(cursor[segment])) {
        cursor[segment] = {};
      }
      cursor = cursor[segment] as Record<string, unknown>;
    }
  }

  return output;
}
