# Data reply

Choose `replyType: "data"` before drafting. Report findings without task status or stages.

Required fields are `replyType`, `title`, and `sections`. Optional fields are `summary` and `actions`.
Use 1 to 8 sections. Titles allow 64 characters, section titles 24, and summaries 80.

| Section type | Fields and limits |
| --- | --- |
| compare | `items`: 1 to 3 objects with `label` 18, `before` 10, `after` 10, optional `delta` 12. Use compatible units. |
| bars | `items`: 2 or 3 objects with `label` 18, numeric nonnegative `value`, optional `note` 22. |
| line | `labels`: 2 to 8 strings of 12 characters; matching numeric `values`; optional `unit` 8. |
| facts | `items`: 2 or 4 objects with `label` 12, `value` 8, optional `note` 18. |
| table | `columns`: 2 strings of 14 characters; `rows`: 2 or 3 arrays, 2 cells each, 18 characters per cell. |
| text | `description`: up to 80 characters. Use a title and one short description. |

Every section requires `type` and `title`. Include at least one visual section, not only text.
Use a chart for trends and comparisons. Use a table for exact values.
Show each idea once. Do not repeat chart values in summaries, facts, and tables.
Put a brief caveat in `summary`. Use a text section only when the caveat needs its own title.
No stages, `state`, progress, milestones, or required result band.

Apply Unslop. Maximum 12 words per sentence or text box, 90 words and 1200 visible characters total.
The word budget estimates 30 seconds at 180 words per minute. Check comprehension visually; speed is not guaranteed.
Sections use the same 184px minimum height and stack on phones. No hidden text, clipping, scrolling boxes, or expandable content.

Optional actions use `{ "label": "Open source", "href": "https://example.com" }` or `{ "label": "Continue", "send": "Continue this task." }`.
Labels allow 14 characters. Use at most 3 actions.
Chat actions show a steering icon. They stay disabled while the installed T3 bridge supports queue only.
HTTPS actions still open links, PRs, and attachments. Queue is never an option or fallback.

Run `node ui.mjs new data /task/output/reply.json`, edit the starter, then call `render_reply` with `dataPath`.
The tool validates and renders in one call. Without MCP, use `node ui.mjs reply input.json output.html`.
Use `node ui.mjs check /task/output/reply.json` only for a dry run. The file already contains `replyType`.
Do not repeat validation after a successful render.
