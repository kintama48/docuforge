# Show HN Post Draft for DocuForge

## Title Options (pick one):

**Option A (technical angle):**

> Show HN: DocuForge – PDF generation API built in Rust using Typst instead of headless Chrome

**Option B (pain-point angle):**

> Show HN: DocuForge – Generate PDFs in 12ms without Puppeteer or headless Chrome

**Option C (understated/curious):**

> Show HN: I replaced Puppeteer with Typst for PDF generation and got a 70x speedup

➡️ **Recommendation: Option C** — personal voice, specific claim, invites curiosity. HN loves "I built X" framing.

---

## Post Body

```
I've been building SaaS apps for a few years and kept running into the same
problem: generating PDFs (invoices, reports, certificates) with Puppeteer is
slow, memory-hungry, and painful to template.

So I built DocuForge — a PDF generation API that uses Typst instead of
HTML/CSS rendered through headless Chrome.

**The core idea:** Typst (https://typst.app) is a modern typesetting system
designed for documents. It's like LaTeX but actually pleasant to use. I wrapped
it in a Rust API with template management and a RAG-powered AI assistant that
knows the Typst docs.

**What I'm seeing in benchmarks (early, not rigorous yet):**
- Invoice PDF generation: ~12ms vs ~850ms (Puppeteer)
- Memory per request: ~18MB vs ~280MB (no Chrome process)
- Cold start: ~45ms vs ~2.8s

**The tradeoffs I want to be upfront about:**
- If you already have HTML/CSS templates in production, there's a migration cost
- Typst's ecosystem is younger than HTML/CSS — fewer StackOverflow answers
- If you need to render arbitrary web pages to PDF, use Puppeteer — DocuForge
  generates from templates, not URLs

**What's included:**
- REST API (send JSON data + template name, get PDF bytes back)
- Template playground (edit Typst, see live PDF preview)
- AI template assistant (describe what you want, get working Typst code)
- Pre-built templates for invoices, receipts, certificates, reports

**Built with:**
- Rust for the API and rendering engine
- Typst for document layout and PDF output
- RAG pipeline over Typst documentation for the AI assistant

Try the playground: [link]
API docs: [link]
GitHub (benchmark scripts): [link]

I'd genuinely appreciate feedback on:
1. Is the Typst learning curve a dealbreaker for you?
2. What document types would you want pre-built templates for?
3. Any benchmark scenarios you'd want to see?
```

---

## Posting Strategy

### Timing

* **Best day:** Tuesday (60% higher avg score than Monday/Wednesday per recent analysis)
* **Best time:** 6-10am EST (14:00-18:00 UTC) — this gives US morning + EU afternoon overlap
* **Backup:** Sunday morning EST also works well for Show HN specifically

### Before Posting — Have These Ready

1. **Playground working** — HN users WILL click and try immediately
2. **Free tier / no signup required for playground** — any friction = closed tab
3. **GitHub repo with benchmark scripts** — someone will ask for repro steps
4. **API docs page** — clean, no login wall for reading docs

### Comment Strategy

* **Be in the thread immediately** after posting. First 30 min are critical.
* **Answer every question** within 15 minutes for the first 2 hours
* **When criticized:** agree with the valid part, explain your thinking, never get defensive
* **Common objections to prepare for:**

| Objection                                  | Prepared Response                                                                                                                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Typst has a smaller ecosystem"            | "You're right. That's the main tradeoff. We're betting that for structured documents (invoices, reports, certificates), Typst's native page model is worth the ecosystem gap. For complex web layouts, Puppeteer is still the right tool."                                |
| "Those benchmarks look cherry-picked"      | "Fair concern. The benchmark scripts are open source at [link] — I'd love for you to run them and tell me if I'm measuring wrong. Happy to add scenarios that you think would be more representative."                                                                   |
| "Why not just use wkhtmltopdf/WeasyPrint?" | "Both are solid options. wkhtmltopdf uses Qt WebKit which is unmaintained, and WeasyPrint handles CSS well but is slower for high-throughput. The main DocuForge advantage is Typst's native page model (headers, footers, page breaks just work) plus the AI assistant." |
| "What happens if you go down?"             | "The Typst rendering engine is open source. Your templates are portable .typ files. Worst case, you can render locally with the Typst CLI."                                                                                                                               |
| "Pricing?"                                 | "Free tier for [X] PDFs/month, then [pricing]. The playground and AI assistant are free with no account."                                                                                                                                                                 |

### If It Doesn't Hit Front Page

* Wait 2-3 days, email hn@ycombinator.com asking them to look at your submission (this is the official "second chance" process)
* Do NOT repost the same URL — HN penalizes this
* If it still doesn't work, try submitting a technical blog post instead (e.g., the Puppeteer benchmark post) and mention DocuForge in the post

---

## Same-Week Cross-Promotion Plan

| Day       | Channel              | Action                                                                      |
| --------- | -------------------- | --------------------------------------------------------------------------- |
| Monday    | Product Hunt         | Launch with pre-built supporter list                                        |
| Tuesday   | Hacker News          | Show HN post (see above)                                                    |
| Tuesday   | Twitter/X            | Thread: "I just launched DocuForge on HN. Here's why I built it..."         |
| Wednesday | Reddit r/rust        | "I built a PDF generation API in Rust using Typst — here's what I learned" |
| Wednesday | Reddit r/webdev      | "Tired of Puppeteer for PDF generation? I built an alternative"             |
| Thursday  | Dev.to               | Cross-post technical deep dive with canonical URL                           |
| Friday    | Reddit r/SideProject | Build story: "I replaced headless Chrome with Typst for PDF generation"     |

**Key rule:** Each channel gets a DIFFERENT angle/title. Never cross-post the exact same content.
