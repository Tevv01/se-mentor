# Diff maps

How `/se-mentor:understand-diff` draws a diff as a picture. The map is there to help the
learner form and check their own model of the change. It is not a summary to read
instead of the code, so it always comes after the learner's prediction.

## Ground rules

- **Facts first.** Start from `diffmap.js facts`. Every node is a changed file or module
  from those facts. Draw an arrow only when you can point to the line in the diff (or
  in code you read) that creates it, and list that evidence under the map in the chat.
  If you can't back an arrow up, leave it out.
- **Imports are hints.** `importsAdded`/`importsRemoved` come from a pattern match.
  Confirm each one in the diff before drawing it.
- **Small enough to read.** At most about 25 nodes. When `hints.collapseToModules` is
  true, draw one node per module instead of per file. Excluded files (lockfiles,
  generated code) never get nodes; mention their count in the chat.
- **Maps never go in the learner state dir.** They name work files and functions.
  Write them to `mapsDir` from the facts output.

## Views

| View | When | Mermaid |
|---|---|---|
| **Change map** | Always | `flowchart LR` |
| **Structure: before → after** | When `hints.structureView` is true | `flowchart LR` |
| **Flow through the change** | When the learner asks, or offered once when the diff changes one request or job path end to end | `sequenceDiagram` |

Put all views for one diff in a single `.mmd` file, each starting with
`%% view: <title>`.

### Change map

- One `subgraph` per module (`subgraph m_orders_api["orders/api"]`), one node per file.
- **Ids**: every subgraph and node id is `m_<module>` or `n_<module>_<file>`, using only
  letters, digits and `_` (`n_orders_api_client`). The prefix avoids Mermaid keywords
  (`end`, `style`, `class`, `graph`...), and the module part keeps two `index.ts` nodes from
  silently merging.
- **Labels**: always double-quoted. Inside a label, never use `"`. Write `#quot;` instead.
- Node label: `"<file name> +<added> −<deleted>"`. Add `new` or `deleted` for added or
  removed files, `renamed from <old>` for renames, and `[T]` when `testChanged` is true.
- Colour each node with exactly one class, choosing the first that applies: `security`,
  `data`, `contract`, `dependency`, `config`, `test`, then `code`. Use the file's `tags`,
  plus your judgement from reading the diff (e.g. a changed public method signature is
  `contract`, a hand-written query is `data`). Write it as `node["label"]:::data`.
- Arrows: only between changed files, or from a changed file to an unchanged one it now
  depends on (label that node `"<name> (unchanged)"`). Use `==>` for a connection the
  diff adds, `-.->` for one it removes, and `-->` for an existing connection that matters
  to the change. Label arrows with the relation, always quoted: `|"calls charge()"|`,
  `|"imports"|`, `|"writes"|`. Unquoted labels with `(`, `[` or `"` break the diagram.

### Structure: before → after

Components (modules, services, layers) as nodes, and their dependencies as arrows.
Draw the "after" state, marking new dependencies `==>` and removed ones `-.->`. This is
the view that shows design drift: a controller that now talks to the database directly,
or a new dependency on an external client.

### Flow through the change

- `participant` per component on the path, at most about 6.
- Messages in order, at most about 12.
- Mark each changed step with `Note over <participant>: changed: <what>`. Mark new
  steps the same way, with `new:`.
- Never use `;` or `#` in messages or notes: Mermaid treats them as syntax.

## Rendering

1. Write the `.mmd` file to `<mapsDir>/<short-name>-<HHMMSS>.mmd`. The time suffix keeps an
   earlier map from being overwritten.
2. Run `node "<pluginRoot>/scripts/diffmap.js" render <file.mmd>`. It adds the colour
   classes and legend, writes an HTML page next to the file, and opens it in the browser.
3. Tell the learner the page has opened (or its path, if `opened` is false). Mention
   that the Mermaid source at the bottom of the page can be pasted into a GitHub PR.
4. If the learner says the diagram didn't render (no network, or the CDN is blocked),
   redraw the change map in the terminal: modules as boxes, files listed inside them
   with their counts and a risk word, and arrows drawn with `──>`.

## Example

```
%% view: Change map
flowchart LR
  subgraph m_orders_api["orders/api"]
    n_orders_api_handler["handler.ts +3 −1 [T]"]:::security
  end
  subgraph m_payments["payments"]
    n_payments_client["client.ts (unchanged)"]
  end
  subgraph m_db_migrations["db/migrations"]
    n_db_migrations_002["002_paid.sql +1 new"]:::data
  end
  n_orders_api_handler ==>|"calls charge()"| n_payments_client
```
