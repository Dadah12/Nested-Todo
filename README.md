# Mobile Nested Todo (Premium)

A mobile-first, offline nested todo webapp with:
- Infinite nesting (children[]), clean recursion
- Auto-complete parents when ALL descendants are checked
- Done tab shows only **groups** (items with children) that are fully complete
- Search across main + nested
- LocalStorage persistence (auto-save)
- Drag & drop reorder (siblings only), touch-friendly
- CSV export + Print / Save as PDF
- Quick Add (paste with indentation) + Templates
- Footer branding: Built with ♥ by Dang (heart toggle)

## Run locally

```bash
npm install
npm run dev
```

## Deploy on GitHub Pages (recommended)

1) Push to GitHub (default branch: `main`)
2) In your repo: **Settings → Pages → Build and deployment**
3) Select: **Source = GitHub Actions**
4) Done. Every push to main auto-deploys.

> Note: this project uses `base: "./"` in Vite config so it works on GitHub Pages without editing repo name.

## Notes

- Parent checkbox toggles ALL descendants (nice for mobile).
- Indent is capped so 10+ levels still looks good on small screens.

## License

This project is licensed under **AGPL-3.0**.

Commercial licensing is available for closed-source or hosted use without AGPL obligations — see **COMMERCIAL.md**.
