---
name: jvm-spring
description: Java and Kotlin backends on Spring Boot (3.x and 4.x). Spring MVC REST APIs, Spring Data JPA with Hibernate, Gradle or Maven, JUnit, Mockito or MockK, Testcontainers.
---

# JVM and Spring Boot (Java, Kotlin, Spring Data JPA)

Java 25 is the newest LTS release. Most client codebases run Java 21 or 17 (Temurin
updates 17 until at least October 2027), and old Spring Boot 2 apps still run 8 or 11.
Spring Boot 4.1 is current. Open-source support for 4.0 ends on 31 December 2026 and
ended for 3.5 on 30 June 2026, so projects on 3.x need an upgrade plan. Boot 4 needs
Java 17+ and Kotlin 2.2+, and moved to Spring Framework 7, Jakarta EE 11, Hibernate 7,
Jackson 3 and JUnit 6. Agents mix up these generations, so check the Boot version and
Java toolchain in the build file before trusting any API an agent suggests.

## Tooling and commands

- Use the repo's wrapper (`./gradlew`, `./mvnw`; `gradlew.bat`, `mvnw.cmd` on Windows).
- Build: `./gradlew build` or `./mvnw verify`. Run with a profile:
  `./gradlew bootRun --args='--spring.profiles.active=local'` or
  `./mvnw spring-boot:run -Dspring-boot.run.profiles=local`.
- Single test: `./gradlew test --tests 'com.example.orders.OrderServiceTest'` (add
  `.methodName` or `*` wildcards), or `./mvnw test -Dtest='OrderServiceTest#method'`.
- Dependencies: `./gradlew dependencyInsight --dependency jackson-databind` or
  `./mvnw dependency:tree` shows why a version won (most come from the Boot BOM).
- Vulnerabilities: OWASP Dependency-Check scans transitive dependencies too
  (`./gradlew dependencyCheckAnalyze` with the `org.owasp.dependencycheck` plugin, or
  `./mvnw org.owasp:dependency-check-maven:check`). An NVD API key makes it faster.
- Migrations: Flyway runs `src/main/resources/db/migration/V<version>__<name>.sql` at
  startup; Liquibase runs `db/changelog/db.changelog-master.yaml`. Boot 4 needs
  `spring-boot-starter-flyway` or `spring-boot-starter-liquibase`. With either, keep
  `spring.jpa.hibernate.ddl-auto` at `none` or `validate`.
- See the SQL: `logging.level.org.hibernate.SQL=debug`, plus
  `logging.level.org.hibernate.orm.jdbc.bind=trace` for values (Hibernate 6+, local
  only). `spring.jpa.properties.hibernate.generate_statistics=true` counts statements.
- Debugging: IntelliJ IDEA, with an exception breakpoint for the type you're chasing.
  These wait for a debugger on port 5005. Tests: `./gradlew test --debug-jvm` or
  `./mvnw test -Dmaven.surefire.debug`. The app: `./gradlew bootRun --debug-jvm`, or
  `./mvnw spring-boot:run -Dspring-boot.run.jvmArguments="<jdwp>"` with `<jdwp>` set to
  `-agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=*:5005`.

## Idioms and conventions

- **Layout**: by feature (`owner/`, `vet/`) in newer apps, by layer in older ones. Both
  go controller (HTTP, validation), service (rules, transaction boundary), repository.
  Controllers take and return DTOs (Java records, Kotlin data classes), not entities.
- **Constructor injection**: one constructor (or Lombok's `@RequiredArgsConstructor`)
  and `final` fields. In Kotlin: `class OrderService(private val orders: OrderRepo)`.
- **Configuration**: `application-{profile}` files override `application.yml`, and
  environment variables (`SPRING_DATASOURCE_URL`) and command-line arguments override
  both. Bind settings to a `@ConfigurationProperties` record (a Kotlin data class with
  `val`s) with `@Validated`, so bad config fails at startup.
- **Transactions**: `@Transactional` on the service method that is one unit of work,
  `readOnly = true` for queries. It works through a proxy, so only calls that come in
  through the bean are intercepted. Only unchecked exceptions roll back by default;
  checked ones (`IOException`, also from Kotlin) commit unless you set `rollbackFor`.
- **Data access**: Spring Data repositories. Load what a use case needs with a fetch
  join, `@EntityGraph` or a DTO projection. Make `@ManyToOne` and `@OneToOne` lazy (JPA
  defaults them to eager). Set `spring.jpa.open-in-view=false`; Boot defaults it on.
- **Errors**: one `@RestControllerAdvice` returning `ProblemDetail` (RFC 9457), often
  extending `ResponseEntityExceptionHandler` so Spring MVC's own exceptions match.
- **Logging**: SLF4J placeholders (`log.info("Order {} failed", id)`), exception last.
- **Kotlin**: `kotlin("plugin.spring")` opens Spring-annotated classes so they can be
  proxied, but not entities. `kotlin("plugin.jpa")` adds the no-arg constructors JPA
  needs, and from Kotlin 2.3.20 also opens `@Entity`, `@Embeddable` and
  `@MappedSuperclass` classes. On older Kotlin, add `allOpen { annotation(...) }` for
  those three `jakarta.persistence` annotations, or Hibernate can't create lazy proxies
  for final entity classes. Don't make entities data classes: generated `equals`,
  `hashCode` and `toString` touch lazy associations. Kotlin enforces Spring 7's JSpecify
  nullness annotations, so a Boot 4 upgrade can surface compile errors. For mocks, use
  MockK with springmockk's `@MockkBean` (5.x for Boot 4).

## Where to start reading

1. `settings.gradle(.kts)` or the root `pom.xml` (modules), then each build file: Boot
   version, Java toolchain, and the starters, which tell you what the app does.
2. The `@SpringBootApplication` class: its package is the component scan root, and
   `@Enable...` annotations switch features on.
3. `src/main/resources/application*.yml|properties`: profiles, data sources, external
   services, feature flags, and which profile is active by default.
4. `@Configuration` classes: the `SecurityFilterChain`, custom beans, and anything
   behind `@Profile` or `@ConditionalOnProperty`.
5. Entities, repositories and `db/migration` or `db/changelog`: the data model.
6. One `@RestController` method, traced down to the SQL it runs.
7. `src/test`: how the app starts for tests, and which database they really use.

## Common pitfalls

These show up often in agent-written Spring code:
- `@Transactional` on a `private` method, or a call from the same class (`this.save()`):
  the proxy is bypassed and no transaction starts.
- `LazyInitializationException` "fixed" with `FetchType.EAGER` everywhere or by turning
  open-in-view back on, instead of loading what the use case needs.
- N+1 queries: a loop that touches a lazy collection or calls a repository per row.
- HTTP or messaging calls inside `@Transactional`, which hold a database connection and
  any row locks for as long as the remote call takes.
- Blocking calls (JDBC, JPA, `.block()`) inside WebFlux or coroutine code, which stall
  the few event-loop threads the whole app shares.
- APIs from the wrong generation. On Java 17: `List.getFirst()` or virtual threads
  (Java 21). On Boot 3: Jackson 3 (`tools.jackson`). On Boot 3+: `javax.persistence`,
  `WebSecurityConfigurerAdapter`, `antMatchers`. On Boot 4: `@MockBean` (removed; use
  `@MockitoBean`). `RestTemplate` is deprecated for removal from Spring Framework 7.1
  (Boot 4.1 still uses 7.0), so prefer `RestClient` in new code.
- Boot 3 test-slice imports in a Boot 4 project. `@WebMvcTest` and `@DataJpaTest` moved
  from `org.springframework.boot.test.autoconfigure...` to
  `org.springframework.boot.webmvc.test.autoconfigure` and
  `org.springframework.boot.data.jpa.test.autoconfigure`, and need
  `spring-boot-starter-webmvc-test` or `spring-boot-starter-data-jpa-test`.
- No `@Valid` on a `@RequestBody` parameter (or no `@Validated` on the class, for
  method parameters), so the bean validation constraints never run.
- A new endpoint with no authorization rule, or `permitAll()` on a broad pattern to
  make a test pass. `@PreAuthorize` does nothing unless `@EnableMethodSecurity` is on.
- `http.csrf(csrf -> csrf.disable())` copied into an app that uses session cookies.
  It's only safe when browsers don't send credentials automatically (bearer tokens).
- No record-level check: `orderRepository.findById(id)` lets user A read user B's
  order. Query by owner (`findByIdAndCustomerId(id, userId)`) or check in the service.
- Binding a request body straight to an entity (mass assignment): the client can set
  `id`, `role` or `ownerId`. Bind to a DTO with only the editable fields.
- Swallowed exceptions: `catch (Exception e) { log.error(e.getMessage()); }`.
- Tests on H2 while production runs PostgreSQL or SQL Server: dialect, case
  sensitivity, constraints and locking differ. `@DataJpaTest` uses an embedded database
  if one is on the classpath; use Testcontainers and `replace = Replace.NONE` on
  `@AutoConfigureTestDatabase`. Its tests also roll back before anything is flushed, so
  constraint violations stay hidden unless you call `saveAndFlush` or `flush()`.
- String concatenation in `@Query`, `createQuery` or `JdbcTemplate` SQL.
- `management.endpoints.web.exposure.include=*` beyond local development: `env`,
  `configprops` and `heapdump` can leak secrets.

## Practice repos

All three are on Spring Boot 4.1. On 3.x, read them for structure only.

- **spring-projects/spring-petclinic**
  (https://github.com/spring-projects/spring-petclinic): the official sample, a
  server-rendered Thymeleaf app packaged by feature, with Maven and Gradle. Trace:
  - an owner search from `OwnerController` to `OwnerRepository`, and how many
    statements one results page runs (see `Owner.pets` and `default_batch_fetch_size`)
  - how a duplicate pet name is rejected when two requests race: the
    `unique_owner_pet_name` constraint (H2 vs. Postgres schema), `PetController`, and
    `PetClinicConcurrencyTests`
  - how `MySqlIntegrationTests` (Testcontainers) and `PostgresIntegrationTests` (Docker
    Compose) start a real database, and what the H2 tests can't catch
- **spring-petclinic/spring-petclinic-rest**
  (https://github.com/spring-petclinic/spring-petclinic-rest): the REST version, with
  an OpenAPI spec, MapStruct, `ProblemDetail` errors and role-based security. Trace:
  - how `openapi.yml` becomes the generated interfaces the controllers implement
  - which `PetRepository` implementation runs (jdbc, jpa or spring-data-jpa), and why
  - what `@PreAuthorize` does when `petclinic.security.enable` is false, and which pet
    endpoints in `OwnerRestControllerV1` check that the pet belongs to the owner
- **spring-petclinic/spring-petclinic-kotlin**
  (https://github.com/spring-petclinic/spring-petclinic-kotlin): a Kotlin port, not
  always idiomatic, which makes it good review practice. Trace:
  - how many queries `OwnerController.showOwner` runs for an owner with three pets
  - which entity classes are `open` (`PetType` and the `@MappedSuperclass` bases) and
    which are final (`Owner`, `Pet`), and what final entities mean for lazy loading
  - what happens when `OwnerRepository.findById` (non-null `Owner`) finds nothing

## Module notes

### reading-unfamiliar-code
Spring hides behavior in annotations, proxies and auto-configuration. Find what runs
with IntelliJ's gutter icons and "go to implementation", and check `@Profile` and
`@ConditionalOnProperty` on the candidates. Starting with `--debug` (the conditions
report), or `/actuator/beans` if exposed, confirms it. Filters, `@ControllerAdvice`,
aspects and security proxies never show at the call site, so check them early.

### testing
Use `@ParameterizedTest` with `@CsvSource` for boundary pairs (6 and 7 days, 499.99
and 500). Test HTTP with `@WebMvcTest` and `@MockitoBean` (`@MockkBean` in Kotlin),
queries with `@DataJpaTest` on Testcontainers, and wiring with a few `@SpringBootTest`s.
A service test with a mocked repository proves nothing about the query.

### debugging
In a Java stack trace the root cause is the last `Caused by:`. Skip the `... N more`
lines and proxy frames (`$$SpringCGLIB$$`, `jdk.proxy`) and find the first frame in
your own package. A startup failure prints "APPLICATION FAILED TO START" or a
`BeanCreationException` chain ending in the real problem. A
`DataIntegrityViolationException` wraps the database error: read the constraint name.

### data-modeling
The migration is the real schema, not the entity; `ddl-auto=validate` checks they
agree. Use `BigDecimal` for money, with precision and scale set in the migration. For
concurrent edits, add a `@Version` field and handle
`ObjectOptimisticLockingFailureException`. `@Lock(LockModeType.PESSIMISTIC_WRITE)` on a
repository method takes a row lock (`SELECT ... FOR UPDATE` on most databases).

### security-fundamentals
End the `SecurityFilterChain` with `anyRequest().authenticated()` (or `denyAll()`) so
new endpoints are protected by default. That only proves the caller is logged in, so
also check record ownership on every data access (see Common pitfalls). Keep secrets in
environment variables or a secret manager, not committed `application-*.yml`. Expose
only `health` and `info` from Actuator in production, and run Dependency-Check in CI.

### owning-agent-features
Before accepting an agent's Spring diff, check five things:
- the APIs match the project's Boot and Java versions
- `@Transactional` sits where it takes effect (public, called through the bean)
- the query count doesn't grow with the rows
- every new endpoint has an authorization rule and a record-level check
- the tests run against the same database engine as production
