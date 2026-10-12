# Updating the public website

This repository hosts the public presentation of **Diablo 1 HD — Returns from Darkness**. Game development currently happens in a separate local workspace. Public multiplayer is not available yet.

1. Edit `site/locales.json` and `site/locales-extra.json` for the 14 supported languages. Keep progress claims aligned with verified game development.
2. Update links, version and date in `site/site-config.json`.
3. Run `python site/build.py` and `python site/validate.py` using Python 3.12 or later.
4. Copy the generated `github-public/README.md` to `README.md` and the generated translated documents from `github-public/docs` to `docs`.
5. Commit the generated `site/dist` together with its source changes. Vercel publishes that static directory.

Keep `community-bot/translations.json` synchronized with the merged locale files when updating progress claims. The bot runs locally and is excluded from Vercel deployment uploads.

To preview locally, run `python site/preview.py` and open http://127.0.0.1:8096/. Close any existing preview on that port first.

Website: https://returns-from-darkness.vercel.app/

Community: https://discord.gg/S9VVaBXwDk

Please read `NOTICE.md` before reusing assets. Outreach documents are drafts and must not be posted without the project owner's authorization. Never commit credentials, original game archives, player data or local runtime files.
