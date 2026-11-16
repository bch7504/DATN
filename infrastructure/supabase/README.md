# Supabase — shared database and storage

Status (16/11/2026): data copied, roles verified, local services connected to Supabase;
live acceptance results are recorded in [SPEC-15](../../docs/specs/15-supabase-shared-data-implementation.md).
The local infrastructure remains available. No local volume is removed by this workflow.

## Configuration

Copy [.env.example](.env.example) to `<repository>/.env.supabase` and fill the database
password and two S3 keys. The private copy is ignored by Git. Do not commit real values,
print the file, or paste it into chat. The supplied public host/project identifiers refer
to the StudyFlow project; change these together when targeting another project.

`SUPABASE_DB_*` is migration/admin input. It does not configure Java or Python automatically.
Runtime services require separate `studyflow_app` / `studyflow_ai` roles and the regular
`DATABASE_*` / `AI_DATABASE_URL` variables. Keep `app` and `ai` outside exposed client schemas;
use a private `studyflow-documents` bucket and retain all Java authorization checks.

## Read-only preflight

After explicit authorization to use the private file, run from the repository:

```powershell
& services/ai/.venv/Scripts/python.exe scripts/supabase_check.py --config .env.supabase
```

The check uses existing AI development dependencies (`psycopg`, `httpx`, `python-dotenv`).
It loads only the named file without environment interpolation; it does not load root `.env`.
It checks database connectivity and schema counts and issues a signed S3 HEAD bucket request.
It does not migrate data or modify the bucket/database. Output is sanitized status only.

See [SPEC-14](../../docs/specs/14-supabase-shared-data-plan.md) for the migration plan.

## Copy and verification tools

The commands below require explicit authorization to use the private configuration and
copy the source data. Stop Java and Python API/worker writers before taking the snapshot.
Keep local PostgreSQL and S3 running. The migration refuses a target with application tables.

```powershell
& services/ai/.venv/Scripts/python.exe scripts/supabase_migrate.py --config .env.supabase --apply
& services/ai/.venv/Scripts/python.exe scripts/supabase_verify.py --config .env.supabase
```

The copy creates a recovery archive under ignored `.runtime/`, copies and hashes every
source S3 object, then uses native PostgreSQL dump/restore in a single target transaction.
It only restores `app`/`ai`; managed Supabase schemas are retained. It provisions separate
runtime roles, revokes anonymous access to application schemas/tables and appends generated
runtime settings to the private config. No source data or volume is deleted.

An interrupted copy can leave uploaded objects or runtime roles even when database restore
rolled back. Stop and inspect sanitized metadata before retrying; do not reset a nonempty
target, overwrite mismatched objects, or run the migration again on the active shared DB.
The post-copy count comparison is valid while the source/target are still quiescent; counts
will naturally differ once the shared app starts accepting logins and new work.

## Run one local service with shared data

After verification, stop any old instance of the selected service first, then launch each
service individually (this does not recreate the removed start-all launcher):

```powershell
& services/ai/.venv/Scripts/python.exe scripts/supabase_run.py --config .env.supabase --service ai
& services/ai/.venv/Scripts/python.exe scripts/supabase_run.py --config .env.supabase --service worker
& services/ai/.venv/Scripts/python.exe scripts/supabase_run.py --config .env.supabase --service backend
```

The helper starts hidden processes; it uses runtime credentials rather than the migration
admin account, disables local account/seed bootstraps and automatic Flyway execution.
Schema upgrades on the shared DB must be coordinated by the migration owner. Python may
load its usual provider settings from the application's normal local configuration; the
helper itself only reads the explicitly supplied Supabase file. Provider keys remain separate
from database and S3 keys. The web app still calls `http://127.0.0.1:8088/api/v1` locally.

For a reviewed forward Java migration on the active shared DB, stop the Java writer first
and let the single migration owner run the admin-only command below, then restart Java:

```powershell
& services/ai/.venv/Scripts/python.exe scripts/supabase_schema_migrate.py --config .env.supabase --apply
```

The command mounts source migrations read-only and passes credentials through environment
variables to native Flyway; it never prints them. It is intended for the coordinated V33
account-username change; it does not reset data or give runtime roles schema-admin privileges.

To repeat the smoke checks, note that they create demo login sessions; `--ask` also makes one
real LLM call and saves a Tutor turn. They do not create test uploads, quizzes or enrollments:

```powershell
& services/ai/.venv/Scripts/python.exe scripts/supabase_smoke.py --config .env.supabase --ask
```

Teammates need their own local service runtimes and privately supplied runtime settings to
connect to the shared data. Git pull alone does not supply passwords, S3 keys or model keys.
They can copy [the runtime-only template](runtime/.env.example) to `.env.supabase.runtime`
and run `supabase_run.py --config .env.supabase.runtime --service ...`; this does not need
the migration/admin database password, a local database snapshot, or a copy marker from
the original machine. The shared database must already be provisioned; do not rerun the copy.
This setup has not deployed the web/Java/Python services to a public host. To return to the
retained local database later, stop cloud-connected writers and decide how to reconcile new
cloud data first; the original local copy does not automatically receive subsequent updates.
