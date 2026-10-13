# Development contract

- Work in this existing checkout. Do not recreate the project or use a worktree unless the user requests one.
- Preserve the editor, presentation player, interactive buttons, media imports, ZIP backups and immediate cuts without CSS effects.
- User projects are confidential browser data. Do not upload imported media, add telemetry, or place real user files in Git/public assets without explicit authorization.
- Never clear/delete IndexedDB, reset the current project, or seed demos over an existing record to fix a problem. An unreadable or future-version record must remain untouched and produce an actionable error.
- Schema changes must bump the document version, add a non-destructive migration and verify older saved projects. Preserve unknown metadata during migration. Keep the existing database and store names unless a tested migration explicitly handles them.
- Restore ZIPs only after full validation, including media readability. Commit the current replacement and its previous-project checkpoint atomically. On failure retain both the stored and displayed old project.
- Keep optimistic revision checks for concurrent tabs and explicit storage/quota failure messages.
- A feature involving media or settings must extend ZIP import/export and test the real round-trip. Keep independent ZIP backups available even after a save conflict.
- Validate meaningful behavior with existing browser tests. `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:production` validates the built app under the configured headers in this environment. CI installs its own browser.
- Vercel Git deployments are suspended in vercel.json until privacy is verified. Do not activate production deployments or publish a publicly accessible site without the user's explicit confirmation. Verify authentication covers production and alternate URLs; security headers and private source repositories are not authentication.
- Future code changes should be reviewed through GitHub before integration into main. Keep the same production origin so browser data stays available; changing origins requires the user's ZIP transfer.
