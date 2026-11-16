---
name: t3-html-replies
description: Render T3 main-session replies as validated progress reports, visual data reports, or custom interactive final HTML. Keep subagent output contracts unchanged.
---

# T3 HTML replies

Choose the reply type before drafting. Set `replyType` and read only that type's guide.

| Type | Use when | Guide in the UI library |
| --- | --- | --- |
| `progress` | Reporting task stages, progress, and remaining work. This is the compatibility default. | `guides/progress.md` |
| `data` | Explaining findings with charts, metrics, or tables. No task history required. | `guides/data.md` |
| `interactive` | Delivering custom interactive HTML as the final output. | `guides/interactive.md` |

The library is `ui-library/` in this repository or `~/.codex/templates/t3-ui-library/` in a personal install.
Use `node <library>/ui.mjs schema <type>` to read one guide.

## Draft and send

1. Apply Unslop. Use a title, short descriptions, and visuals. Show each idea once.
2. Run `node <library>/ui.mjs new <type> /task/output/reply.json` and replace sample content with verified facts.
3. Call `render_reply` with `{"dataPath":"/absolute/path/reply.json"}`. It validates the selected type and renders in one call.
4. `structuredContent.status: "rendered"` is the delivery receipt. Do not repeat the call to inspect or confirm it. When the task is complete, end with an empty final message.

Without MCP, use `node <library>/ui.mjs reply input.json output.html`, then T3's HTML renderer.
After either display tool succeeds, do not paste HTML, extracted body markup, or a text copy into chat.
Use one display tool per reply. `render_reply` already displays it; do not also call `html_render`.
Use `check` for a dry run only. Use `guard` for a page received from another source.
On failure, fix reported issues together. Never bypass validation with hand-written HTML or plain text.

## Shared rules

- Send one self-contained page. No text outside it.
- Use at most 8 sections and 1200 visible characters. No hashes, tokens, or machine IDs.
- Keep text visible. No expandable content, dropdowns, hover-only details, clipping, or internal scrolling.
- Data and interactive replies allow 90 words total and 12 words per sentence or text box. Aim for 30-second comprehension.
- Data and custom sections fit their content. Keep padding compact. Stack sections on phones.
- Chat buttons and choices always steer. Never offer queue or silently fall back to queue.
- Steering buttons show a steering icon beside their label. Links, PRs, attachments, and local controls keep their own behavior.
- The current T3 bridge queues app messages. Chat controls stay disabled until T3 provides a verified steer transport.
- Keep legacy `kind: "question"` for a choice prompt. Do not combine `kind` with `replyType`.

Do not stringify a full `render_reply` result. Its `_meta.html` is the app payload, not assistant text.
For preview tools, read dimensions from `structuredContent` and forward only the image item.
Preview changed layouts at 728px and 390px. Test interactive controls and their resulting text.
Read `ELEMENT_INDEX.md` only when a starter does not fit.

Server changes require `node scripts/selftest.mjs`. Library changes require build, verification, and layout checks.
