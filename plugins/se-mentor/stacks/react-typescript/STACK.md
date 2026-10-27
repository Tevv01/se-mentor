---
name: react-typescript
description: React frontends in TypeScript. Vite or Next.js, a router, TanStack Query, forms, Vitest or Jest with React Testing Library, and Playwright.
detect: 'package.json ~ "react"'
---

# React and TypeScript (Vite, Next.js)

React 19 (19.3) and Next.js 16 (16.4, Active LTS) are current, as are Vite 8 and React
Router 8. Client codebases still often run React 18, Next.js 14 or 15 (often on the
Pages Router), React Router 6 or 7, or Create React App (deprecated in February 2025).
Next.js 14 is out of support, and Next.js 15 has reached the end of its two-year
Maintenance LTS window (released October 2024), so projects on either need an upgrade
plan. Check `package.json` before trusting any API an
agent suggests.

## Tooling and commands

- Use the lockfile's package manager. With `npm run`, put `--` before tool flags.
- Dev and build: `vite`, `vite build`, `vite preview`; or `next dev`, `next build`,
  `next start`. Vite doesn't type-check, so its template builds with
  `tsc -b && vite build`. `next build` type-checks; Next.js 16 dropped its lint step.
- Type-check: `npx tsc -b` in Vite projects (their root `tsconfig.json` has
  `"files": []`, so `tsc --noEmit` there checks nothing), otherwise `npx tsc --noEmit`.
  In Next.js 15.5+: `next typegen && tsc --noEmit`, so route types exist.
- Lint: `npx eslint .` with `eslint-plugin-react-hooks`, Biome or oxlint.
- One unit test: `npx vitest run src/cart/cart.test.tsx -t "removes the last item"`, or
  `cart.test.tsx:42` for a line (`npx vitest` alone watches). Jest:
  `npx jest src/cart/cart.test.tsx -t "removes the last item"`.
- One Playwright test: `npx playwright test e2e/pay.spec.ts:42` or `-g "pays"`, plus
  `--ui` or `--debug`. `npx playwright show-trace <zip>` opens a failed trace.
- Bundle analysis: `rollup-plugin-visualizer` (Vite), `npx next analyze` (Next 16.1+).
- Dependencies: `npm audit --omit=dev` for what ships, `npm audit` to include build
  tools, `pnpm audit --prod`. `npm audit fix --force` can install breaking majors.
- React DevTools: Components shows props, state, hooks and which component rendered an
  element. Profiler, with "Record why each component rendered" on, says why.
  `@tanstack/react-query-devtools` shows the cache. Server code: `next dev --inspect`.

## Idioms and conventions

- **Components and hooks**: pure during render; hooks only at the top level, never in
  conditions or loops. Don't mutate state or props, or nest component definitions. In
  React 19, `ref` is a normal prop. With React Compiler (`babel-plugin-react-compiler`)
  on, don't hand-add `useMemo` and `useCallback` everywhere, as agents tend to.
  `eslint-plugin-react-hooks` 7+ has the compiler rules in `recommended`.
- **State placement**: local `useState` first, lifted to the closest common parent when
  siblings share it. Compute what can be derived. Shareable view state (filters, page)
  goes in the URL. Context is for values that rarely change (theme, user). Server state
  lives in a cache (TanStack Query, SWR, router loaders), not in `useState` or Redux.
- **Effects** synchronize with external systems (subscriptions, timers, browser APIs).
  Logic caused by a user action goes in the event handler. Effects that subscribe return
  a cleanup; StrictMode remounts in development to expose a missing one.
- **Data fetching (TanStack Query v5)**:
  `useQuery({ queryKey: ['order', id], queryFn: ({ signal }) => getOrder(id, signal) })`.
  Everything the `queryFn` uses goes in the key, mutations invalidate what they change,
  and the UI handles loading, error and empty states.
- **Forms**: React Hook Form with a Zod schema (`zodResolver`), or React 19
  `<form action>` with `useActionState`. Client validation is a convenience; the server
  validates again. Link errors to fields with `aria-invalid` and `aria-describedby`.
- **Accessibility**: native elements first (`<button>`, `<a href>`, `<label htmlFor>`),
  headings in order, `alt` text, keyboard access and visible focus. Take dialogs and
  menus from a headless library (Radix, React Aria). Lint with `eslint-plugin-jsx-a11y`.
  Agents often write `<div onClick>`, icon buttons with no accessible name, placeholders
  instead of labels, and `outline: none` with no focus style.
- **Server and Client Components (App Router)**: Server Components are the default. They
  can be `async` and read data and secrets, but can't use state or effects.
  `'use client'` makes a file and its imports client code, so push it down to the
  interactive leaves and pass only the fields they need. Server Actions (`'use server'`)
  are public POST endpoints. Mark secret modules `server-only`.
- **Environment variables**: only `VITE_*` (`import.meta.env`) and `NEXT_PUBLIC_*` reach
  the browser. Both are inlined at build time, so they are public and fixed per build.

## Where to start reading

1. `package.json`: scripts, versions, and the libraries for routing, data and tests.
2. `vite.config.ts` or `next.config.ts`, `tsconfig.json` paths (`@/`), `.env.example`.
3. The entry: `index.html` → `src/main.tsx` → providers (query client, router, auth). In
   Next.js: `app/layout.tsx`, plus `proxy.ts` (16) or `middleware.ts`.
4. The routes: the router config (`createBrowserRouter`, `routes.ts`) or `app/`.
5. The API layer: the fetch or axios wrapper (base URL, auth, errors) and query hooks.
6. One feature end to end: route → page → query → API call → mutation → invalidation.
7. The tests: test setup file, MSW handlers, and the Playwright config and specs.

## Common pitfalls

These show up often in agent-written React code:
- `useEffect` to derive state (`setTotal(sum(items))` on `[items]`): an extra render
  with a stale frame. Compute during render, and reset state with a `key`.
- Missing dependencies silenced with `eslint-disable`, or new objects in the array each
  render, which loops. Use primitives or `useEffectEvent`.
- Fetching in an effect with no cleanup: a slow older response arrives last and wins.
  Use the query library, or an `AbortController` or `ignore` flag in the cleanup.
- Array index or `Math.random()` as `key`: after an insert or reorder, state sticks to
  the wrong row. Use a stable id from the data.
- Stale closures: an interval set up once keeps reading the first render's state. Use
  the updater form (`setCount((c) => c + 1)`) or correct dependencies.
- 500-line components that fetch, validate and render everything. Split the logic into
  custom hooks and the sections into child components.
- `dangerouslySetInnerHTML` with content not sanitized by DOMPurify. User URLs in
  `href`: React 18 only warns on `javascript:`, so allow-list `https:`.
- Secrets in `VITE_` or `NEXT_PUBLIC_` variables or client code. Calls that need a
  secret go through your server, and a key that shipped must be rotated.
- Authorization only in the client (a hidden button, `<ProtectedRoute>`, a `proxy.ts`
  redirect). APIs and Server Actions check the caller and the record; a page's check
  doesn't cover its Server Actions.
- TypeScript escape hatches: `any`, `as Order` on `res.json()`, `!` and `@ts-ignore`
  make types lie when the API changes. Parse with Zod, or type it `unknown`.
- Next.js caching from the wrong version: 14 caches `fetch` and `GET` Route Handlers by
  default, 15 doesn't, and 16 with Cache Components (`cacheComponents: true`) caches
  what `'use cache'` marks. After a Server Action changes data that a cached page shows,
  call `revalidatePath`, `revalidateTag` or (16) `updateTag`, or users see stale data.
- APIs that don't match the project's versions: `use` or `useActionState` in React 18,
  `useEffectEvent` before 19.2, `proxy.ts` in Next.js 15. Older APIs in newer projects
  too: sync `params` in Next.js 15+, `react-router-dom` imports in React Router 8.

## Practice repos

- **alan2207/bulletproof-react** (https://github.com/alan2207/bulletproof-react): an
  architecture showcase. Read `apps/react-vite`: React Router, TanStack Query, React
  Hook Form with Zod, Vitest with RTL and MSW, Playwright. Its code is on React 18, Vite
  5 and Vitest 2 (no `file:line` filter, which needs Vitest 3); don't copy them. Trace:
  - creating a discussion: `src/features/discussions/components/create-discussion.tsx`,
    the mutation in `../api/create-discussion.ts` and the query it invalidates
  - `<Authorization>` in `src/lib/authorization.tsx` against the MSW handlers in
    `src/testing/mocks/handlers/`: which one protects the data?
  - how `src/app/router.tsx` gives each route's `clientLoader` the query client
- **formbricks/formbricks** (https://github.com/formbricks/formbricks): surveys. Read
  `apps/web`: Next.js 16 App Router, Server Actions via `next-safe-action`, Vitest and
  Playwright. Large, so a stretch repo. Trace:
  - a profile update: `components/EditProfileDetailsForm.tsx` in
    `app/(app)/workspaces/[workspaceId]/settings/account/profile/`, `updateUserAction`
    in its `actions.ts`, and `authenticatedActionClient` in `lib/utils/action-client/`
  - the env split across `lib/env.ts`, `lib/constants.ts` and `lib/env-client.ts`
  - what `proxy.ts` checks, and what the `playwright/cross-tenant-*` specs add
- **documenso/documenso** (https://github.com/documenso/documenso): document signing.
  Read `apps/remix`: React Router 7 framework mode on Vite, React 19, tRPC on TanStack
  Query. Its `ARCHITECTURE.md` says React 18; trust `package.json`. Trace:
  - the sign-in gate: `app/middleware/authenticated.ts` and the `_authenticated+` routes
  - `app/components/forms/profile.tsx` to `packages/trpc/server/profile-router/`, and
    the invalidate-everything override in `packages/trpc/react/index.tsx`
  - the per-request CSP nonce in `server/security-headers.ts`

## Module notes

### reading-unfamiliar-code
Follow data, not files. Pick one URL from the route table and follow it: page → query or
loader → API function → endpoint, then back through a mutation and its invalidation. The
Components tab shows which component rendered an element, and the Network tab which
request filled it. In Next.js, list the `'use client'` and `'use server'` files first.

### testing
Query the way a user finds things: `getByRole('button', { name: /save/i })`, then
`getByLabelText`, then text, and `getByTestId` last. Use `userEvent.setup()`, await
`findBy*` for async UI, and mock the network with MSW instead of your own hooks. In
Playwright, use role locators and add `@axe-core/playwright` for an accessibility check.

### debugging
For wrong data, check the Network tab before the component: the request and response
show whether the bug is in the frontend or the backend. For wrong or extra renders,
inspect props and state in React DevTools and ask the Profiler why it rendered. A bug
seen only in development is often a missing effect cleanup exposed by StrictMode.

### security-fundamentals
JSX escapes text, so XSS comes through `dangerouslySetInnerHTML`, URLs in `href` and
third-party scripts. Sanitize with DOMPurify and add a strict Content Security Policy
(nonces need per-request rendering, so a static SPA uses hashes). Prefer `HttpOnly`,
`SameSite` session cookies to tokens in `localStorage`, which any XSS can read. Keep
`react` and `next` patched: both shipped critical fixes in December 2025.

### owning-agent-features
Before accepting an agent's React diff, check three things:
- the APIs match `package.json`, and no new `useEffect` should be a computed value
- server data comes from the query cache or a loader, with error states handled
- every new `'use client'`, `'use server'`, client env var or `dangerouslySetInnerHTML`
  is justified
