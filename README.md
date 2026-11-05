# UnitFlow

Portfolio demo for dealership inventory. All 128 starting records are fictional. Edits and added units stay in this browser's localStorage. Reset demo data on the dashboard to restore the sample inventory. There is no backend or publishing integration.

Use Node 22.12+ and pnpm: `pnpm install --frozen-lockfile`, `pnpm dev`, `pnpm test`, `pnpm build`. Vercel serves the Vite `dist` output and rewrites application routes to the SPA.

Try Needs attention → TR-1042 → enter a price → Save changes. The unit leaves the attention list and the dashboard counts update. Blank specifications are allowed as incomplete drafts; entered values and stock numbers are validated. The demo uses feet, pounds and USD, with type-specific fields.
