#set page(paper: "a4", margin: 2cm, numbering: "1")
#set text(size: 11pt)

#align(center)[
  #text(size: 24pt, weight: "bold")[#sys.inputs.title]

  #v(0.5em)

  #text(size: 14pt)[#sys.inputs.subtitle]

  #v(1em)

  #sys.inputs.author\
  #sys.inputs.date
]

#pagebreak()

= Executive Summary

#sys.inputs.summary

#pagebreak()

= Introduction

#sys.inputs.introduction

= Findings

#for section in sys.inputs.sections [
  == #section.title

  #section.content

]

#pagebreak()

= Conclusion

#sys.inputs.conclusion

= Recommendations

#for rec in sys.inputs.recommendations [
  - #rec
]
