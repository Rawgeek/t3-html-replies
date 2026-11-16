# Reply type selection

Choose `replyType` before writing content. Read only the selected guide.

- [Progress](guides/progress.md) for task status, stages, and remaining work.
- [Data](guides/data.md) for visual findings, charts, metrics, and tables.
- [Interactive](guides/interactive.md) for custom interactive final HTML.

An absent `replyType` keeps the progress format for existing callers. Unknown types fail validation.
Legacy `kind: "question"` remains supported. Do not mix `kind` with `replyType`.

    node ui.mjs types
    node ui.mjs schema data
    node ui.mjs new data /task/output/reply.json

Edit the starter, then call `render_reply` with the absolute JSON path. The tool validates and renders in one call.
Without MCP, run `node ui.mjs reply input.json output.html` and send the generated page through T3.
Use `check` for a dry run. Use `guard` to compare an existing page with a fresh canonical render.

All types keep at most 8 sections and 1200 visible characters. Apply Unslop and show each idea once.
Data and interactive reports allow 90 words total and 12 words per sentence or text box.
Chat buttons and choices steer and show a steering icon. Queue is never an option or fallback.
Links, PRs, attachments, and local controls keep their own behavior.
