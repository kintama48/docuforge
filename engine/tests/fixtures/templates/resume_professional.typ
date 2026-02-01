// Professional CV/Resume template with two-column layout for skills
#set page(
  paper: "us-letter",
  margin: (top: 1.5cm, bottom: 1.5cm, left: 1.5cm, right: 1.5cm),
)

#set text(font: "Inter", size: 10pt)
#set par(justify: false, leading: 0.5em)

// Color scheme
#let accent-color = rgb("#2563eb")
#let gray-dark = rgb("#374151")
#let gray-light = rgb("#9ca3af")

// Helper function for section headers
#let section-header(title) = {
  v(0.8em)
  text(size: 12pt, weight: "bold", fill: accent-color)[#upper(title)]
  v(0.2em)
  line(length: 100%, stroke: 1.5pt + accent-color)
  v(0.5em)
}

// Helper for experience entries
#let experience-entry(title, company, location, dates, bullets) = {
  block(above: 0.6em)[
    #grid(
      columns: (1fr, auto),
      gutter: 1em,
      [
        #text(weight: "bold", size: 11pt)[#title] \
        #text(fill: gray-dark)[#company]
        #if location != none [ | #text(fill: gray-light)[#location]]
      ],
      align(right)[
        #text(fill: gray-dark, size: 9pt)[#dates]
      ]
    )
    #v(0.3em)
    #for bullet in bullets [
      #block(inset: (left: 0.5em))[
        #text(fill: accent-color)[--] #bullet
      ]
    ]
  ]
}

// Helper for education entries
#let education-entry(degree, institution, location, dates, details) = {
  block(above: 0.6em)[
    #grid(
      columns: (1fr, auto),
      gutter: 1em,
      [
        #text(weight: "bold")[#degree] \
        #text(fill: gray-dark)[#institution]
        #if location != none [ | #text(fill: gray-light)[#location]]
      ],
      align(right)[
        #text(fill: gray-dark, size: 9pt)[#dates]
      ]
    )
    #if details != none [
      #v(0.2em)
      #text(size: 9pt)[#details]
    ]
  ]
}

// =============================================================================
// HEADER - Contact Information
// =============================================================================

#align(center)[
  #text(size: 28pt, weight: "bold", fill: gray-dark)[#sys.inputs.name]

  #v(0.3em)

  #text(size: 12pt, fill: gray-dark)[#sys.inputs.title]

  #v(0.5em)

  #text(size: 9pt, fill: gray-light)[
    #sys.inputs.contact.email
    #h(1em) | #h(1em)
    #sys.inputs.contact.phone
    #h(1em) | #h(1em)
    #sys.inputs.contact.location
    #if sys.inputs.contact.linkedin != none [
      #h(1em) | #h(1em)
      #sys.inputs.contact.linkedin
    ]
    #if sys.inputs.contact.github != none [
      #h(1em) | #h(1em)
      #sys.inputs.contact.github
    ]
    #if sys.inputs.contact.website != none [
      #h(1em) | #h(1em)
      #sys.inputs.contact.website
    ]
  ]
]

#v(0.5em)
#line(length: 100%, stroke: 0.5pt + gray-light)

// =============================================================================
// PROFESSIONAL SUMMARY
// =============================================================================

#if sys.inputs.summary != none [
  #section-header("Professional Summary")

  #text(size: 10pt)[#sys.inputs.summary]
]

// =============================================================================
// EXPERIENCE
// =============================================================================

#section-header("Professional Experience")

#for job in sys.inputs.experience [
  #experience-entry(
    job.title,
    job.company,
    job.location,
    job.dates,
    job.achievements,
  )
]

// =============================================================================
// EDUCATION
// =============================================================================

#section-header("Education")

#for edu in sys.inputs.education [
  #education-entry(
    edu.degree,
    edu.institution,
    edu.location,
    edu.dates,
    edu.details,
  )
]

// =============================================================================
// SKILLS - Two Column Layout
// =============================================================================

#section-header("Skills")

#grid(
  columns: (1fr, 1fr),
  gutter: 2em,

  // Left column - Technical skills
  [
    #if sys.inputs.skills.technical != none [
      #text(weight: "bold", size: 10pt)[Technical Skills]
      #v(0.3em)
      #for skill in sys.inputs.skills.technical [
        #block(inset: (left: 0.5em), above: 0.2em)[
          #text(fill: accent-color)[--] *#skill.category:* #skill.items.join(", ")
        ]
      ]
    ]
  ],

  // Right column - Soft skills and languages
  [
    #if sys.inputs.skills.soft != none [
      #text(weight: "bold", size: 10pt)[Soft Skills]
      #v(0.3em)
      #for skill in sys.inputs.skills.soft [
        #block(inset: (left: 0.5em), above: 0.2em)[
          #text(fill: accent-color)[--] #skill
        ]
      ]
    ]

    #if sys.inputs.skills.languages != none [
      #v(0.8em)
      #text(weight: "bold", size: 10pt)[Languages]
      #v(0.3em)
      #for lang in sys.inputs.skills.languages [
        #block(inset: (left: 0.5em), above: 0.2em)[
          #text(fill: accent-color)[--] *#lang.language:* #lang.proficiency
        ]
      ]
    ]
  ],
)

// =============================================================================
// CERTIFICATIONS
// =============================================================================

#if sys.inputs.certifications != none and sys.inputs.certifications.len() > 0 [
  #section-header("Certifications")

  #grid(
    columns: (1fr, 1fr),
    gutter: 1em,
    ..sys.inputs.certifications.map(cert => [
      #block(above: 0.3em)[
        #text(weight: "bold")[#cert.name] \
        #text(size: 9pt, fill: gray-dark)[#cert.issuer | #cert.date]
      ]
    ])
  )
]

// =============================================================================
// PROJECTS
// =============================================================================

#if sys.inputs.projects != none and sys.inputs.projects.len() > 0 [
  #section-header("Notable Projects")

  #for project in sys.inputs.projects [
    #block(above: 0.5em)[
      #text(weight: "bold")[#project.name]
      #if project.url != none [
        #text(size: 9pt, fill: gray-light)[ | #project.url]
      ]
      #v(0.2em)
      #text(size: 9pt)[#project.description]
      #v(0.2em)
      #text(size: 9pt, fill: gray-dark)[_Technologies: #project.technologies.join(", ")_]
    ]
  ]
]

// =============================================================================
// AWARDS & HONORS
// =============================================================================

#if sys.inputs.awards != none and sys.inputs.awards.len() > 0 [
  #section-header("Awards & Honors")

  #for award in sys.inputs.awards [
    #block(above: 0.3em)[
      #text(weight: "bold")[#award.name]
      #text(size: 9pt, fill: gray-dark)[ | #award.issuer, #award.year]
    ]
  ]
]
