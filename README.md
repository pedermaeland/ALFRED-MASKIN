# ALFRED MASKIN

Open the app through a static web server. Use localhost for testing on the computer and HTTPS for use on a phone. Keep the same site address for normal use because each browser keeps its own database for each site.

On the phone, open **Data** with a connection and wait for the offline setup message. Then close and reopen the app in airplane mode and try a complete round with fictional data. Export a backup and restore it in a separate browser profile before relying on the app. Restoring replaces the data in that browser. Keep the exported file somewhere outside the app.

## Editing the app

The screens are sections in `index.html`. Links use a section's ID, for example `#kunder`, or include a record ID when opening details. `style.css` contains layout and colors. `continuous-corners.css` contains the SVG masks for card corners.

- `js/navigation.js` switches screens and runs the opening and back animations.
- `js/press.js` handles touch and pointer feedback.
- `js/storage.js` opens IndexedDB and saves related changes together. On first open it carries over customers entered in the previous prototype on the same site address.
- `js/app.js` shares screen helpers and renders the overview.
- `js/kunder.js` handles customers, addresses, search, and archiving.
- `js/round.js` handles saved round templates, stop order, and new runs.
- `js/arbeid.js` handles planned jobs, work registration, and history.
- `js/backup.js` handles backup files, CSV, and offline setup.
- `sw.js` caches the app files. Update the cache version in this file when releasing changed app files.

A round template stores address IDs. Starting a run makes a separate copy of its stop order. Saving a visit and completing its stop happen together. Older visits retain the customer name and address recorded at the time.

Data stays in the current browser. Use backup export and restore to move it between devices.
