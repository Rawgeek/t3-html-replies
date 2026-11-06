---
name: t3-html-replies
description: "Render every T3 main-session update, question, and final reply as validated, compact HTML with optional native chat actions. Keep subagent output contracts unchanged."
---

# T3 HTML replies

Apply this skill to every message shown to the user in a T3 main session, including progress updates and final answers. Subagents follow their own response contract.

The complete reply library is bundled in `ui-library/`. Run commands from this skill directory.

## Contract

- Send all user-facing information in one HTML page. Never append Markdown or plain text.
- Use no expandable text. Never add disclosures, accordions, dropdowns, or hidden content.
- Use a dense 1024px grid with 3 or 4 columns and 8px gaps. Stack on phones.
- Results and status use the Slim height. Every reply section uses one shared 184px height. The renderer assigns it, so rows always align and mixed block heights are impossible.
- Keep fields short. When information will not fit, add another visible block instead of lengthening text.
- Keep the validated reply under the renderer limits. Render opaque machine values internally.
- Give every interactive control a real transport. A button either sends through the T3 HTML reply app or is a link. Never draw a control that only looks interactive.

## Status

Show Progress, Next, ETA, and Wake for task updates.

- Keep the progress bar inside the Progress tile, directly under the percentage.
- Label estimates. Use Unknown when evidence is missing.
- Reserve 100% for the fully verified outcome. Pending work stays below 100%.
- Claim a wake only after host confirmation. Include time and timezone for a scheduled wake.
- At 100%, lead with the verified result, implemented changes, and useful numbers. Use 3 or 4 short result facts when available.
- Separate assessment progress from unresolved fix progress.

## Autonomy

Carry authorized work end to end. Continue through implementation, checks, review, and verification instead of stopping at a plan, diagnosis, or progress report. Decide routine, reversible details yourself. Ask only for missing authority or a preference that evidence cannot settle.

## Validation

The reply renderer is the only accepted path. Read [AGENT_GUIDE.md](ui-library/AGENT_GUIDE.md) for the current schema, block types, and exact field limits.

The renderer enforces the limits on every field before writing HTML. It rejects missing fields, unknown fields, long values, opaque references, expandable content, and replies above the total size limit. On failure, shorten the field or move the information into another block. Never bypass validation.

Available visible block types are facts, list, table, timeline, and bars. Each block has a short title and the shared section height. The renderer rejects a per-section size or span field. The grid fills the last row automatically.

## Find an element

Start at [ELEMENT_INDEX.md](ui-library/ELEMENT_INDEX.md). The tree is group, family, and sample. Each leaf has a one-line use case and links to its demo and logic file.

Using the index first keeps replies consistent and avoids rewriting markup. Use `node ui-library/ui.mjs show ID` when the one-line description needs more context.

## Workflow

1. Read the reply guide. Apply your local unslop rules if installed.
2. Pick the closest element from the tree index.
3. Write compact JSON. Split information across visible blocks. Use at most 8 sections and 1200 visible characters.
4. Render with `node ui-library/ui.mjs reply data.json /absolute/path/reply.html`. The command prints the absolute path.
5. Verify the path, then preview at 728px and 390px. Fix overflow, gaps, clipping, or unclear status.
6. When the t3-html-replies render_reply MCP tool is available, call it with the absolute htmlPath. Otherwise call T3's html_render tool. Keep source markup out of model context.

## Native action transport

The skill includes a local MCP server named t3_html_replies. Its render_reply tool shows the validated HTML as a native MCP app. Action buttons can call T3's ui/message bridge and send their instruction into the current thread.

- Use render_reply when that tool is in the current tool catalog.
- Pass {"htmlPath":"/absolute/path/reply.html"}.
- T3 asks the user to confirm each ui/message action. That confirmation is part of the native bridge. Do not add another approval control.
- Use action.send for buttons such as Mark read, Ignore once, Ignore forever, and Snooze. Keep each send value under 400 characters and write one clear instruction with the affected scope.
- Plain html_render cannot call ui/message. In that fallback, use action.href only and do not emit send buttons.
- A new provider session is required after installing or changing the MCP server. Existing sessions do not reload their tool catalog.

Server entry: scripts/mcp-server.mjs. App document: assets/mcp-app.html. Run scripts/selftest.mjs after changing either file.

## Actions

Use compact icon buttons for useful next steps, such as Send, Run, Parallel, Save, or Download. A real action needs a supported host transport and existing authority. Do not add approval buttons for authorized work.

An action is either:

    {"label":"Mark read","icon":"check","send":"Mark the messages in this reply as read."}

or:

    {"label":"Open queue","icon":"arrow-right","href":"https://example.com/queue"}

## Final check

- No text outside the HTML page.
- No dropdown or collapsible content.
- No field over its limit.
- No clipping, overflow, or avoidable gap.
- Progress, Next, ETA, and Wake are visible.
- Completion shows the verified result and useful numbers.
- Every control either has a working MCP action or an HTTPS link.

