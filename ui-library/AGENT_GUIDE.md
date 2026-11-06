# Reply UI

Start with [ELEMENT_INDEX.md](ELEMENT_INDEX.md), then open the closest sample.

## Reply contract

- Every T3 main-session message is one self-contained HTML page. Never append Markdown or plain text.
- Use a dense grid: 3 columns at 1024px, 2 below 620px, 1 on phones. Use 8px gaps.
- Results and status use the Slim height (88px). Every reply section uses one shared Small height (184px). The renderer assigns the height; the JSON has no per-section size.
- Medium and Tall remain library presets for standalone elements and reports. Reply sections stay at 184px so every row aligns.
- Never use expandable text, disclosures, accordions, dropdowns, or hidden content.
- Keep every field inside its limit. When a field is full, add another visible block. Never enlarge a paragraph.
- Render opaque machine values internally. Do not show hashes, UUIDs, tokens, or long encoded IDs.
- The renderer rejects unknown fields, overlong values, mixed section heights, too much visible text, and replies above the total limit.

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
| results | Optional, 1 to 4 facts. Completed replies need at least one. |
| sections | Optional, 1 to 8 visible blocks |
| progress | Up to 12 characters. Completed replies must show 100%. |
| next | Up to 18 characters |
| eta | Up to 16 characters |
| wake | Up to 20 characters |
| actions | Optional, 1 to 3 buttons. Label up to 14 characters. Exactly one HTTPS link or send message up to 400. |

A result fact has a label of 14 characters, a value of 14, and an optional note of 24.

The renderer rejects replies above 1200 visible characters.

## Section blocks

Every section is a fixed 184px tile. Use 2 to 4 items. Every section starts at one grid column. The renderer rejects a size field on a section.

The grid fills the last row automatically. A lone final block spans the full width; two leftover blocks share 2 plus 1. Never set a span.

| Type | Fields and limits |
| --- | --- |
| facts | title 24; 2 to 4 items with label 14, value 14, note 24 |
| list | title 24; 2 to 3 items, 48 characters each |
| table | title 24; 2 columns and 2 to 3 rows; heading 14, cell 18 |
| timeline | title 24; 2 to 3 items; label 30, note 32, time 8; state done, waiting, or pending |
| bars | title 24; 2 to 3 items; label 18, note 22, value up to 12 characters |

When a block cannot hold the next fact, split it into another block. Do not shorten evidence into vague words.

## Completion

- Lead with the verified result, implemented changes, and useful numbers.
- Use 3 or 4 short result facts when available. Put supporting detail in additional blocks.
- Keep status secondary. Show Progress, Next, ETA, and Wake. Keep the progress bar inside the Progress tile, under the number.
- Reserve 100% for the full verified outcome. Never claim an unconfirmed wake.
- A scheduled wake includes its time and timezone.

## Workflow

1. Read this guide. Apply your local unslop rules if installed.
2. Choose a sample from [ELEMENT_INDEX.md](ELEMENT_INDEX.md). Run node ui.mjs show ID for use and avoid guidance.
3. Write compact JSON. Split information across visible blocks. Keep every field short.
4. Save under the task output folder, never /tmp. The CLI creates folders and prints the absolute path.
5. Preview at 728px and 390px. Fix overflow, clipping, gaps, or unclear status.
6. Use the t3-html-replies render_reply MCP tool with htmlPath when available. Otherwise use T3's HTML render tool. Do not print the HTML source into model context.

## Actions

Demo buttons in examples are local. A real action needs a supported host transport and existing authority. Use icons for Send, Run, Parallel, Save, and Download.

The native MCP app turns action.send into a button. T3 asks before sending its message. Plain HTML renders cannot send, so those replies use action.href only.

    {"actions":[
      {"label":"Mark read","icon":"check","send":"Mark the messages in this reply as read."},
      {"label":"Ignore once","icon":"circle-x","send":"Ignore this update once. Keep the sender for future updates."},
      {"label":"Ignore forever","icon":"bell-off","send":"Ignore this sender forever, but keep security, billing, school, customer, and internal mail."}
    ]}

Source: component logic is in render-reply.mjs and components.mjs. Rebuild with node build.mjs; check with node verify.mjs.
