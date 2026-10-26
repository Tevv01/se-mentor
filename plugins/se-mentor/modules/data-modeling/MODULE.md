---
name: data-modeling
description: Modeling data and working with databases. Turning requirements into a schema that enforces the rules, writing queries that stay fast, and changing a live schema without breaking it.
---

# Data modeling

Code is easy to rewrite. Data is not: a schema outlives the code around it, and a bad
migration can lock production or lose rows. Agents produce schemas, ORM code and
migrations that work on a laptop with ten rows and fail at a million. The skill is
**getting the shape of the data and its rules into the schema, and knowing what each
query and migration will do to a real database under real load**.

## What good looks like

- Given a paragraph of requirements, you can list the entities, relationships with
  cardinality (1:1, 1:N, N:M) and keys in ~15 minutes, and name the questions the
  requirements leave open ("can an order have zero lines?").
- For each business rule, you can say whether the database enforces it (NOT NULL,
  UNIQUE, foreign key, CHECK) or the application does, and why.
- Given a slow query, you can read its EXPLAIN output in a few minutes, tell a full scan
  from an index lookup, and propose the index that fixes it.
- For any multi-step write, you can point to the transaction boundary and say what goes
  wrong if two requests run it at once.
- Before a migration touches real data, you can say whether it locks the table, roughly
  how long it takes at production size, and how to roll it back.
- In agent-written data access code, you spot N+1 queries, missing indexes and
  unbounded queries within a few minutes of review.

## Levels

1. **Table maker**: creates tables that mirror a screen or a JSON payload. Lets the ORM
   or the agent pick constraints and indexes. Hasn't read a query plan.
2. **Relater**: models entities with primary and foreign keys and uses join tables for
   many-to-many. Adds NOT NULL and UNIQUE when reminded. Doesn't check query plans.
3. **Constrainer**: puts invariants in the schema unprompted, indexes for real queries
   and confirms with EXPLAIN. Catches N+1 queries in review. Migrations run, but aren't
   always safe on large tables.
4. **Operator**: plans migrations for live systems (expand/contract, batched backfills,
   lock-aware DDL, rollback). Chooses transaction boundaries on purpose. Denormalizes
   only for a measured reason, with a plan to keep the copies in sync.
5. **Steward**: shapes a team's data model over time and reviews others' schemas and
   migrations. Predicts locking and planner trouble before it happens. Teaches it.

## Techniques

- **Nouns, verbs, numbers**: nouns in the requirements are candidate entities, verbs are
  relationships. For each relationship ask "how many on each side, and can it be zero?"
  Write it as `Customer 1-N Order`, `Order N-M Product via OrderLine`.
- **One fact, one place**: normalize by default so each fact is stored once. Break it
  only for a measured reason, and write down what keeps the copies in sync. A snapshot
  (the price at order time) is a different fact, not a duplicate.
- **Rules in the schema**: for every rule, ask "can the database enforce this?" Use NOT
  NULL, UNIQUE (composite, or partial where supported), foreign keys with an explicit ON DELETE, and
  CHECK. App validation gives good errors; the constraint holds when requests race.
- **Index from the query**: start from the WHERE, JOIN and ORDER BY of real queries, not
  from columns. In a composite index, equality columns go first, then range or sort.
  Confirm with EXPLAIN. Every index slows writes, so each one needs a query.
- **Draw the transaction boundary**: mark where each multi-step write starts and ends,
  then ask "what if another request runs between these two lines?" A plain transaction
  at the default isolation level (usually READ COMMITTED) does not stop that race. Use a
  unique constraint, an atomic conditional update (`UPDATE ... SET seats = seats - 1
  WHERE seats > 0`), a row lock (`SELECT ... FOR UPDATE`), or SERIALIZABLE with retry.
  Keep transactions short, with no network calls.
- **Count the queries**: log queries in development and load the page with 1 row, then
  50. If the count grows with the rows, it's N+1. Fix it with a join, a batched
  `WHERE id IN (...)`, or the ORM's eager loading.
- **Expand, migrate, contract**: on a live system, never rename or drop in one step. Add
  the new column, write to both, backfill in batches, switch reads, and drop the old one
  in a later deploy. Each step deploys and rolls back on its own.
- **Ask what it locks**: type changes, adding NOT NULL or a validated foreign key, or an
  index built without the online option can rewrite or lock a table for minutes. This
  varies a lot by database and version (e.g. Postgres has `NOT VALID` then `VALIDATE`
  for constraints), so check its docs and try it on a copy with realistic row counts.

## On-the-job prompts

Scale to the learner's level from the skills matrix. Levels 1-2 get concrete hints
("what should happen to the order lines when an order is deleted?"). Levels 3+ get open
questions ("what will this query do at a million rows?").

- **When** a feature needs new tables or columns → before writing the schema, ask the
  learner to sketch entities, relationships and cardinality, and name one rule the
  schema should enforce. At level 1-2, offer the nouns from the request as a start.
  Then compare with your design and discuss the differences.
- **When** you have written a schema or migration → list the constraints, indexes and
  ON DELETE behavior you chose (and what you left out on purpose), and ask which
  business rule is still unenforced.
- **When** you have written code that loads related data in a loop (including ORM lazy
  loading) → don't fix it silently. Ask how many queries it runs for 100 rows. At level
  1-2, have them turn on query logging and count.
- **When** a new query filters or sorts on a column, or a query is slow → ask the
  learner to predict whether it uses an index, then run EXPLAIN together. At level 3+,
  ask which index they would add and in what column order.
- **When** a migration renames, drops, changes a type, adds NOT NULL or indexes an
  existing table → stop before running it. Ask what it locks, how long it takes at
  production size and how to roll back. At level 3+, ask for the expand/contract steps.
- **When** code reads and then writes (check, then insert; read a balance, then update)
  → ask what happens if two requests run it at once, and what guarantees the rule. If
  the answer is "it's in a transaction", ask which isolation level, and whether that
  actually prevents it.

## Gym drills

Use a practice repo from the learner's stack pack, or a scratch project with a local
SQLite database if none is set. Time-box every drill. The agent runs the SQL to check
results and quotes the actual plan output. With SQLite, enable `PRAGMA foreign_keys = ON`
on every connection (it's off by default), and accept integer minor units (cents) as the
fix for money, since SQLite's DECIMAL is not exact. DECIMAL is the right answer in
Postgres or SQL Server.

- **Model the brief** (levels 1-3, 20 min): the agent writes a short requirements
  paragraph (room booking, course enrollment) with 2-3 hidden ambiguities. The learner
  writes the schema as DDL plus questions for the client. The agent grades missing
  entities, wrong cardinality, unenforced rules and ambiguities asked about.
- **Find the flaws** (levels 2-4, 15 min): the agent writes a schema with 3-4 planted
  flaws (a comma-separated list in a column, a missing foreign key, no UNIQUE on a
  natural key, money as a float). The learner finds and fixes them. Score found/planted.
- **Explain the plan** (levels 2-4, 20 min): the agent seeds a SQLite table with ~100k
  rows and gives 3 queries. The learner predicts scan or index for each, runs `EXPLAIN
  QUERY PLAN`, then adds one index for the slowest and times it before and after. If the
  learner's work database is Postgres or SQL Server, use it instead: their plan output
  looks different.
- **Count the queries** (levels 2-4, 15 min): the agent writes a script that lists
  orders with their customer and lines, with an N+1 inside. The learner logs queries
  for 10 and 100 orders, fixes it, and shows the count no longer grows.
- **Race it** (levels 3-5, 20 min): the agent writes a read-modify-write (booking the
  last seat) with a short sleep between the read and the write, plus a script that runs
  it 20 times in parallel. The learner predicts the failure, reproduces it, fixes it
  (constraint or atomic update) and reruns. SQLite works when the read and the write are
  separate statements, the usual naive code. Wrapping them in a transaction there turns
  the race into "database is locked" errors instead, so the key records which setup the
  drill uses.
- **Plan the migration** (levels 3-5, 25 min): the agent describes a change to a live
  20M-row table (rename a column, or make `email` unique when duplicates exist). The
  learner writes the deploy-by-deploy plan with backfill batching, lock risk and
  rollback per step. The agent flags steps that break running code, lock or lose data.

## Signals to log

- Model the brief: entities and relationships right / missed / wrong, and ambiguities
  asked about out of planted. Find the flaws: flaws found out of planted.
- Plan prediction hit rate: scan vs. index called correctly before running EXPLAIN.
- N+1 and missing-index catches in real work: spotted by the learner vs. the agent.
- Migration safety: migrations where the learner named lock risk and rollback before
  running, and unsafe steps left in Plan the migration.
- Rules in the schema: rules in the learner's designs enforced by constraints vs. only
  in application code.
