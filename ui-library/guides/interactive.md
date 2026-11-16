# Interactive final reply

Choose `replyType: "interactive"` before drafting. This type is a custom local tool, final output only.

Required fields are `replyType`, `state: "complete"`, `title`, `sections`, and `script`.
Optional fields are `summary` and `css`. Other fields fail validation.

Use 1 to 8 sections, each with `title` and `html`. An optional `description` allows 80 characters.
The page title allows 64 characters. Section titles allow 24. Summary allows 80.
Each section uses the same 184px minimum height. Sections stack on phones.

Write an HTML fragment per section, not a full document. Use a visible button or input and a local script.
Give controls native labels or `aria-label`. Use inline SVG for graphs.
Keep all ideas visible. No dropdowns, expandable content, hidden notes, clipping, or internal scrolling.
Do not put scripts, styles, frames, links, forms, or media URLs in section HTML.
Place CSS in `css` and JavaScript in `script`, without enclosing tags.
Use theme variables such as `var(--foreground)`, `var(--card)`, and `var(--chart-1)`.

Apply Unslop. Maximum 12 words per sentence or text box, 90 words and 1200 visible characters across the page.
Show each idea once. Use titles, short descriptions, and visuals. Reading should take at most 30 seconds.
The runtime checks text budgets and layout after local interactions. Invalid content becomes a visible error.
Test every input state. Automated checks do not prove comprehension, useful controls, or factual accuracy.

Custom replies execute trusted agent-authored code in an isolated frame.
CSP blocks network connections, external resources, and form submission. Inline scripts, styles, and data images remain allowed.
Layout audits detect mistakes. They do not contain hostile scripts or prevent self-navigation.
Use only local calculations. Scripts allow 32000 characters, CSS 16000, and section HTML 16000.
Do not use viewport heights or assume a fixed viewport width.

Run `node ui.mjs new interactive /task/output/reply.json`, edit the starter, then call `render_reply` with `dataPath`.
The tool validates and renders in one call. Without MCP, use `node ui.mjs reply input.json output.html`.
Use `node ui.mjs check /task/output/reply.json` only for a dry run. The file already contains `replyType`.
`guard` checks canonical output, not runtime behavior.
