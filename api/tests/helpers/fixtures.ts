/**
 * Test fixtures.
 * Sample data for use in tests.
 */

/**
 * Sample user data for registration tests.
 */
export const sampleUsers = {
  valid: {
    email: 'test@example.com',
    password: 'securepassword123',
  },
  validAlt: {
    email: 'another@example.com',
    password: 'anotherpassword456',
  },
  weakPassword: {
    email: 'weak@example.com',
    password: 'short', // Too short
  },
  invalidEmail: {
    email: 'not-an-email',
    password: 'securepassword123',
  },
  pro: {
    email: 'pro@example.com',
    password: 'propassword123',
    planTier: 'pro' as const,
    planRenders: 50000,
  },
  starter: {
    email: 'starter@example.com',
    password: 'starterpassword123',
    planTier: 'starter' as const,
    planRenders: 10000,
  },
};

/**
 * Sample template data with Typst source code.
 */
export const sampleTemplates = {
  simple: {
    name: 'Simple Template',
    description: 'A simple test template',
    source: '#set page(paper: "a4")\n= Hello, World!\nThis is a simple document.',
    defaults: { title: 'Hello' },
  },
  invoice: {
    name: 'Invoice Template',
    description: 'A sample invoice template',
    source: `#set page(paper: "a4", margin: 2cm)
#set text(font: "Inter", size: 11pt)

#align(center)[
  #text(size: 24pt, weight: "bold")[INVOICE]
]

#v(1cm)

*Invoice ID:* #sys.inputs.invoice_id \\
*Date:* #sys.inputs.date \\
*Customer:* #sys.inputs.customer \\

#v(1cm)

#table(
  columns: (1fr, auto, auto, auto),
  inset: 8pt,
  [*Item*], [*Qty*], [*Price*], [*Total*],
  ..sys.inputs.items.map(item => (
    item.description,
    str(item.qty),
    [\$#str(item.price)],
    [\$#str(item.qty * item.price)]
  )).flatten()
)

#v(1cm)
#align(right)[*Total: \$#sys.inputs.total*]
`,
    files: {
      'utils.typ': '#let currency(x) = [$#x]',
    },
    defaults: {
      invoice_id: 'INV-001',
      date: '2024-01-15',
      customer: 'Acme Corp',
      items: [
        { description: 'Widget A', qty: 5, price: 9.99 },
        { description: 'Widget B', qty: 2, price: 24.99 },
      ],
      total: 99.93,
    },
  },
  withVariables: {
    name: 'Variable Template',
    description: 'Template using sys.inputs',
    source: `#set page(paper: "a4")
#let name = sys.inputs.name
#let title = sys.inputs.title

= #title

Hello, #name!

Your message: #sys.inputs.message
`,
    defaults: {
      name: 'World',
      title: 'Greeting',
      message: 'Welcome to DocuForge',
    },
  },
  syntaxError: {
    name: 'Broken Template',
    description: 'Template with syntax error',
    source: '#set page(paper: "a4")\n= Hello\n#invalid_function()',
  },
  large: {
    name: 'Large Template',
    description: 'A larger template for testing',
    source: '#set page(paper: "a4")\n' + '= Section\n\nContent here.\n\n'.repeat(100),
  },
};

/**
 * Sample asset data for upload tests.
 */
export const sampleAssets = {
  png: {
    filename: 'logo.png',
    contentType: 'image/png',
    sizeBytes: 45000,
    hash: 'sha256-abc123def456',
  },
  jpg: {
    filename: 'photo.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 120000,
    hash: 'sha256-789xyz012345',
  },
  font: {
    filename: 'CustomFont.ttf',
    contentType: 'font/ttf',
    sizeBytes: 2500000,
    hash: 'sha256-font123hash456',
  },
  svg: {
    filename: 'icon.svg',
    contentType: 'image/svg+xml',
    sizeBytes: 5000,
    hash: 'sha256-svg789hash',
  },
  invalid: {
    filename: 'script.js',
    contentType: 'application/javascript',
    sizeBytes: 1000,
    hash: 'sha256-invalid',
  },
  oversized: {
    filename: 'huge.png',
    contentType: 'image/png',
    sizeBytes: 50 * 1024 * 1024, // 50MB
    hash: 'sha256-huge',
  },
};

/**
 * Sample render request data.
 */
export const sampleRenderRequests = {
  valid: {
    template_id: 'tpl_test123',
    data: {
      name: 'John Doe',
      items: [{ description: 'Widget', qty: 1, price: 9.99 }],
    },
  },
  minimal: {
    template_id: 'tpl_test123',
    data: {},
  },
  withEmptyData: {
    template_id: 'tpl_test123',
  },
  missingTemplate: {
    data: { name: 'John' },
  },
};

/**
 * Sample preview request data.
 */
export const samplePreviewRequests = {
  valid: {
    source: '#set page(paper: "a4")\nHello, World!',
    data: {},
  },
  withData: {
    source: '#set page(paper: "a4")\nHello, #sys.inputs.name!',
    data: { name: 'World' },
  },
  withFiles: {
    source: '#import "utils.typ": *\nHello!',
    files: {
      'utils.typ': '#let greet(x) = [Hello, #x]',
    },
    data: {},
  },
  oversized: {
    source: 'x'.repeat(200 * 1024), // 200KB, over 100KB limit
    data: {},
  },
};

/**
 * Plan limits for testing billing.
 */
export const planLimits = {
  free: 500,
  starter: 10000,
  pro: 50000,
};

/**
 * Stripe test data.
 */
export const stripeTestData = {
  customerId: 'cus_test123',
  subscriptionId: 'sub_test456',
  starterPriceId: 'price_starter_test',
  proPriceId: 'price_pro_test',
};
