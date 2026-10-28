# ALFRED MASKIN: editable demo

Vanilla HTML, CSS and JavaScript. No packages, backend, login or external embeds.

## Open it

Use VS Code Live Server on `index.html`, or another local static server. Keep the same browser and server address so pages share their saved data. Avoid double-clicking individual HTML files: file-URL storage can differ per page/browser. This is a development server, not a backend or cloud service.

## What to edit

Each screen is a real HTML document with normal links:

- `index.html`: rounds and previous runs.
- `kunder.html`: customer list and search.
- `kunde.html`: customer form. Its HTML template contains the repeated address fields.
- `runde.html`: round name, addresses and ordering controls.
- `arbeid.html`: work form and previous/next navigation.
- `historikk.html`: work history and filters.
- `data.html`: backup/export controls and storage information.
- `style.css`: shared theme variables and layout.
- `js/data.js`: fictional starter data, used only when no saved data exists.
- `js/storage.js`: validation and persistence, unchanged from the previous version.
- `js/app.js`: connects stored data to the HTML and handles saves. Repeated customer/round/history items still need JavaScript, but page layouts and forms live in HTML.

The header and navigation are deliberately repeated in each HTML file so there is no template framework or build step. Edit them in each page when changing the shared menu. Query parameters identify the selected customer/run/stop; they contain IDs, not the database itself.

Separate pages are compatible with offline use. A future service worker must cache every HTML page plus shared scripts, CSS and images. That offline installation is not implemented yet; it needs HTTPS (or localhost during development) and testing on the actual phone. Browser Back/Forward works, with refreshed data to avoid displaying stale records.

## Working demo features

- Create/edit customers and multiple addresses; choose services per address.
- Search names/addresses, archive/reactivate customers, view their history.
- Create/edit rounds, choose addresses and move stops up/down.
- Start independent runs, continue them later, register work or skip stops.
- Adjust work time, add a note or duration; filter the overall log.
- Retain demo data on reload; export JSON and CSV; validate and restore JSON.

Customers and addresses have stable IDs. Each run copies the stop order and display details. Work records retain names/addresses at the time of registration. Editing a customer or round does not rewrite previous runs or work records. Archived customers are excluded from new runs; their old history remains.

Saving clones the current data and writes it before replacing the in-memory state. Work completion and its record are written together. A write failure leaves the work form on screen. Unreadable stored data blocks writes instead of silently replacing it with demo data.

## Deliberate limits

- Fake data only. This starter is not ready for business use.
- Uses localStorage for a small demo. Move persistence to IndexedDB before growing the app.
- No service worker, installable PWA, guaranteed offline reopening or sync yet.
- One tab at a time. Concurrent tabs are not coordinated and could overwrite changes.
- Restore replaces the entire local dataset; it does not merge. Export a backup first.
- Address deletion and work-record correction are not implemented. Archive customers instead.
- Moving away from an unsaved form discards the draft.
- No invoice, shop, public website, maps or customer login.

Before real use, confirm the phone/browser, implement offline installation, test airplane-mode reopening, restore a full backup into a separate installation, and check existing records after updates. Local saving and a backup are separate things.

## Quick check

Start the demo round. Save the first stop, skip the second, and simply view the third. The log should contain exactly one record. Reload, open the old run, then start a new run: the original record must remain. Try customer editing, a second address and manual round ordering next.

## Snapshots

`snapshots/` contains timestamped source copies taken before changes for each new user message handled by the coding agent. These are excluded from Git and do not contain browser work records. Export JSON inside the app to back up those records.
