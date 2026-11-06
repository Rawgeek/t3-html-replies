# Reply UI

Every T3 main-session message is one validated HTML page. Use the starter for a routine reply. Read this guide only when the starter blocks do not fit. Open [ELEMENT_INDEX.md](ELEMENT_INDEX.md) only to find a specific sample.

## Fast path

From this directory:

    node ui.mjs new /task/output/reply.json
    node ui.mjs check /task/output/reply.json
    node ui.mjs reply /task/output/reply.json /task/output/reply.html
    node ui.mjs guard /task/output/reply.html

Send the absolute JSON path to `render_reply` when that tool is available. Otherwise send the rendered HTML through T3's HTML renderer.

## Layout

At 1024px the reply is a four-column bento grid:

- Stages occupy the left column at 376px.
- Progress occupies the next three columns at 88px, with its ETA at the right.
- Three or four result facts sit under Progress at 88px.
- Done, To do, and one supporting block share the next row at 184px each.
- Further supporting blocks use later 184px rows. A row containing only facts, cards, or list items uses 88px. One block spans all four columns; two split 2+2; three split 2+1+1; four split 1+1+1+1.

The renderer assigns every span. Do not add a size, span, or layout field. At 900px and below everything stacks in source order, with Progress first inside the grid and natural content heights. At 620px results use two columns; a final odd result spans both.

Never hide content. Do not use expandable text, tooltips, truncation, or nested card borders. When content will not fit, shorten it or use another visible block.

## Reply fields

| Field | Rule |
| --- | --- |
| title | Required, up to 64 characters. No hashes, UUIDs, or encoded IDs. |
| state | Required: `complete`, `working`, `waiting`, or `blocked`. |
| summary | Optional, up to 80 characters. |
| results | Required, 3 or 4 facts. Label 12, value 8, optional note 18. |
| sections | Required, 3 to 8 blocks. Exactly one swimlane and one changes block. |
| progress | Up to 12 characters. Use `62%` or `62% estimate`. Complete replies require 100%. |
| eta | Up to 16 characters. Use `Unknown` when no estimate exists. |
| wake | Up to 20 characters. The visible bell chip shows the event; omit it with `Not armed`. |
| milestones | Required, 2 to 4 labels of up to 8 characters. |
| actions | Optional, 1 to 3 buttons. Label 14. Each has exactly one HTTPS link or send message. |

The renderer rejects replies above 1,200 visible characters.

## Blocks

| Type | Fields and limits |
| --- | --- |
| facts | Title 24; 2 or 4 items; label 12, value 8, note 18. |
| list | Title 24; 2 or 3 items of up to 48 characters. |
| table | Title 24; exactly 2 columns and 2 or 3 rows; heading 14, cell 18. A cell may be one send action. |
| swimlane | Title 24; 5 or 6 items; label 18, note 20, time 5. Time is 24-hour `HH:MM`. Only the current waiting item may carry progress. |
| bars | Title 24; 2 or 3 items; label 18, note 22, numeric value. |
| changes | Title 24; up to 3 done and 3 to-do items, each `{title, description}` with title 18 and description 22. |
| compare | Title 24; 1 to 3 items; label 18, before 10, after 10, delta 12. Both values need compatible units. |
| cards | Title 24; 2 or 3 items; label 12, note 18; state `done`, `waiting`, `pending`, or `blocked`. |

The type may be inferred from the object shape. Prefer an explicit type.

## Timeline

Use five or six stages. Every stage carries a real clock time. Done steps must come first, followed by one current waiting step, then pending steps. The renderer derives a completed step's duration from the previous clock time; it does not print duration for pending work.

The current step may show its own progress. When it equals overall progress, the renderer keeps the meter and omits the repeated number. Milestone labels follow the current stage, so a waiting Review cannot appear passed merely because the overall percentage crossed a threshold.

## Changes and completion

An unfinished reply needs at least one Done item and one To do item. Each block is a separate tall tile below Progress; each item is a title over a description.

A complete reply has no waiting or pending stages, no pending cards, and no To do items. Use `state: complete`, `progress: 100%`, at least one Done item, and 3 or 4 verified result facts. Only then lead with the result.

## Status and header

The header shows the title, an optional bell chip with the watched event, and optional actions. There is no separate status pill, Next tile, Wake tile, or footer. Progress contains the percentage, meter, milestone labels, and ETA.

Never claim a wake without host confirmation. Unknown ETA and estimate qualifiers stay visible.

## Actions

Use compact icon buttons for known next steps. An action either sends through the MCP app or opens an HTTPS page:

    {"label":"Mark read","icon":"check","send":"Mark these messages as read."}
    {"label":"Open queue","icon":"arrow-right","href":"https://example.com/queue"}

Plain HTML cannot send messages. Use links there.
