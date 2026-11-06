# T3 HTML replies

A Codex skill and UI kit for compact HTML replies in T3 Code.

![Reply examples](screenshots/overview.png)

The renderer turns short JSON into one self-contained HTML page. Replies use a dense bento grid, minimum-height blocks, slim result and progress tiles, and hard limits on text. There are no expandable sections, hover-only details, truncated text, or hidden content.

## What it does

- Four-column grid at 1024px: Stages hold the left column; Progress and evidence span the right three columns; Done, To do, and one supporting block share the next row.
- Progress and result facts use 88px minimum tiles. Supporting blocks use 184px minimum; a trailing row containing only facts, cards, or list items uses 88px minimum. Stages use 376px minimum. Rows grow only when accepted content needs another line. Below 900px the grid stacks with natural heights.
- 8 sections max, 1,200 visible characters, and three or four required result facts.
- Every reply carries five or six clocked stages, one changes block, and two to four progress milestones. An unfinished reply has both Done and To do lists; a complete reply has only Done.
- Numbers sit in a visual: compare bars for before and after, facts for single values, bars for groups.
- The renderer picks each block span, so the flow fills every cell with no orphan blocks or holes.
- Progress shows one segment per milestone, labelled under the track.
- The renderer rejects long fields, unknown fields, hidden table details, invalid clocks, missing descriptions, boolean bar values, hashes, and opaque IDs.

## Install

Clone the repo into your Codex skills directory:

```sh
git clone https://github.com/Rawgeek/t3-html-replies.git ~/.codex/skills/t3-html-replies
```

Then use `$t3-html-replies` in a T3 or Codex session.

Render an example:

```sh
cd ~/.codex/skills/t3-html-replies
node ui-library/ui.mjs reply ui-library/reply-example.json output/reply.html
```

Open `ui-library/index.html` for the full gallery.

Render a reply through the MCP tool with the JSON path, not HTML:

    {"dataPath": "/absolute/path/reply.json"}

## Optional MCP actions

The skill can use T3's `html_render` directly. For sendable action buttons, register the bundled stdio server in `~/.codex/config.toml`:

```toml
[mcp_servers.t3_html_replies]
command = "node"
args = ["/absolute/path/to/t3-html-replies/scripts/mcp-server.mjs"]
```

Restart the provider session after adding it.

## More examples

| Waiting reply | Mobile |
| --- | --- |
| ![Waiting reply](screenshots/overview.png) | <img src="screenshots/reply-mobile.png" width="260" alt="Mobile reply"> |

![Component gallery](screenshots/gallery.png)

Preview images are generated from the current renderer, so they cannot drift from the code.

## Layout

```
SKILL.md                 Skill entrypoint
agents/openai.yaml       Skill metadata
assets/mcp-app.html      Native MCP app shell
scripts/                 MCP server, self-test, preview capture
ui-library/              CSS, renderer, validator, gallery, examples
hooks/pre-commit         Regenerates README previews
screenshots/             Generated README previews
```

Inside `ui-library/`:

- `AGENT_GUIDE.md`: schema, limits, and layout rules.
- `ELEMENT_INDEX.md`: tree of all 60 examples.
- `index.html`: visual gallery.
- `render-reply.mjs`: validated reply renderer.
- `library.css`: shared styles and minimum heights.
- `verify.mjs`: validation and generated-file checks.
- `reply-example.json`, `complete-example.json`: starting points.

## Previews

The pre-commit hook rebuilds the library, runs verification and the MCP self-test, then regenerates `screenshots/overview.png`, `screenshots/reply-mobile.png`, and `screenshots/gallery.png`. It refuses to run when library inputs have unstaged changes, so previews always match the staged snapshot. It stages only generated outputs:

    git config core.hooksPath hooks
    node scripts/previews.mjs

Set `CHROME_PATH` when Chrome lives elsewhere. Skip it with `git commit --no-verify`.

## Develop

Use Node 22 or newer. Preview capture also needs Chrome; set `CHROME_PATH` when it is not in the default macOS location.

```sh
cd ~/.codex/skills/t3-html-replies
node ui-library/build.mjs
node ui-library/verify.mjs
node scripts/selftest.mjs
node scripts/layout-check.mjs
```

Generated gallery files, snippets, logic files, and preview templates are checked in so the repo works offline.

## License

MIT
