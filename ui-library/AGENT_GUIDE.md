# Reply UI

Start with [ELEMENT_INDEX.md](ELEMENT_INDEX.md), then open the closest sample.

## Reply contract

- Every T3 main-session message is one self-contained HTML page. Never append Markdown or plain text.
- Use a fixed bento grid at 1024px: five columns. Stages hold the left column for every row, Progress runs wide beside them with the ETA on its right, Done and To do sit under Progress, and the ticket blocks fill the row beneath. Use 8px gaps.
- Progress uses the Slim height (88px). Every reply section uses one shared Small height (184px). The swimlane is the one exception: it is a tall left column at least 376px high so five to seven steps stay readable.
- The renderer assigns every height; the JSON has no per-section size.
- Never use expandable text, disclosures, accordions, dropdowns, or hidden content.
- Keep every field inside its limit. When a field is full, add another visible block. Never enlarge a paragraph.
- Never show hashes, short commit IDs such as b611fca, UUIDs, tokens, or encoded IDs. Use the human referent, such as "PR 22687" or "the release branch".
- The renderer rejects unknown fields, overlong values, mixed section heights, too much visible text, and replies above the total limit.

## Required blocks

Every reply carries three things. The renderer rejects a reply that leaves one out.

1. A swimlane. Five to seven steps: at least two done, the current step, and at least two pending. Every step carries a clock time; the renderer derives how long each step took from the previous time and prints it under the clock. The current step is the only waiting item and must carry its own progress, such as 62%. When that number equals overall progress, the rail keeps the meter and drops the number so the percentage appears once. Never write state words such as Done, Now, or Later: the dot colour already shows the state.
2. A changes block. What is done and what is still to do. Each item has a short title and a description. A finished reply has no waiting or pending step and an empty to do list.
3. Two to four milestones. They label the segments of the progress bar.
4. At least two supporting blocks beside the swimlane. The renderer rejects a reply that would leave an empty cell in the grid.

The swimlane shows history, the current step, and future steps. The changes block shows the delivered and remaining work.

The swimlane fills the left column from top to bottom. Progress runs long across the top of the wide middle area with the ETA at its right edge, and supporting blocks fill the middle. The renderer picks every span so no cell stays empty. Do not pad a reply with filler blocks.

The title comes first, then a one-line summary, then the grid. Result facts open the middle area, above the supporting blocks.

Done and To do are separate tall blocks under Progress, each item showing a title over its description. When the reply is complete, only Done renders and it spans the row.

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
| sections | Required, 3 to 8 visible blocks: swimlane, changes, and at least one flow block |
| progress | Up to 12 characters. Completed replies must show 100%. |
| eta | Up to 16 characters |
| wake | Up to 20 characters. Renders as a bell chip in the header with the event it is subscribed to. Use Not armed when nothing is scheduled; the chip then disappears. |
| milestones | Required, 2 to 4 labels with 8 characters each. They label the progress segments. |
| actions | Optional, 1 to 3 buttons. Label up to 14 characters. Exactly one HTTPS link or send message up to 400. |

A result fact has a label of 12 characters, a value of 8, and an optional note of 18.

The renderer rejects replies above 1200 visible characters.

## Section blocks

The page is one bento grid at 1024px. Stages hold the left column, Progress runs wide beside them with the ETA inside it, Done and To do sit under Progress, and the ticket blocks fill the row beneath. The renderer decides each block span and never leaves a cell empty. Every block is a fixed height and the renderer rejects a size or span field.

The middle fills every cell: one block spans both columns, two sit side by side, three use two cells then a full row, and four use two rows of two. Below 900px the grid stacks with Progress first, then stages, done and to do, and the middle blocks; below 620px the middle uses one column. Leave the arrangement to the renderer.

Every block stays fully visible. Notes wrap inside cards; no block hides content to fit. Content keeps its natural height and centers inside the fixed tile, so padding stays even instead of stretching rows apart.

The type is optional. When it is missing the renderer picks the block from the shape: done and todo lists become changes, columns and rows become a table, before and after become compare, label and value become facts, five or more timed steps become a swimlane, fewer state items become cards, and plain strings become a list.

| Type | Fields and limits |
| --- | --- |
| facts | title 24; 2 or 4 items with label 12, value 8, note 18. Three items leave a hole, so the renderer rejects them. |
| list | title 24; 2 to 3 items, 48 characters each |
| table | title 24; 2 columns and 2 to 3 rows; heading 14, cell 18. A cell may be a send action. A row may be {cells, detail} for a hover tooltip. |
| swimlane | title 24; 5 to 7 items; label 30, note 32, time 8 and required; state done, waiting, or pending. Only the waiting item may carry progress, such as 62%. Step duration is derived from consecutive clock times. |
| bars | title 24; 2 to 3 items; label 18, note 22, value up to 12 characters |
| changes | title 24; done and todo lists with up to 3 items each, every item {title 28, description 52}. Two items minimum together. Only one changes block is allowed. |
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
