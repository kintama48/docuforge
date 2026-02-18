import type { LowCodeSpec } from "@/src/lib/low-code";

function quote(value: string): string {
  return JSON.stringify(value);
}

function parseDynamicPath(value: string): string | null {
  const match = value.trim().match(/^\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}$/);
  return match?.[1] ?? null;
}

function toTypstPath(path: string): string {
  return `data.${path}`;
}

function toTypstValue(value: string, fallback = ""): string {
  const dynamicPath = parseDynamicPath(value);
  if (!dynamicPath) {
    return quote(value);
  }
  return `${toTypstPath(dynamicPath)} ?? ${quote(fallback)}`;
}

function blockToTypst(block: LowCodeSpec["blocks"][number]): string {
  if (block.type === "header") {
    const align = block.props.align ?? "left";
    const title = toTypstValue(block.props.title, "Untitled");
    const subtitle = block.props.subtitle ? toTypstValue(block.props.subtitle, "") : null;
    return [
      `#align(${align})[`,
      `  = #(${title})`,
      subtitle ? `  #text(fill: muted, size: 10pt)[#(${subtitle})]` : "",
      "]",
      "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (block.type === "paragraph") {
    const text = toTypstValue(block.props.text, "");
    return `[#(${text})]\n`;
  }

  if (block.type === "divider") {
    return '#line(length: 100%, stroke: 0.5pt + rgb("#d1d5db"))\n';
  }

  const columns = block.props.columns ?? ["name", "qty", "price", "total"];
  const itemsPath = block.props.items_path || "items";
  const titleLine = block.props.title
    ? `#text(weight: "semibold", fill: primary)[#(${toTypstValue(block.props.title, "Items")})]\n`
    : "";
  const colLabels = columns.map((column) => `[${column.toUpperCase()}]`).join(", ");
  const cells = columns
    .map((column) => `          [#(item.${column} ?? "")]`)
    .join(",\n");

  return [
    titleLine.trimEnd(),
    `#let _items = ${toTypstPath(itemsPath)} ?? ()`,
    "#table(",
    `  columns: ${columns.length},`,
    "  inset: 8pt,",
    '  stroke: (x: none, y: 0.5pt + rgb("#d1d5db")),',
    `  ${colLabels},`,
    "  .._items.map(item => (",
    cells,
    "  )),",
    ")",
    "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function compileLowCodeSpec(spec: LowCodeSpec): string {
  const page = spec.meta?.page === "letter" ? "us-letter" : "a4";
  const margin = spec.meta?.margin ?? "24pt";
  const primary = spec.theme?.primary ?? "#0D2659";
  const text = spec.theme?.text ?? "#111827";
  const muted = spec.theme?.muted ?? "#6B7280";
  const font = spec.theme?.font ?? "Inter";
  const body = spec.blocks.map(blockToTypst).join("\n");

  return `#let data = sys.inputs
#set page(paper: "${page}", margin: ${margin})
#set text(font: ${quote(font)}, fill: rgb(${quote(text)}), size: 11pt)
#let primary = rgb(${quote(primary)})
#let muted = rgb(${quote(muted)})

${body}`.trim();
}
