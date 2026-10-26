---
name: dotnet
description: C# on modern .NET (8 and 10). ASP.NET Core Web APIs, Entity Framework Core, xUnit or NUnit.
---

# .NET (C#, ASP.NET Core, EF Core)

.NET 10 is the current LTS release. .NET 8 is still common in client codebases, but its
support ends on 10 November 2026, so projects on it need an upgrade plan. Check the
target framework in the `.csproj` files before trusting any API an agent suggests.

## Tooling and commands

- Build, run, watch: `dotnet build`, `dotnet run --project src/<Api>`, `dotnet watch`.
- Test: `dotnet test`. To run a single test or class:
  `dotnet test --filter "FullyQualifiedName~OrderTests"`. For verbose output, add
  `--logger "console;verbosity=detailed"`. These flags are for the classic VSTest runner.
  If `global.json` opts into Microsoft.Testing.Platform, filters are framework-specific
  (e.g. xUnit v3 `--filter-class`).
- Format and analyzers: `dotnet format`. Treat compiler warnings as findings,
  especially nullable warnings (`CS86xx`).
- Dependencies: `dotnet list package --outdated` and
  `dotnet list package --vulnerable --include-transitive`.
  Central versions live in `Directory.Packages.props` when the solution uses it.
- EF Core migrations (needs the `dotnet-ef` tool): `dotnet ef migrations add <Name>`,
  `dotnet ef database update`, and `dotnet ef migrations script <PreviousMigration>`,
  which shows the SQL the new migrations will run.
- Secrets for local development: `dotnet user-secrets set "Key" "value"`, never
  `appsettings.json`.
- Debugging: use the IDE debugger (Rider, Visual Studio, or VS Code with C# Dev Kit), and
  turn on "break when thrown" for the exception type you're chasing. Use `dotnet-counters`
  and `dotnet-trace` for runtime and performance questions.

## Idioms and conventions

- **Solution layout**: usually an Api/Web project, an Application or UseCases project, a
  Domain or Core project, an Infrastructure project, and test projects. Project references
  point inward: Infrastructure references Domain, never the other way round.
- **Startup**: `Program.cs` registers services and builds the middleware pipeline.
  Middleware order matters (exception handling, then auth, then endpoints).
- **Dependency injection lifetimes**: singleton, scoped (one per request) and transient.
  `DbContext` is scoped. Never inject a scoped service into a singleton.
- **Configuration**: `appsettings.json`, `appsettings.{Environment}.json`, user secrets
  (Development only), environment variables, then command-line arguments, in increasing
  precedence. Bind settings to classes with the
  options pattern (`IOptions<T>`) and validate them at startup.
- **Async all the way**: `async`/`await` end to end, with a `CancellationToken` passed
  through to EF Core and `HttpClient` calls.
- **Nullable reference types** are on in modern templates. `!` silences a warning and
  doesn't fix anything.
- **Errors**: return ProblemDetails for API errors, with one central exception handler.
  Don't add try/catch in every endpoint.
- **Logging**: `ILogger<T>` with message templates (`"Order {OrderId} failed"`), not string
  interpolation, so the fields stay structured.
- **EF Core reads**: project to DTOs with `Select`, use `AsNoTracking()` for read-only
  queries, and use `Include` only for what you need.

## Where to start reading

1. The `.sln` or `.slnx` file, plus `Directory.Build.props` and
   `Directory.Packages.props`: the projects and shared settings.
2. Each `.csproj`: target framework, project references (the real dependency graph) and
   packages (what the system does).
3. `Program.cs`: registered services, extension methods like `AddInfrastructure()` (open
   them), and the middleware pipeline.
4. `appsettings*.json`: connection strings, feature flags and external services.
5. The `DbContext`, entity configurations and the `Migrations` folder: the data model.
6. One endpoint or controller, traced end to end down to the database.
7. The test projects: what is tested and how the app is started for tests.

## Common pitfalls

These show up often in agent-written .NET code:
- Sync over async (`.Result`, `.Wait()`), and `async void` outside event handlers.
- A scoped service captured by a singleton, which hides bugs until two requests run at
  once. Similarly, one `DbContext` shared across `Task.WhenAll` throws, because a
  `DbContext` is not thread-safe. A `BackgroundService` must create a scope with
  `IServiceScopeFactory` to use one.
- N+1 queries from lazy loading or a missing `Include`, and filtering in memory after
  `ToList()` instead of in SQL.
- `FromSqlRaw` or `ExecuteSqlRaw` with string interpolation, which allows SQL
  injection. Use `FromSql($"...")` (EF Core 7+), which parameterizes, or explicit
  parameters.
- `new HttpClient()` per call, instead of `IHttpClientFactory` or typed clients.
- `catch (Exception) { }` and other swallowed errors, or logging the same error at every
  layer.
- `DateTime.Now` in business logic. Use UTC and an injected `TimeProvider`, so tests can
  control time.
- Tests on the EF Core InMemory provider. It doesn't behave like a real database (no
  constraints, different queries), so prefer SQLite or a real database via
  Testcontainers.
- APIs from a newer .NET version than the project targets.
- A migration that nobody reviewed. Read the generated SQL for drops and renames.
- A new endpoint without `[Authorize]` or a policy, when the app has no fallback
  authorization policy.
- No record-level check: `db.Orders.FindAsync(id)` lets user A read user B's order.
  Filter by owner in the query (`Where(o => o.Id == id && o.UserId == userId)`), or use
  resource-based authorization (`IAuthorizationService.AuthorizeAsync`).
- Assuming DataAnnotations are enforced. Only `[ApiController]` controllers return 400
  automatically. Minimal APIs need `builder.Services.AddValidation()` (.NET 10), or explicit
  validation.
- Binding request bodies straight to EF entities (mass assignment).

## Practice repos

These target .NET 10. When your project is on .NET 8, read them for structure, but don't
copy newer APIs.

- **ardalis/CleanArchitecture** (https://github.com/ardalis/CleanArchitecture): a widely
  used Clean Architecture template. Its functional tests use WebApplicationFactory with
  Testcontainers (falling back to SQLite without Docker). Its integration tests use the EF
  InMemory provider. Trace:
  - how a create request goes from the endpoint through the use case to persistence
  - where validation happens, and what the client sees when it fails
  - how the functional tests start the app and the database, and what the InMemory-based
    tests could miss
- **jasontaylordev/CleanArchitecture** (https://github.com/jasontaylordev/CleanArchitecture):
  Clean Architecture with MediatR, NUnit and a choice of databases. Recent MediatR
  versions need a commercial license, so check before adopting the pattern in client
  code. Trace:
  - a command through the MediatR pipeline behaviours (validation, logging,
    authorization)
  - how EF Core entity configurations are found and applied
  - how a functional test resets the database between tests
- **dotnet/eShop** (https://github.com/dotnet/eShop): Microsoft's reference app, with
  several services orchestrated by Aspire. A stretch repo. Trace:
  - how the Aspire AppHost wires the services and their dependencies together
  - placing an order, across services and the integration events between them
  - how one API configures its data access and endpoints

## Module notes

### reading-unfamiliar-code
Dependency injection hides which implementation runs. To find it, look for the
registration in `Program.cs` or an `Add...()` extension method, or use your IDE's
"go to implementation". Behavior that never shows up at the call site lives in
middleware, filters, EF Core interceptors and global query filters, so check those early.

### testing
xUnit: `[Fact]` for a single case, and `[Theory]` with `[InlineData]` for boundary pairs
(6 and 7 days, 499.99 and 500). In NUnit the equivalent is `[TestCase]`. Test the HTTP
layer with `WebApplicationFactory`, and the database with SQLite or Testcontainers, not
the InMemory provider.

### debugging
Read `InnerException` chains from the outside in. The root cause is the innermost one.
`exception.ToString()` prints the whole chain. Async stack traces include framework
frames, so skip down to the first frame in your own namespace.

### data-modeling
See the SQL EF generates with `query.ToQueryString()`, or by enabling EF command logging.
Set the precision of money columns explicitly, e.g. `HasPrecision(18, 2)`. When two users
can edit the same row, use a concurrency token (`[Timestamp]` rowversion on SQL Server,
`xmin` on PostgreSQL) and handle `DbUpdateConcurrencyException`. SQLite can't sort or
aggregate `decimal` in SQL, so test money queries against your real database.

### security-fundamentals
Set a fallback authorization policy so new endpoints are protected by default. It only
proves the caller is logged in, so also check record ownership on every data access (see
Common pitfalls). Keep
secrets in user secrets locally and in a vault in production. Run
`dotnet list package --vulnerable --include-transitive` in CI.

### owning-agent-features
Before accepting an agent's .NET diff, check four things:
- the target framework matches the APIs it uses
- DI lifetimes are correct
- `CancellationToken` is passed through
- EF Core queries are translated to SQL, not run in memory
