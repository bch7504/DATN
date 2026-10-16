#!/usr/bin/env bash
set -Eeuo pipefail

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${STUDYFLOW_APP_PASSWORD:?STUDYFLOW_APP_PASSWORD is required}"
: "${STUDYFLOW_AI_PASSWORD:?STUDYFLOW_AI_PASSWORD is required}"

psql \
  --username "${POSTGRES_USER}" \
  --dbname "${POSTGRES_DB}" \
  --set=ON_ERROR_STOP=1 \
  --set=app_password="${STUDYFLOW_APP_PASSWORD}" \
  --set=ai_password="${STUDYFLOW_AI_PASSWORD}" <<'SQL'
SELECT format('CREATE ROLE studyflow_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'studyflow_app') \gexec

SELECT format('ALTER ROLE studyflow_app LOGIN PASSWORD %L', :'app_password') \gexec

SELECT format('CREATE ROLE studyflow_ai LOGIN PASSWORD %L', :'ai_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'studyflow_ai') \gexec

SELECT format('ALTER ROLE studyflow_ai LOGIN PASSWORD %L', :'ai_password') \gexec

CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS app AUTHORIZATION studyflow_app;
ALTER SCHEMA app OWNER TO studyflow_app;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA app TO studyflow_app;

CREATE SCHEMA IF NOT EXISTS ai AUTHORIZATION studyflow_ai;
ALTER SCHEMA ai OWNER TO studyflow_ai;
REVOKE ALL ON SCHEMA ai FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA ai TO studyflow_ai;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO studyflow_app, studyflow_ai;
GRANT CONNECT ON DATABASE studyflow TO studyflow_app, studyflow_ai;

ALTER ROLE studyflow_app IN DATABASE studyflow SET search_path = app, public;
ALTER ROLE studyflow_ai IN DATABASE studyflow SET search_path = ai, public;
SQL
