---
name: python-web
description: Python web backends. FastAPI with Pydantic and SQLAlchemy/Alembic, Django with Django REST Framework, pytest, uv or pip, ruff, mypy or pyright.
---

# Python web (FastAPI, Django, DRF)

Python 3.11 to 3.15 are supported. 3.10 reached end of life on 1 October 2026 and 3.11
follows in October 2027. Django 5.2 is the current LTS (security fixes until April 2028)
and 6.1 the latest release. 4.2 LTS lost support in April 2026 but is still common in
client code. FastAPI is still on 0.x releases and has required Pydantic v2 since 0.126.
SQLAlchemy is on 2.1, but older projects often use 1.x-style `session.query()` or
Pydantic v1. Check `pyproject.toml` and the lockfile before trusting an agent's API.

## Tooling and commands

- Environment: `uv sync` creates `.venv` from `uv.lock`, `uv add <pkg>` adds a
  dependency and `uv run <cmd>` runs inside the environment. With pip:
  `python -m venv .venv`, activate it (`source .venv/bin/activate`, or
  `.venv\Scripts\activate` on Windows), then `pip install -r requirements.txt`.
- Dev server: `fastapi dev` (from `fastapi[standard]`) or
  `uvicorn app.main:app --reload`. Django: `python manage.py runserver`.
- Test: `pytest tests/test_orders.py::test_refund_after_deadline` runs one test and
  `pytest -k "refund and not slow"` selects by name. Add `-x` to stop at the first
  failure, `--lf` to rerun last failures. Without pytest-django, Django uses
  `python manage.py test orders.tests.RefundTests.test_after_deadline`.
- Lint, format, types: `ruff check .` (`--fix`), `ruff format .`, then `mypy .` or
  `pyright`. Django needs `django-stubs` for mypy to understand the ORM.
- Alembic: `alembic revision --autogenerate -m "add order status"`,
  `alembic upgrade head`, `alembic downgrade -1`. `alembic upgrade head --sql` prints
  the SQL without running it. Autogenerate sees a renamed column as drop plus add.
- Django migrations: `python manage.py makemigrations`, `migrate`, and
  `sqlmigrate <app_label> <migration_name>` to see the SQL. In CI,
  `makemigrations --check --dry-run` fails when a model change has no migration.
- Generated SQL: `create_engine(url, echo=True)` logs every SQLAlchemy statement. In
  Django, `print(queryset.query)` is close to the real SQL (parameters aren't quoted),
  `queryset.explain()` shows the plan, and django-debug-toolbar counts queries per page.
- Vulnerabilities: `pip-audit` (active environment) or `pip-audit -r requirements.txt`.
- Debugging: `breakpoint()` drops into pdb, and `pytest --pdb` opens it at a failure.
  For an IDE, start the server under debugpy without the reloader and attach:
  `python -m debugpy --listen 5678 --wait-for-client -m uvicorn app.main:app`, or
  `python -m debugpy --listen 5678 manage.py runserver --noreload`.

## Idioms and conventions

- **Type hints, validation at the boundary**: mypy or pyright checks hints; nothing
  enforces them at runtime. Validate untrusted data where it enters: a Pydantic model as
  the body and `response_model` in FastAPI, `serializer.is_valid(raise_exception=True)`
  in DRF. Separate input and output schemas, so clients can't set `owner_id` and
  responses don't leak `hashed_password`.
- **FastAPI dependency injection**: `Depends()` supplies the session, current user and
  settings, often as `Annotated` aliases (`SessionDep = Annotated[Session,
  Depends(get_db)]`). A dependency with `yield` cleans up after the response. Tests swap
  dependencies with `app.dependency_overrides`.
- **Settings from the environment**: `pydantic-settings`
  (`class Settings(BaseSettings)`) in FastAPI. In Django, `django-environ`
  (`DATABASES = {"default": env.db()}`) or `os.environ`. A missing value should fail at
  startup. Commit `.env.example`, never `.env`.
- **Where Django logic goes**: the "fat models" style puts it in model methods and
  managers. The "services" style (e.g. HackSoft's Django Styleguide) puts writes in
  service functions and reads in selectors. Both work. Follow the codebase.
- **Async vs sync in FastAPI**: `def` endpoints and dependencies run in a threadpool,
  `async def` ones on the event loop. `async def` only helps when everything it waits on
  is async (`httpx.AsyncClient`, `AsyncSession`). One blocking call in it stalls every
  request on that worker. A `def` endpoint with a sync session is a correct choice.
- **Logging**: `logging.getLogger(__name__)` per module, configured once. Put values in
  fields (`extra={"order_id": order.id}` with a JSON formatter, or structlog's
  `log.info("order_paid", order_id=order.id)`), not f-strings. Use `logger.exception()`
  inside `except` to keep the traceback.
- **Transactions**: Django autocommits each query, so wrap multi-step writes in
  `transaction.atomic()`, and queue emails or Celery tasks with
  `transaction.on_commit()`. SQLAlchemy: one session per request (a `yield`
  dependency), and `with session.begin():` commits, or rolls back on an exception.

## Where to start reading

1. `pyproject.toml` or `requirements*.txt` and the lockfile: Python version, frameworks,
   and what the system talks to (database driver, Celery, Redis, httpx, boto3).
2. `Dockerfile`, `docker-compose.yml`, `Makefile` or `scripts/`: the real start, test
   and migrate commands.
3. FastAPI: the file with `app = FastAPI()`: routers, middleware, exception handlers,
   `lifespan`. Django: settings (`INSTALLED_APPS`, `MIDDLEWARE`, `DATABASES`,
   `REST_FRAMEWORK`, `AUTH_USER_MODEL`), then the root `urls.py`.
4. Shared dependencies (`deps.py` or similar: session, current user), or DRF
   permission classes and base viewsets.
5. Models and migrations (`alembic/versions/`, each app's `migrations/`).
6. One endpoint, traced from router or `urls.py` through the schema or serializer and
   service down to the query.
7. Django's hidden behavior (signals, middleware, custom managers, `save()` overrides),
   then `conftest.py`: how tests get the app, a database and users.

## Common pitfalls

These show up often in agent-written Python web code:
- Blocking calls inside `async def` (`requests`, `time.sleep()`, a sync session). Use
  the async library or a plain `def` endpoint. Ruff's `ASYNC` rules catch some. In
  Django, a sync ORM call in an async view raises `SynchronousOnlyOperation`. Use the
  async ORM where it exists (`await Order.objects.aget(pk=pk)`, `async for`),
  `sync_to_async` for the rest, and never set `DJANGO_ALLOW_ASYNC_UNSAFE`.
- N+1 queries from a loop or nested serializer reading `order.customer`. Django:
  `select_related()` for foreign keys, `prefetch_related()` for reverse and
  many-to-many, in the viewset's `get_queryset()`. SQLAlchemy:
  `.options(selectinload(Order.lines))` or `joinedload()`. `lazy="raise"` on a
  relationship turns stray lazy loads into errors.
- Mutable default arguments (`def add(item, items=[])`) share one list across calls.
  Default to `None` (ruff `B006`). Pydantic model fields are safe.
- `except Exception: pass` or bare `except:`. Catch the specific error, or
  `logger.exception()` and re-raise (ruff `BLE001`, `S110`).
- SQL built with f-strings in `cursor.execute()`, `text()` or `.raw()`. Pass parameters:
  `cursor.execute("... WHERE id = %s", [user_id])`, `text("... WHERE id = :id")`.
- Pydantic v1 and v2 mixed up. `.dict()`, `.parse_obj()`, `@validator` and `orm_mode`
  are v1; v2 has `.model_dump()`, `.model_validate()`, `@field_validator` and
  `ConfigDict(from_attributes=True)`, and `BaseSettings` moved to `pydantic-settings`.
  Many v1 calls still run on v2 with a deprecation warning, so read the warnings.
- `DEBUG = True` or a hardcoded `SECRET_KEY` left over from `startproject`. Read both
  from the environment, default `DEBUG` to off, and run `manage.py check --deploy`.
- No permission class. If `DEFAULT_PERMISSION_CLASSES` isn't set, DRF allows anyone.
- No object-level check. DRF runs `has_object_permission()` only from `get_object()`:
  never on list views, and not when an override skips `check_object_permissions()`.
  Filter `get_queryset()` by the user. In FastAPI, compare the owner with the current
  user, or filter by owner in the query.
- Open CORS with credentials. `CORSMiddleware(allow_origins=["*"],
  allow_credentials=True)` makes Starlette echo back any `Origin`, so any site can make
  logged-in requests. The same goes for django-cors-headers with
  `CORS_ALLOW_ALL_ORIGINS` and `CORS_ALLOW_CREDENTIALS`. List origins explicitly.
- Unbounded lists. DRF doesn't paginate unless `DEFAULT_PAGINATION_CLASS` is set, and
  agent-written FastAPI code often calls `.all()` with no limit. Set a default page size
  and a maximum.
- Mass assignment: `fields = "__all__"` on a `ModelSerializer` lets clients set `owner`
  or `is_staff`. List fields and use `read_only_fields`. In FastAPI, never take the ORM
  model as the request body.
- Unpinned dependencies. Commit a lockfile (`uv.lock`, or `uv pip compile` output).
- Packages that don't exist or are typosquats. Agents invent plausible names, and
  attackers register them. Check the PyPI page, repo and maintainers first. Real names
  confuse too: `pip install jwt` is not PyJWT, though both import as `jwt`.
- Naive datetimes from `datetime.now()` or the deprecated `datetime.utcnow()`. Use
  `datetime.now(UTC)` or `django.utils.timezone.now()`, keep `USE_TZ = True` (the
  default since Django 5.0), and `DateTime(timezone=True)` in SQLAlchemy (ruff `DTZ`).
- Data migrations that import models directly instead of using `apps.get_model()`, or
  `RunPython` with no `reverse_code`, which can't be rolled back.

## Practice repos

The FastAPI template requires Python 3.14, paperless-ngx is on Django 5.2 and NetBox on
6.1. Check your project's versions before copying APIs.

- **fastapi/full-stack-fastapi-template**
  (https://github.com/fastapi/full-stack-fastapi-template): the official template, with
  a React frontend. The backend uses SQLModel (SQLAlchemy tables that are also Pydantic
  models), Alembic, pytest and uv, and is small enough to read in an afternoon. Trace:
  - how a request becomes `CurrentUser`, in `backend/app/api/deps.py`
  - the ownership checks in `backend/app/api/routes/items.py`, for lists and for
    read, update and delete
  - what the `db` fixture in `backend/tests/conftest.py` does when the session ends,
    and why tests need their own database
- **paperless-ngx/paperless-ngx** (https://github.com/paperless-ngx/paperless-ngx):
  document management on Django and DRF, with Celery and django-guardian object
  permissions. Tests use pytest-django. It is GPL-licensed, so don't copy its code into
  client work. Trace:
  - an upload: `PostDocumentView` in `src/documents/views.py` queues the `consume_file`
    task in `src/documents/tasks.py`. What does the client get back?
  - how `DocumentViewSet` pairs `PaperlessObjectPermissions` (single documents) with
    the `PermittedObjectsFilter` backend in `src/documents/filters.py` (lists)
  - which N+1 each `select_related` and `prefetch_related` in
    `DocumentViewSet.get_queryset()` prevents
- **netbox-community/netbox** (https://github.com/netbox-community/netbox): a large
  network inventory app on Django and DRF, with constraint-based object permissions and
  a change log. Tests use Django's test runner. A stretch repo. Trace:
  - how `BaseViewSet.initial()` in `netbox/netbox/api/viewsets/__init__.py` limits a
    request to permitted objects with `restrict()` (`netbox/utilities/querysets.py`)
  - how a save becomes an `ObjectChange` row via `netbox/core/signals.py`
  - why `perform_create()` in the same viewsets file wraps the save in
    `transaction.atomic()`

## Module notes

### reading-unfamiliar-code
FastAPI wiring is explicit: follow `include_router` and `Depends()`, and open `/docs`
for every route. Django hides more: middleware, signals, custom managers and `save()`
overrides never show at the call site. A DRF `ModelViewSet` on a router has no visible
`get` or `post`; its mixins supply them.

### testing
Use `@pytest.mark.parametrize` for boundary pairs (6 and 7 days, 499.99 and 500) and
`conftest.py` for shared fixtures. In FastAPI, `TestClient` with
`app.dependency_overrides` swaps auth or external clients. pytest-django has
`@pytest.mark.django_db` and `django_assert_num_queries`. Test against your production
database engine (Testcontainers or Docker Compose), not SQLite.

### debugging
Python prints the most recent call last, so the frame you want is the last one in your
own package. In chained errors the original prints first, then "The above exception was
the direct cause of the following exception" (`raise ... from`) or "During handling of
the above exception, another exception occurred". `pytest -l` shows local variables.

### data-modeling
Store money as `DecimalField` or SQLAlchemy `Numeric`, never float. Put rules in
`Meta.constraints` (`UniqueConstraint`, `CheckConstraint(condition=Q(...), name=...)`)
or `__table_args__`. `condition=` is Django 5.1+. Older versions use `check=`, which 6.0
removed, so match the project's version. Pick each
`on_delete` on purpose. For an atomic conditional update, use
`Event.objects.filter(pk=pk, seats__gt=0).update(seats=F("seats") - 1)`, which returns
0 when sold out. On big Postgres tables, add indexes with `AddIndexConcurrently` in a
non-atomic migration.

### security-fundamentals
In FastAPI, put the auth dependency on the router (`APIRouter(dependencies=[...])`) so
new routes inherit it. Make tokens with `secrets`, not `random`. Common pitfalls lists
the DRF permission, CORS, settings and dependency checks to run on every diff.

### owning-agent-features
Before accepting an agent's Python diff, check four things:
- every `async def` path waits only on async I/O
- Pydantic and SQLAlchemy calls match the versions in the lockfile
- query counts don't grow with the number of rows
- new migrations were read as SQL, and new packages checked on PyPI
