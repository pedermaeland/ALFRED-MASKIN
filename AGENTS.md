# Code snapshots

The user requests a separate snapshot before site edits or reviews, not for basic questions.

- Before editing the site or reviewing its code, appearance, or behaviour, copy the current project code into a new folder under `snapshots/`.
- Name each folder with a unique UTC timestamp, for example `2026-10-28T20-00-00-1234567Z`.
- Include source files, assets, project configuration, and scripts. Exclude `snapshots/` itself, `.git/`, `node_modules/`, `info/`, `tmp/`, build output, and secrets such as `.env` files. Apply exclusions within copied directories too.
- Never overwrite an existing snapshot. If copying fails, report the failure before changing code.
- Do not take snapshots for basic questions, explanations, or conversation that do not involve a site edit or review. Updating these instructions alone does not require a snapshot.
- Take at most one snapshot per user-triggered edit or review turn. Do not create additional snapshots for tool calls or progress updates in the same turn.
- Keep `snapshots/` excluded from Git. Do not delete snapshots unless the user asks.
- This rule applies when an agent handles a message in this project; it is not an automatic background watcher.

# Readable formatting

- Keep code easy for the user to read and edit. Never compress rules or statements onto one line.
- CSS: use two-space indentation, one declaration per line, and put opening/closing braces on separate lines from declarations. Put each selector in a selector list on its own line.
- HTML: use four-space indentation and put nested elements on separate lines. Simple text-only elements may remain on one line. Preserve whitespace-sensitive content such as textarea values.
- Use blank lines between logical sections. Preserve descriptive comments.
- Do not reformat historical snapshots or third-party assets.
