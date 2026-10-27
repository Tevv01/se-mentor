---
name: typescript-node
description: TypeScript backends on Node.js. Express, Fastify or NestJS, Prisma, Drizzle or TypeORM, Vitest or Jest, npm or pnpm.
detect: 'package.json ~ "express", package.json ~ "fastify", package.json ~ "@nestjs/core", package.json ~ "koa", package.json ~ "hono"'
---

# TypeScript on Node.js (Express, Fastify, NestJS)

Node.js 26 becomes Active LTS on 28 October 2026 (end of life 30 April 2029). Node.js 24
is in maintenance until 30 April 2028 and Node.js 22 until 30 April 2027. Node.js 20
reached end of life on 30 April 2026, so projects on it need an upgrade plan.
TypeScript 7.0 (July 2026), the compiler rewritten in Go, installs as `typescript` and
runs as `tsc`, but has no programmatic API. Tools that import `typescript`
(typescript-eslint, ts-jest) still need 6.0, so projects alias `typescript` itself to it
(`npm i -D typescript@npm:@typescript/typescript6`, binary `tsc6`) and install 7.0
under another name for the fast `tsc`. TypeScript 7.1, in beta, adds a new API. Client
codebases are often older (Express 4, Jest, CommonJS, TypeScript 5.x), so check
`engines`, `.nvmrc` and the `typescript` version before trusting an agent's suggestion.

## Tooling and commands

- Package manager: the lockfile says which (`package-lock.json`, `pnpm-lock.yaml`,
  `yarn.lock`). In CI, `npm ci` or `pnpm install --frozen-lockfile` installs exactly
  the lockfile and fails if it disagrees with `package.json`.
- Run and watch: read the `dev` script. Common ones are `tsx watch src/server.ts`,
  `nest start --watch`, and `node --watch src/server.ts` (Node 22.18+ strips types, but
  rejects decorators, so not for Nest or TypeORM). Production runs the build output.
- Type-check: `npx tsc --noEmit` (`tsc -b` with references). tsx, Vitest, swc, esbuild
  and Node's type stripping don't type-check, so tests can pass while `tsc` fails.
- Lint: `npx eslint .` (flat config) with typescript-eslint's `recommendedTypeChecked`,
  above all `no-floating-promises` and `no-misused-promises`. Some projects use Biome.
- One test: `npx vitest run src/orders/orders.test.ts -t "returns 404"`, or the same
  with `npx jest`. Node's runner: `node --test --test-name-pattern="returns 404"`.
- Dependencies: `npm audit --omit=dev` (what ships) or `pnpm audit`, in CI too. Read it
  before `npm audit fix --force`, which can install breaking majors. `npm explain <pkg>`
  or `pnpm why <pkg>` shows why something is installed. Read the lockfile diff in every
  PR; regenerating the lockfile to fix a conflict upgrades every transitive dependency.
- Migrations, Prisma: `npx prisma migrate dev --name add_orders` locally
  (`--create-only` writes the SQL without applying it), `npx prisma migrate deploy` in
  CI and production. Since Prisma 7, run `npx prisma generate` yourself afterwards.
- Migrations, Drizzle: `npx drizzle-kit generate` writes SQL files, `npx drizzle-kit
  migrate` applies them; `drizzle-kit push` changes the database with no file.
- Migrations, TypeORM: `npx typeorm-ts-node-commonjs migration:generate
  src/migrations/AddOrders -d src/data-source.ts`, then `migration:run` (same `-d`).
- See the SQL: Prisma `new PrismaClient({ adapter, log: ['query'] })` (Prisma 7 needs a
  driver adapter); Drizzle `{ logger: true }` or `.toSQL()`; TypeORM
  `logging: ['query']` or `.getSql()` on a query builder.
- Debugging: `node --inspect` (`--inspect-brk` pauses on line one; add `--import tsx`
  for tsx) or `nest start --debug --watch`, then attach from the IDE, `chrome://inspect`
  or VS Code's JavaScript Debug Terminal. Keep the inspector on localhost.

## Idioms and conventions

- **Strict tsconfig**: `strict: true` (the default since TypeScript 6.0; older configs
  turn it off), plus `noUncheckedIndexedAccess` so `arr[i]` may be `undefined`. Under
  `strict`, `catch (err)` gives `unknown`: narrow it before use.
- **Validate at the boundary**: types are erased at runtime. Parse bodies, params,
  webhooks, queue messages and third-party responses with a schema: zod
  `CreateOrder.safeParse(req.body)`, 400 on failure, `z.infer` for the type. Fastify
  validates each route's JSON Schema (often TypeBox). Nest uses class-validator DTO
  classes with `ValidationPipe({ whitelist: true })`, or nestjs-zod; not interfaces.
- **Async errors**: one central handler (Express error middleware `(err, req, res,
  next)`, Fastify `setErrorHandler`, Nest exception filters) maps error types to status
  codes; no try/catch per handler. Keep the original: `new Error('...', { cause })`.
- **Layering**: controllers parse and respond, services hold rules, repositories hold
  queries; services never see `req` or `res`.
- **Config**: parse `process.env` once at startup (zod or envalid) into a typed object,
  so a missing value fails on boot. Load `.env` locally with `node --env-file=.env`
  (stable since 24.10 and 22.21) or dotenv; Prisma 7 no longer loads it for you.
- **Logging**: pino (in Fastify; `pino-http`, `nestjs-pino`), fields first:
  `log.info({ orderId }, 'order created')`, with `redact` for secrets.
- **ESM vs CommonJS**: `"type": "module"` makes `.js` files ESM; `.mjs` and `.cjs`
  force one or the other. With `module: nodenext`, ESM relative imports name the
  emitted file (`'./user.js'` for `user.ts`). When Node runs `.ts` directly (type
  stripping), import `'./user.ts'` instead, with `rewriteRelativeImportExtensions` if
  `tsc` also emits. Use `import.meta.dirname`, not
  `__dirname`. Node 20.19+ and 22.12+ can `require()` ESM without top-level `await`.
  Jest's ESM support is experimental. A missing `.js` gives `ERR_MODULE_NOT_FOUND`.

## Where to start reading

1. `package.json`: `scripts` (how it really runs, builds, tests and migrates), `type`,
   `engines`, and dependencies (framework, ORM, validation, queues).
2. `tsconfig.json` and what it `extends`: `strict`, `module`, and `paths` aliases.
3. The entry point (`src/main.ts` in Nest, else `src/server.ts`, `index.ts` or
   `app.ts`), then the config module and `.env.example`.
4. Global wiring: middleware order (Express), plugins and hooks (Fastify), or guards,
   pipes, interceptors and filters (Nest). Auth and validation often live here.
5. The data layer: `prisma/schema.prisma` and `prisma/migrations`, the Drizzle schema
   and `drizzle.config.ts`, or TypeORM entities and the data source.
6. One route traced end to end, from router or controller down to the query.
7. Test setup (`vitest.config.*`, `jest.config.*`, `docker-compose.yml`) and the CI
   workflow: which checks actually gate a merge.

## Common pitfalls

These show up often in agent-written TypeScript:
- A missing `await`: the response goes out before the write finishes, and the failure
  becomes an unhandled rejection, which crashes the process by default since Node 15.
  `items.forEach(async ...)` waits for nothing; use `for...of` or `Promise.all`.
- Express 4 ignores the promise an `async` handler returns, so a rejection never
  reaches the error middleware: wrap handlers (`fn(req, res, next).catch(next)`).
  Express 5 forwards rejected promises from handlers and middleware, but not errors
  from callbacks, timers or promises the handler doesn't return or await.
- `any`, `as`, `!` and `@ts-ignore` added to silence the compiler. `JSON.parse` and
  fetch's `res.json()` return `any`, so the bug moves to runtime.
- Trusting a body because it's typed: `req.body as CreateUser`, a Fastify `Body`
  generic with no schema, or a Nest DTO that is an interface.
- SQL from template strings: `` $queryRawUnsafe(`... ${id}`) `` and
  `` pool.query(`... ${id}`) `` are injectable. `` prisma.$queryRaw`... ${id}` `` (a
  tagged template) and `pool.query('... WHERE id = $1', [id])` send parameters.
- N+1 queries: a query awaited inside a loop, or TypeORM lazy relations. Use `include`
  (Prisma), `with` (Drizzle), `relations` or a join (TypeORM), or `WHERE id IN (...)`.
- A call on `prisma` instead of `tx` inside `prisma.$transaction(async (tx) => ...)`
  runs outside the transaction.
- `new PrismaClient()` or `new Pool()` per request or per file: each opens its own
  connection pool until the database refuses connections. Create one at startup.
- Blocking the event loop (one thread serves every request): `bcrypt.hashSync`,
  `fs.readFileSync` in a handler, a huge `JSON.parse`, a catastrophic regex.
- Per-request data (current user, tenant) in a module-level variable leaks between
  concurrent requests. Pass it explicitly, or use `AsyncLocalStorage`.
- Packages that don't exist, or lookalikes registered for agents to hallucinate
  (slopsquatting). Check `npm view <pkg>` and its repository before installing.
- Login checked, ownership not: `prisma.order.findUnique({ where: { id } })` returns
  user B's order to user A. Scope it: `findFirst({ where: { id, userId } })`. Also check
  that a new router or module is covered by the auth middleware, hook or guard.
- Secrets in code: hard-coded keys, a committed `.env`, logged headers, or
  `process.env.JWT_SECRET ?? 'dev-secret'`, a known secret whenever the variable is
  unset.
- Leaking internals: with `NODE_ENV` unset in production, Express's default error
  handler sends stack traces to clients, and a custom handler returning `err.message`
  for 500s leaks too. Log the details, return a generic message.
- Flipping `type` or `module` to silence one ESM/CommonJS error just causes the next.
- `z.coerce.boolean()` on env vars turns `"false"` into `true`; use `z.stringbool()`.
- `fetch` with no timeout. Pass `signal: AbortSignal.timeout(5000)`.

## Practice repos

Ghostfolio and Immich are AGPL-3.0: read them, but don't copy code into client work.

- **fastify/demo** (https://github.com/fastify/demo): the Fastify team's example, a
  small task API with MySQL via Knex (`.toSQL()` or `DEBUG=knex:query` shows the SQL),
  SQL migrations, TypeBox schemas, ESM and `node:test` via tsx. Trace:
  - how `src/app.ts` autoloads plugins and routes, and where
    `src/routes/api/autohooks.ts` rejects requests without a session
  - what ajv's `removeAdditional: 'all'` in `src/server.ts` does to extra body fields
  - which routes in `src/routes/api/tasks/index.ts` check a role (`isAdmin`,
    `isModerator`), and what stops one user from changing another user's task
- **ghostfolio/ghostfolio** (https://github.com/ghostfolio/ghostfolio): a wealth
  management app; the NestJS API is `apps/api` in an Nx monorepo, with Prisma 7 on
  PostgreSQL and Jest. Trace:
  - deleting an activity in `apps/api/src/app/activities/activities.controller.ts`:
    the guards `@RequiresScope` applies, and the lookup by `id` and `userId` first
  - how `services/configuration/configuration.service.ts` checks env vars (envalid)
  - when `services/prisma/prisma.service.ts` logs SQL, and why `package.json` has both
    `prisma db push` (setup) and `prisma migrate deploy` (migrate) scripts
- **immich-app/immich** (https://github.com/immich-app/immich): a self-hosted photo
  library, a stretch repo. The NestJS server in `server/` uses Kysely on PostgreSQL
  (`.compile()` shows a query's SQL), nestjs-zod, Vitest, ESM and pnpm, and aliases
  `typescript` to `@typescript/typescript6`. Trace:
  - reading an album: `src/controllers/album.controller.ts` → `AlbumService.get` →
    `requireAccess` in `src/utils/access.ts`. How does it decide you may see it?
  - how `@GenerateSql` and `src/bin/sync-sql.ts` produce the SQL in `src/queries/`
  - how `test/medium/globalSetup.ts` starts PostgreSQL with Testcontainers

## Module notes

### reading-unfamiliar-code
Start from the `package.json` scripts: they name the real entry point and commands.
Path aliases and barrel files (`index.ts` re-exports) hide where code lives, so use
go-to-definition. Behavior missing at the call site lives in Nest guards, pipes,
interceptors and filters, Fastify hooks and plugins, or Express middleware order.

### testing
Use `it.each` for boundary pairs. Test HTTP through the app (`app.inject()` in Fastify,
supertest for Express and Nest), and queries against a real database (Testcontainers),
not a mocked ORM. Await every `expect(...).rejects`, or the test can pass unchecked.
`vi.mock` and `jest.mock` replace whole modules: ask what the test still proves.

### debugging
Node prints a wrapped error's `cause` under `[cause]:`, so read down to the innermost
one. Async stack traces only connect through awaited calls, so a trace that stops short
can point to a missing `await`. With built code, run `--enable-source-maps` first.

### data-modeling
JavaScript numbers are floats (`0.1 + 0.2 !== 0.3`), so keep money in integer minor
units or a decimal type (`Decimal` in Prisma). The `pg` driver returns `NUMERIC` and
`BIGINT` as strings. Read the SQL of every generated migration before it runs (Prisma
`--create-only`, or `drizzle-kit generate` output). Keep `drizzle-kit push` and TypeORM
`synchronize: true` for throwaway databases. For read-modify-write, use an atomic
`updateMany` (condition in `where`, then check `count`) or a unique constraint
(Prisma error `P2002`).

### security-fundamentals
Use schemas that strip or reject unknown fields (zod objects strip by default,
`z.strictObject` rejects; Nest `whitelist: true`) to block mass assignment. Scope every
query by owner (see the ownership pitfall). Resolve user-supplied paths (`path.resolve`,
then `fs.realpath`) and check they stay inside the base directory. Treat every package
an agent adds as unverified.

### owning-agent-features
Before accepting an agent's TypeScript diff, check five things:
- `tsc --noEmit` and the linter pass, not only the tests
- no new `any`, `as` or `@ts-ignore` hiding an error
- every promise is awaited or deliberately handled
- input is validated at the boundary, and queries are scoped to the caller
- each new package is real, needed and correctly named
