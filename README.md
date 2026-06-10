# @amatech/kit

Shared platform pieces for Amazonia Tech products — extracted from **Planta**
(the most evolved copies) after the same patterns were built three times across
Vine, Planta and the company site. Use this as the starting point for product #3
instead of copying from a sibling app again.

## What's inside

| Module | Contents |
| --- | --- |
| `@amatech/kit` | `createAccess` (admin/comp email gating), `money/number/percent/date` Intl formatters, `fetchFxRate`/`amountInHome` (ECB via Frankfurter, contract↔home convention), curated `COUNTRIES` + helpers, RFC-4180 `toCsv`, `rentalYield` (occupancy + annualized yields) |
| `@amatech/kit/components/*` | `Toast` (provider + hook), `Modal`, `ThemeToggle` (param storage key), `PWARegister`, `InstallPWAButton` — Tailwind-styled, `lucide-react` icons; Toast success accent themes via `--kit-accent` |
| `@amatech/kit/supabase/*` | `admin.ts` — service-role client factory (returns `null` until `SUPABASE_SERVICE_ROLE_KEY` is set, so features degrade gracefully) |
| `@amatech/kit/testing/*` | `localeParityProblems` — assert every locale JSON has exactly the reference key set (fail CI on drift) |

## Adopting in a new product

This is an **internal source package** — no build step; the consuming Next.js
app compiles the TypeScript directly.

1. Add it (pick one):
   - `npm i github:mkswd/amatech-kit` (private repo; needs git auth), or
   - `git submodule add … packages/kit` + `"@amatech/kit": "file:packages/kit"`.
2. Ensure `transpilePackages: ['@amatech/kit']` in `next.config`.
3. Tailwind: add the kit to `content` so its classes are generated:
   `'./node_modules/@amatech/kit/src/**/*.{ts,tsx}'` (or the submodule path).
4. Set `--kit-accent` in your global CSS to the brand color; pass your theme
   storage key to `ThemeToggle`.

## Syncing Vine & Planta

Deliberately **not** rewired yet (running apps; the swap is mechanical but
should be done attentively, one module at a time, starting with the pure libs).
Until then this repo is the canonical copy: improve here first, port outward.

## Conventions baked in

- FX: `fx_rate` = contract-currency units per **1 home unit**; home value =
  `amount / fx_rate`, rounded to cents in exactly one place (`amountInHome`).
- Access lists are comma-separated email envs with code-level defaults.
- Service-role client is nullable — absence of the key disables the feature
  instead of crashing the build.
