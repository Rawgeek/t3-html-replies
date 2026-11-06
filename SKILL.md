---
name: t3-html-replies
description: "Render every T3 main-session update, question, and final reply as validated, compact HTML with optional native chat actions. Keep subagent output contracts unchanged."
---

# T3 HTML replies

Apply this skill to every message shown to the user in a T3 main session, including progress updates and final answers. Subagents follow their own response contract.

## Hard gate

Every user-facing message must come out of the renderer. Markdown, plain text, and hand-written HTML are all invalid, including a one-line status, an apology, or an error note.

1. Build the reply data, then run node ui-library/ui.mjs check and node ui-library/ui.mjs reply. Send only that rendered file through the MCP app or T3's HTML renderer.
2. If validation fails, shorten the field or add a block and render again.
3. If rendering still fails, send a rendered error card naming the validator message. Never fall back to chat text.

An answer that was not rendered is a failed turn, even when its content is correct.

## Contract

- Send all user-facing information in one HTML page. Never append Markdown or plain text.
- Use no expandable text. Never add disclosures, accordions, dropdowns, or hidden content.
- Use a fixed four column grid at 1024px: one swimlane column and three flow columns with 8px gaps. Tablets use two flow columns and phones use one. The renderer chooses each block span and the block type when the type is omitted.
- Results and status use the Slim height. Reply sections share 184px. The swimlane is a tall side column. The renderer assigns every height, so rows always align.
- Keep fields short. When information will not fit, add another visible block instead of lengthening text.
- Keep the validated reply under the renderer limits. Never show hashes, short commit IDs, UUIDs, tokens, or encoded IDs. Name the human referent instead.
- Give every interactive control a real transport. A button either sends through the T3 HTML reply app or is a link. Never draw a control that only looks interactive.

## Status

Show Progress, Next, ETA, and Wake for task updates.

- Keep the progress bar inside the Progress tile, directly under the percentage. Draw it as a track plus one segment per milestone, with the milestone labels beneath.
- Label estimates. Use Unknown when evidence is missing.
- Reserve 100% for the fully verified outcome. Pending work stays below 100%.
- Claim a wake only after host confirmation. Include time and timezone for a scheduled wake.
- At 100%, lead with the verified result, implemented changes, and useful numbers. Use 3 or 4 short result facts when available.
- Separate assessment progress from unresolved fix progress.

## Autonomy

Carry authorized work end to end. Continue through implementation, checks, review, and verification instead of stopping at a plan, diagnosis, or progress report. Decide routine, reversible details yourself. Ask only for missing authority or a preference that evidence cannot settle.

## Swimlane, changes, and gates

Every reply ships three required elements. The renderer rejects a reply without them.

- The swimlane is a timeline of five to seven steps. At least two are done, exactly one is current for unfinished work, and at least two are pending. The current step carries its own progress number.
- The changes block lists what is done and what is still to do, so the reader sees delivered and remaining work at a glance.
- Two to four milestones label the segments of the progress bar.
- At least two supporting blocks sit beside the swimlane. The renderer rejects a reply that would leave an empty cell.

This gives every reply a visible past, present, and future. Do not replace the swimlane with prose.

The grid never leaves a hole. Supporting blocks fill the three flow columns beside the swimlane and the renderer picks their spans. Never pad a reply with filler to fill space.

## Validation

The reply renderer is the only accepted path. Read [AGENT_GUIDE.md](ui-library/AGENT_GUIDE.md) for the current schema, block types, and exact field limits.

The renderer enforces the limits on every field before writing HTML. It rejects missing fields, unknown fields, long values, opaque references, expandable content, and replies above the total size limit. On failure, shorten the field or move the information into another block. Never bypass validation.

Visible block types are facts, list, table, swimlane, bars, changes, compare, and cards. Each block has a short title and the shared section height. The renderer rejects a per-section size or span field. The grid fills the last row automatically.

Numbers sit inside a visual. A before and after pair uses compare, a single measurement uses facts, and several comparable values use bars.

## Find an element

Start at [ELEMENT_INDEX.md](ui-library/ELEMENT_INDEX.md). The tree is group, family, and sample. Each leaf has a one-line use case and links to its demo and logic file.

Using the index first keeps replies consistent and avoids rewriting markup. Use node ui-library/ui.mjs show ID when the one-line description needs more context.

## Workflow

1. Apply the unslop skill at ~/.codex/skills/unslop/SKILL.md.
2. From the skill checkout, run node ui-library/ui.mjs new /task/output/reply.json for a valid starter, then fill the fields. Read the guide only for an unusual layout.
3. Run node ui-library/ui.mjs check to validate in one line, then node ui-library/ui.mjs reply to render.
4. Preview at 728px and 390px only when the reply is new or its layout changed.
5. When the t3-html-replies render_reply MCP tool is available, call it with the absolute dataPath. The server validates the JSON and renders it. Otherwise call T3's html_render tool with the rendered file. Keep source markup out of model context.

## Native action transport

The skill includes a local MCP server named t3_html_replies. Its render_reply tool validates reply JSON, renders it, and shows the result as a native MCP app. Action buttons can call T3's ui/message bridge and send their instruction into the current thread.

- Use render_reply when that tool is in the current tool catalog.
- Pass {"dataPath":"/absolute/path/reply.json"}. The server rejects HTML and invalid reply data.
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
- The page came from node ui-library/ui.mjs reply or render_reply, not from a hand-written string.
- No dropdown or collapsible content.
- No field over its limit.
- No clipping, overflow, or avoidable gap.
- Progress, Next, ETA, and Wake are visible.
- The swimlane shows done, current, and next steps, and the changes block shows done and to do work.
- Completion shows the verified result and useful numbers.
- Every control either has a working MCP action or an HTTPS link.

