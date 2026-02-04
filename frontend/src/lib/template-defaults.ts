export const DEFAULT_TEMPLATE_SOURCE = `#let data = sys.inputs

#set page(margin: (x: 2cm, y: 2.5cm))
#set text(font: "IBM Plex Sans", size: 11pt)

= {data.title ?? "DocuForge Template"}

This template is ready for your content. Start by editing the data JSON or
replacing this text with your own layout.`;

export const DEFAULT_TEMPLATE_DEFAULTS = {
  title: "DocuForge Template",
};
