# DACORIS — Project Instructions

## Stack
- Frontend: Next.js (App Router, JS not TS) + MUI (not Tailwind), in `frontend/`.
- Backend: Python, DB: Postgres (see `backend/`).
- i18n: custom system in `frontend/lib/i18n/` — 4 locales: `en`, `sw` (Swahili), `fr` (French), `ar` (Arabic, RTL).

## Translation / i18n system
- Locale registry: `frontend/lib/i18n/locales.js` (`LOCALES`, `DEFAULT_LOCALE = 'en'`).
- Dictionaries: `frontend/lib/i18n/translations/{en,sw,fr,ar}.js`, each exporting a single nested object
  (namespaces like `about`, `login`, `privacyPolicy`, `termsOfService`, ...). All four files must keep
  matching namespace/key structure — `en` is the reference/fallback.
- Provider: `LanguageProvider` (`frontend/contexts/LanguageContext.js`) wraps the whole app in
  `app/providers.js`. It sets `document.documentElement.dir` automatically (`rtl` for Arabic), so pages
  don't need manual RTL handling.
- Usage in a component: `const { t } = useLanguage(); const value = t('namespace.key');`
  `t()` does a dot-path lookup and can return whole objects/arrays (not just strings) — e.g.
  `t('privacyPolicy')` returns the full `{ title, sections: [...] }` object, useful for data-driven pages.
  Missing keys in a non-English locale silently fall back to the English value, so it's safe to ship a
  page in English first and backfill `sw`/`fr`/`ar` later.
- The navbar's language switcher (`components/Navbar.js`) is global — new pages don't need their own
  language picker.

## Pattern: adding a new static/legal page (About, Privacy Policy, Terms of Service, ...)
1. Write the English copy as a structured object in `en.js` under a new top-level namespace (e.g.
   `termsOfService: { title, sections: [{ title, paragraphs: [...] } | { title, bullets: [...] }] }`).
   Insert it next to the other page namespaces (after `about`, before `reviewer`) — check the same
   insertion point exists in `sw.js`/`fr.js`/`ar.js` before editing them (search for the same anchor
   string, e.g. `reviewer: {`, since line numbers drift between locale files).
2. Build `frontend/app/<route>/page.js` as a client component that calls `useLanguage()` and
   `t('namespace')`, then maps over `sections` rendering `paragraphs` and/or `bullets`. Reuse the visual
   pattern already established in `app/privacy-policy/page.js` and `app/terms-of-service/page.js`
   (teal `COLORS.teal` section headers, callout box at the top, MUI `Box`/`Container`/`Typography`).
   Colors come from `COLORS` in `contexts/ThemeContext.js` (`COLORS.teal`, `COLORS.amber`, `COLORS.slate`, ...).
3. Wire up navigation (e.g. `components/Footer.js` links) using `next/link`.
4. When asked to translate, mirror the exact same namespace/section structure into `sw.js`, `fr.js`,
   `ar.js` — same section count and key names, only the string values change. Verify section counts
   match across locales, e.g. `grep -c "title: '\d\+\. "` per file.
5. Sanity-check the edited translation files parse (they're plain JS `export default` objects) before
   calling the work done — a stray unescaped `'` inside a single-quoted string is the most common break;
   prefer wrapping strings containing apostrophes in double quotes.

## Notable existing static pages
- `app/about/page.js` — marketing/about page (hero, features, lifecycle diagram).
- `app/privacy-policy/page.js` — Privacy Policy (17 sections), teal callout box.
- `app/terms-of-service/page.js` — Terms of Service (23 sections), amber "Contract hierarchy" callout box.
- `app/page.js` — landing page hero (uses `public/banner.jpg`, "Get Started" → `/login`).

## Conventions
- JS, not TS. MUI, not Tailwind CSS.
- Reuse `COLORS` from `ThemeContext` instead of hardcoding hex colors.
- Keep new pages as client components (`'use client'`) matching the rest of the app's marketing pages.
