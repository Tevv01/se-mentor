---
name: go
description: Go backend services (Go 1.26 and 1.27). net/http or chi/gin, database/sql with pgx or sqlc, the standard testing package, testify and testcontainers-go.
detect: 'go.mod'
---

# Go (net/http, database/sql, Go modules)

Go 1.27 (August 2026) and Go 1.26 (February 2026) are the supported releases. Each is
supported until two newer releases are out, so Go 1.26 loses support when Go 1.28 ships.
The `go` line in `go.mod` sets the minimum version and switches language behavior
(loop variables, routing patterns), so read it before trusting an API an agent suggests.

## Tooling and commands

- Build and run: `go build ./...`, `go run ./cmd/api`. Format with `go fmt ./...`.
- Test: `go test ./...`. One test: `go test -run '^TestCreateOrder$' -count=1
  ./internal/orders`. `-run` is a regex, a slash selects a subtest (`TestParse/empty`),
  and `-count=1` skips the test cache.
- Race detector: `go test -race ./...`. It only reports races on code paths that ran, so
  it needs tests that exercise the concurrency.
- Static checks: `go vet ./...` (`go test` runs only a small subset). Then
  `staticcheck ./...` or `golangci-lint run` (v2, configured in `.golangci.yml`). Since
  Go 1.26, `go fix ./...` rewrites code to current idioms. Review that diff too.
- Vulnerabilities: `govulncheck ./...` (install `golang.org/x/vuln/cmd/govulncheck`).
  It separates vulnerabilities your code calls from ones it only imports.
- Modules: `go mod tidy` adds missing and drops unused requirements; commit `go.mod` and
  `go.sum` together. `go get example.com/pkg@v1.4.0` may also raise the `go` line.
- Migrations (golang-migrate; goose works much the same):
  `migrate create -ext sql -dir migrations -seq add_order`, then
  `migrate -path migrations -database "$DATABASE_URL" up` (or `down 1`). A failed run
  marks the version dirty. Fix the database by hand, then `migrate force <version>` with
  the version it is really at (the previous one if the failed migration didn't apply).
- Profiling: `import _ "net/http/pprof"` registers on `http.DefaultServeMux`, so a main
  server with a nil handler exposes pprof publicly. Serve it on a localhost-only port:
  `go tool pprof -http=:8081 'http://localhost:6060/debug/pprof/profile?seconds=30'`.
- Debugging with Delve: `dlv debug ./cmd/api`, `dlv test ./internal/orders --
  -test.run TestX` or `dlv attach <pid>`. VS Code's Go extension and GoLand use it.

## Idioms and conventions

- **Errors are values**: check each `error` and add context, as in
  `fmt.Errorf("load order %d: %w", id, err)` (`%v` would flatten the chain). Use
  `errors.Is(err, sql.ErrNoRows)` for sentinels, and `errors.As` (or `errors.AsType` on
  1.26+) for types. Handle an error or return it, not both, or it logs five times.
- **Small interfaces, defined by the consumer**: the package that needs a store declares
  the two methods it calls. Constructors return concrete types. An interface declared
  next to its only implementation usually exists just for mocks.
- **context.Context**: first parameter, named `ctx`, never stored in a struct. Handlers
  pass `r.Context()` to database calls and `http.NewRequestWithContext`, so a cancelled
  request stops its work. Every `WithTimeout` or `WithCancel` gets `defer cancel()`.
- **Layout**: a small `cmd/<binary>/main.go` (config, wiring, start), and service code
  in `internal/`, which other modules can't import. Group packages by domain (`orders`),
  not kind (`models`, `utils`). The "golang-standards/project-layout" repo is not an
  official standard; the Go team's guide is "Organizing a Go module".
- **Routing**: since Go 1.22, `mux.HandleFunc("GET /orders/{id}", h)` and
  `r.PathValue("id")`. This needs `go 1.22`+ in `go.mod`. chi: `chi.URLParam(r, "id")`,
  middleware via `r.Group` and `r.Use`. gin: `c.Param("id")`, `c.ShouldBindJSON(&req)`,
  and `c.Request.Context()` for downstream calls.
- **Data access**: `sql.Open` doesn't connect, so `db.PingContext` at startup. One
  `*sql.DB` or `*pgxpool.Pool` per process, shared: both are concurrency-safe pools.
  sqlc generates typed Go from SQL files: `sqlc generate` after changing queries, never
  edit its output, `sqlc diff` in CI. With an ORM (GORM, ent, bun), see its SQL.
- **Tests**: table-driven, a slice of cases each run with `t.Run(tc.name, ...)`, plus
  `t.Helper()`, `t.Cleanup` and `t.Context()` (1.24+). testify's `require` stops the
  test, `assert` carries on. `httptest` for handlers, and testcontainers-go
  (`postgres.Run(ctx, "postgres:16-alpine", ...)`) for a real database.
- **Logging**: `log/slog` with `slog.NewJSONHandler` and key-value pairs,
  `logger.InfoContext(ctx, "order created", "order_id", id)`, so a handler can add
  request or trace ids from `ctx`. `go vet` catches mismatched pairs.
- **Graceful shutdown**: `signal.NotifyContext(ctx, os.Interrupt, syscall.SIGTERM)`, run
  `ListenAndServe` in a goroutine (`http.ErrServerClosed` is the normal result), and on
  `<-ctx.Done()` call `srv.Shutdown` with a timeout. Then stop workers and the pool.
- **Config from env**: read once in `main` into a struct (`os.LookupEnv` when unset and
  empty differ), validate, and exit with a clear message. Pass values down explicitly.

## Where to start reading

1. `go.mod`: the `go` line, and dependencies that say what the service does.
2. `cmd/*/main.go` (or a root `main.go`): config, wiring, server start and shutdown. Go
   has no DI container, so the constructors called here are the real dependency graph.
3. Where routes are registered (`HandleFunc`, `r.Get`, `router.GET`), and which
   middleware wraps which group.
4. The config struct and its env var names, `.env.example` and `docker-compose.yml`.
5. The data layer: migrations, SQL query files, or the ORM models.
6. One handler, traced down to its SQL.
7. The tests: `_test.go` files beside the code, any `TestMain` that starts containers,
   and the `Makefile` or CI file that shows what really runs.

## Common pitfalls

These show up often in agent-written Go:
- Ignored errors: `_ = tx.Commit()`, an unchecked `json.NewEncoder(w).Encode(v)`, or
  `http.Error(w, ...)` with no `return` after it. `errcheck` (on by default in
  golangci-lint) flags the unchecked call, but not `_ =` or the missing `return`.
- A typed nil in an interface: returning a nil `*MyError` as `error` gives a non-nil
  error, so `err != nil` is true. Return a literal `nil`.
- Goroutines that can't stop: a send nobody receives, a loop with no `<-ctx.Done()`
  case, `context.Background()` in a handler. Use `golang.org/x/sync/errgroup` with a
  context, and `go.uber.org/goleak` in tests.
- Maps shared between goroutines without a mutex. Concurrent writes crash the process
  ("fatal error: concurrent map writes"), which `recover` can't catch. Use `-race`.
- Loop variable capture: Go 1.22 gives `for` loop variables a new copy per iteration,
  but only where the `go` line is 1.22+. Below that, closures still share one variable.
- Writing to a nil map panics (`var m map[string]int; m["a"] = 1`); reading is fine.
- `defer` in a loop runs at function return, so files, rows or locks pile up. Move the
  loop body into a function.
- Unclosed `rows` (`defer rows.Close()`, then check `rows.Err()`) or `resp.Body`. Each
  holds a pooled connection until the pool runs dry.
- Inside `db.BeginTx`, every statement must use `tx` (with sqlc, `q.WithTx(tx)`). A
  stray `db.ExecContext` runs on another connection and commits outside the transaction.
- SQL built with `fmt.Sprintf` or `+` (GORM's `Where` and `Raw` too). Use placeholders
  (`$1`, `?`), and map identifiers like an `ORDER BY` column from an allow-list.
- No timeouts: `http.DefaultClient` and `&http.Client{}` wait forever, so set `Timeout`.
  An `http.Server` needs `ReadHeaderTimeout`, which `http.ListenAndServe` can't set.
- `panic` for control flow, and `log.Fatal` outside `main` (it skips deferred calls).
  net/http recovers handler panics, but a panic in your own goroutine kills the process.
- Over-abstraction: an interface per struct and generated mocks for everything.
- APIs newer than the `go` line. The compiler rejects newer syntax (`for i := range 10`
  needs 1.22), but newer library calls such as `t.Context()` (1.24), `wg.Go` (1.25) or
  `errors.AsType` (1.26) build on a newer toolchain and break on the declared one.
  `go vet`'s stdversion check flags them (Go 1.27's `go test` runs it by default).
- A route registered outside the authenticated group (chi `r.Group`, gin `router.Group`,
  or the wrapped mux), so it skips auth.
- No record-level check: `WHERE id = $1` lets user A read user B's order. Put the owner
  in the query (`WHERE id = $1 AND user_id = $2`).
- Decoding a request body straight into the database struct (clients set `user_id`), and
  no `http.MaxBytesReader` limit on the body.
- JSON zero values: a missing field and `0`, `""` or `false` decode the same, so PATCH
  needs pointer fields. Unexported fields are skipped, and `omitempty` hides real zeros.

## Practice repos

All three are maintained and on Go 1.26 or 1.27: check your `go` line before copying.

- **miniflux/v2** (https://github.com/miniflux/v2): a feed reader on PostgreSQL, with
  standard `net/http` and Go 1.22 routing, `database/sql` with `lib/pq`, and `log/slog`.
  Little framework code, so everything is visible. Trace:
  - `GET /v1/feeds/{feedID}` from `internal/http/server/routes.go` via
    `internal/api/api.go` (routes, auth middleware) to `FeedByID` in
    `internal/storage/feed.go`. What stops user A reading user B's feed?
  - startup and shutdown: `main.go` to `startDaemon` in `internal/cli/daemon.go`, and
    the server timeouts in `internal/http/server/server.go`
  - migrations as ordered Go functions in `internal/database/migrations.go`, each run
    in a transaction, compared with golang-migrate
- **ardanlabs/service** (https://github.com/ardanlabs/service): Ardan Labs' starter kit
  and course code, layered into app, business and foundation, with pgx and sqlx, slog
  and vendored dependencies. A stretch repo. Trace:
  - `PUT /v1/products/{product_id}` from `app/domain/productapp/route.go` through
    `mid.AuthorizeProduct` (`app/sdk/mid/authorize.go`: loads the product, checks
    admin-or-owner) to `productbus` and its Postgres store
  - how `api/services/sales/main.go` reads `SALES_` env vars into a config struct, sets
    server timeouts and shuts down on SIGINT or SIGTERM
  - how `business/sdk/dbtest` starts and migrates Postgres in Docker without
    testcontainers-go, for the tests in `api/services/sales/tests/productapi`
- **evrone/go-clean-template** (https://github.com/evrone/go-clean-template): Clean
  Architecture with REST (Fiber), gRPC and queue controllers, pgx with squirrel,
  golang-migrate, testify and mockgen. Trace:
  - getting a task by id, from `internal/controller/restapi/v1/router.go` to
    `internal/repo/persistent/task/task.go`. Compare the ownership check in `GetByID`
    with `Update` and `Delete`, and what each reveals about someone else's ids.
  - `internal/repo/contracts.go` and `internal/usecase/contracts.go`, versus
    ardanlabs' `productbus.Storer`, declared by the package that uses it
  - migrations in `internal/app/migrate.go`, built only with `-tags migrate`

## Module notes

### reading-unfamiliar-code
Wiring is explicit: start at `main` and follow the constructors. For an interface, use
gopls "go to implementation". Check middleware, `init()` functions and blank imports
(`_ "github.com/lib/pq"` registers a driver) early: they never show at the call site.

### testing
Write the case table first, with names that state behavior ("returns 404 for another
user's order"), and see each fail with `go test -run 'TestX/case_name' -count=1`. Test
queries on testcontainers-go: a test that checks which mock methods ran tests the mock.

### debugging
A panic prints the goroutine's stack innermost call first: find the first frame in
your own module (`GOTRACEBACK=all` prints every goroutine). Wrapped errors read outer
to inner (`create order: insert order: duplicate key`): the root cause is at the end.

### data-modeling
Get the SQL and `EXPLAIN` it: read the query files, or log it with GORM's `db.Debug()`.
N+1 looks like a query inside a `for` over rows: batch with `WHERE id = ANY($1)` and a
slice in pgx. Money is integer minor units or `NUMERIC`, never `float64`. After
`BeginTx`, `defer tx.Rollback()` (harmless after `Commit`).

### security-fundamentals
For queries, ownership checks and request bodies, see Common pitfalls. Run
`govulncheck ./...` in CI. Make tokens with `crypto/rand`, never `math/rand`, and hash
passwords with `golang.org/x/crypto/bcrypt` or argon2. Implement `slog.LogValuer` on
types that hold secrets so they redact themselves in logs.

### owning-agent-features
Before accepting an agent's Go diff, check five things:
- its APIs exist at your `go` line, and any `go.mod` change was intended
- every error is checked, wrapped with `%w` or handled on purpose
- `ctx` is passed through, and every goroutine has a way to stop
- rows, response bodies and transactions are closed or rolled back
- `go vet ./...` and `go test -race ./...` pass
