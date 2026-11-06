---
name: t3-html-replies
description: "Render every T3 main-session update, question, and final reply as validated, compact bento-style HTML with optional native chat actions. Keep subagent output contracts unchanged."
---

# T3 HTML replies

Use the renderer for every message shown to the user in a T3 main session. Markdown, plain text, and hand-written HTML are invalid, including one-line statuses and error notes.

## Gate

Use `node ui-library/ui.mjs` from a repository checkout, or `node ~/.codex/templates/t3-ui-library/ui.mjs` from a personal install.

1. Build reply JSON and run the `check` command.
2. Render with the `reply` command.
3. Run `guard` for any page you did not render.
4. Send only the validated page through `render_reply` or T3's HTML renderer.

If validation fails, shorten the field or use another block. If rendering fails, send a rendered error card with the validator message. Never fall back to chat text.

## Contract

- One self-contained page, no text outside it.
- Four columns at 1024px: Stages hold the left column; Progress and three or four result facts span the right three columns; Done, To do, and one supporting block share the next row; later blocks fill complete rows.
- Stages hold five or six timed steps with a 376px minimum height. Progress and results are 88px minimum. Supporting blocks are 184px minimum; a trailing row containing only facts, cards, or list items is 88px minimum. Rows grow only for accepted content, without clipping or internal scrolling. Below 900px the grid stacks with natural heights.
- The header has the title, one summary line, an optional bell chip naming a confirmed wake, and optional actions. No separate status pill, Next tile, Wake tile, or footer.
- Progress holds a numeric percentage, meter, milestone labels, and ETA. Unknown is allowed only for ETA. Never repeat overall progress inside the current stage.
- No expandable content, dropdowns, hover-only details, hidden notes, nested bordered cards, or truncated text.
- Keep every field inside the shared limits and the reply under 1,200 visible characters. Never print hashes, short commit IDs, UUIDs, tokens, or encoded IDs.
- Every control has a real transport: a T3 send action or an HTTPS link.

Read `AGENT_GUIDE.md` from the same UI directory for the exact schema and limits. Use `ELEMENT_INDEX.md` only when the starter blocks do not fit.

## Workflow

1. Follow the user's writing rules. When the unslop skill is installed, apply it before drafting.
2. Run `new` to write `/task/output/reply.json`.
3. Fill the JSON. Use three or four result facts, one swimlane, one changes block, and at least one more supporting block.
4. Check, render, and guard. Preview at 728px and 390px when creating or changing a layout.
5. Use `render_reply` with `{"dataPath":"/absolute/path/reply.json"}` when available.

## Stages and changes

- Stages: five or six steps. Each needs a real 24-hour `HH:MM` time. Done steps come first, then pending steps. An unfinished reply keeps exactly one waiting current step; a complete reply has none. Only the current step carries progress. Do not repeat the overall percentage in the rail.
- Done and To do: separate tall blocks below Progress. Each item requires a short title (18) and description (22). An unfinished reply needs both lists; a complete reply has only Done and no pending work anywhere.
- Milestones: two to four labels. Only an exact or token match with the current stage advances them. Unmatched labels stay pending rather than appearing passed from a percentage threshold.

## Completion

At 100%, lead with the verified result, implemented changes, and useful numbers. Use 3 or 4 verified facts. Keep status secondary. Reserve 100% for fully verified work.

## Actions

Use one action per real next step:

    {"label":"Mark read","icon":"check","send":"Mark these messages as read."}
    {"label":"Open queue","icon":"arrow-right","href":"https://example.com/queue"}

`render_reply` routes send actions through T3's message bridge and asks for confirmation. Plain HTML uses links only.

Server: `scripts/mcp-server.mjs`. App: `assets/mcp-app.html`. Run `scripts/selftest.mjs` after changing either.

## Final check

- No text outside the page.
- The page came from `ui.mjs reply` or `render_reply`.
- Stages have five or six clocked steps and one current step.
- Done and To do are separate; completion has no remaining work.
- Progress has ETA, milestones, and no duplicate percentage.
- Results, title, summary, and actions fit without clipping or horizontal overflow.
- Every control sends or links through a real transport.
