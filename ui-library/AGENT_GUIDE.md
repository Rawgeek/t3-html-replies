# Reply UI

Start with [ELEMENT_INDEX.md](ELEMENT_INDEX.md), then open the closest sample.

## Reply contract

- Every T3 main-session message is one self-contained HTML page. Never append Markdown or plain text.
- Use a fixed four column grid at 1024px: one swimlane column and three flow columns. Two flow columns on tablets and one on phones. Use 8px gaps.
- Results and status use the Slim height (88px). Every reply section uses one shared Small height (184px). The swimlane is the one exception: it is a tall left column at least 376px high so five to seven steps stay readable.
- The renderer assigns every height; the JSON has no per-section size.
- Never use expandable text, disclosures, accordions, dropdowns, or hidden content.
- Keep every field inside its limit. When a field is full, add another visible block. Never enlarge a paragraph.
- Never show hashes, short commit IDs such as b611fca, UUIDs, tokens, or encoded IDs. Use the human referent, such as "PR 22687" or "the release branch".
- The renderer rejects unknown fields, overlong values, mixed section heights, too much visible text, and replies above the total limit.

## Required blocks

Every reply carries three things. The renderer rejects a reply that leaves one out.

1. A swimlane. Five to seven steps: at least two done, the current step, and at least two pending. The current step is the only waiting item and must carry its own progress, such as 62%. When that number equals overall progress, the rail keeps the meter and drops the number so the percentage appears once.
2. A changes block. What is done and what is still to do. A finished reply has no waiting or pending step and an empty to do list, so the rail, the changes, and Next None always agree.
3. Two to four milestones. They label the segments of the progress bar in the status strip.
4. At least two supporting blocks beside the swimlane. The renderer rejects a reply that would leave an empty cell in the grid.

The swimlane shows history, the current step, and future steps. The changes block shows the delivered and remaining work.

The swimlane sits in a tall left column. Supporting blocks fill the three flow columns beside it, and the renderer picks their spans so the flow never leaves a cell empty. Do not pad a reply with filler blocks.

## Reply JSON

Use the reply command from this directory:

    node ui.mjs reply data.json /absolute/path/reply.html

Waiting example: [reply-example.json](reply-example.json).

Completed example: [complete-example.json](complete-example.json).

Top-level fields:

| Field | Rule |
| --- | --- |
| title | Required, 1 to 64 characters |
| state | Required: complete, working, waiting, or blocked |
| summary | Optional, up to 80 characters |
| results | Optional, 1 to 4 facts. Completed replies need at least one. Label 12, value 8, note 18. |
| sections | Required, 4 to 8 visible blocks: swimlane, changes, and at least two supporting blocks |
| progress | Up to 12 characters. Completed replies must show 100%. |
| next | Up to 18 characters |
| eta | Up to 16 characters |
| wake | Up to 20 characters |
| zone | Optional IANA timezone, up to 32 characters. Defaults to the rendering machine. Set it only for fixtures and examples that must be identical everywhere. |
| milestones | Required, 2 to 4 labels with 8 characters each. They label the progress segments. |
| actions | Optional, 1 to 3 buttons. Label up to 14 characters. Exactly one HTTPS link or send message up to 400. |

A result fact has a label of 12 characters, a value of 8, and an optional note of 18.

The renderer rejects replies above 1200 visible characters.

## Section blocks

The page is always a four column grid at 1024px: the swimlane fills one column and three flow columns hold the supporting blocks. The renderer decides each block span and the flow never leaves a cell empty. Every section is a fixed 184px tile, and the renderer rejects a size or span field.

The flow fills every cell: two blocks stack full width, three use spans of 2, 1, and 3, and four use three single cells plus one full row. Up to seven blocks each get a span that fills the row. Below 900px the flow drops to two columns and pairs the last odd block across both. Below 620px it uses one column. Leave the arrangement to the renderer.

Every block stays fully visible. Notes wrap inside cards; no block hides content to fit. Content keeps its natural height and centers inside the fixed tile, so padding stays even instead of stretching rows apart.

The type is optional. When it is missing the renderer picks the block from the shape: done and todo lists become changes, columns and rows become a table, before and after become compare, label and value become facts, five or more timed steps become a swimlane, fewer state items become cards, and plain strings become a list.

| Type | Fields and limits |
| --- | --- |
| facts | title 24; 2 to 4 items with label 12, value 8, note 18 |
| list | title 24; 2 to 3 items, 48 characters each |
| table | title 24; 2 columns and 2 to 3 rows; heading 14, cell 18. A cell may be a send action. A row may be {cells, detail} for a hover tooltip. |
| swimlane | title 24; 5 to 7 items; label 30, note 32, time 8; state done, waiting, or pending. Only the waiting item may carry progress, such as 62%. |
| bars | title 24; 2 to 3 items; label 18, note 22, value up to 12 characters |
| changes | title 24; done and todo lists with up to 3 items of 18 characters each. Two items minimum together. Only one changes block is allowed. |
| compare | title 24; 1 to 3 items; label 18, before 10, after 10, delta 12. Each item draws a before bar and an after bar on one shared scale. |
| cards | title 24; 2 to 3 items; label 12, note 18; state done, waiting, pending, or blocked. Each card shows a status pill. |

When a block cannot hold the next fact, split it into another block. Do not shorten evidence into vague words.

Numbers appear with a visual. A before and after pair uses compare, a single measurement uses facts, and several comparable values use bars. Never leave a comparison as bare text.

## Completion

- Lead with the verified result, implemented changes, and useful numbers.
- Use 3 or 4 short result facts when available. Put supporting detail in additional blocks.
- Keep status secondary. Show Progress, Next, ETA, and Wake. Keep the progress bar inside the Progress tile, under the number.
- Reserve 100% for the full verified outcome. Never claim an unconfirmed wake.
- A scheduled wake includes its time and timezone.

## Workflow

Fast path, three commands from this ui-library directory:

    node ui.mjs new /task/output/reply.json
    node ui.mjs check /task/output/reply.json
    node ui.mjs reply /task/output/reply.json /task/output/reply.html
    node ui.mjs guard /task/output/reply.html

1. Run new to write a valid starter, then fill the fields. No guide reading needed for a routine reply.
2. Run check after each edit. It prints one line: valid, or the exact field that failed.
3. Render, then run guard. It rejects fragments and shells. Preview at 728px and 390px only when the reply is new or changed layout.
4. Send the absolute dataPath to the t3-html-replies render_reply MCP tool when it is available. Otherwise use T3's HTML render tool. Keep the HTML source out of model context.

Read [ELEMENT_INDEX.md](ELEMENT_INDEX.md) only when the starter blocks do not fit the content.

## Actions

Demo buttons in examples are local. A real action needs a supported host transport and existing authority. Use icons for Send, Run, Parallel, Save, and Download.

The native MCP app turns action.send into a button. T3 asks before sending its message. Plain HTML renders cannot send, so those replies use action.href only.

Action buttons stay enabled after a send, so the same action can be repeated.

A row may carry a hover detail:

    {"cells":["Firebase web","Delete"],"detail":"Last used 30 Dec 2025. Redirects to the Board app."}

The detail allows 260 characters and stays out of the visible character count. The row shows a help cursor and a hover highlight.

A table cell may hold one compact action instead of text:

    {"label":"Reply","icon":"message-square","send":"Reply to this mail."}

Use this to give each row its own button. The action label allows 14 characters and the send value 400. The send text stays out of the visible character count.

    {"actions":[
      {"label":"Mark read","icon":"check","send":"Mark the messages in this reply as read."},
      {"label":"Ignore once","icon":"circle-x","send":"Ignore this update once. Keep the sender for future updates."},
      {"label":"Ignore forever","icon":"bell-off","send":"Ignore this sender forever, but keep security, billing, school, customer, and internal mail."}
    ]}

Source: component logic is in render-reply.mjs and components.mjs. Rebuild with node build.mjs; check with node verify.mjs.
