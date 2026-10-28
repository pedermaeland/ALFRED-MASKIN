# Code snapshots

The user requests a separate snapshot of the code for every new message they send.

- At the start of each turn responding to a new user message, before editing project files, copy the current project code into a new folder under `snapshots/`.
- Name each folder with a unique UTC timestamp, for example `2026-10-28T20-00-00-1234567Z`.
- Include source files, assets, project configuration, and scripts. Exclude `snapshots/` itself, `.git/`, `node_modules/`, `info/`, `tmp/`, build output, and secrets such as `.env` files. Apply exclusions within copied directories too.
- Never overwrite an existing snapshot. If copying fails, report the failure before changing code.
- Take snapshots even when the message only asks a question. Do not create additional snapshots for tool calls or progress updates in the same turn.
- Keep `snapshots/` excluded from Git. Do not delete snapshots unless the user asks.
- This rule applies when an agent handles a message in this project; it is not an automatic background watcher.
