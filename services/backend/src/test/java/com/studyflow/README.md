# Backend tests

Unit/integration/contract tests use synthetic fixtures and cover RBAC, membership, assignment, ownership, publication, Quiz lifecycle and scoring.

Database-backed integration tests use an isolated PostgreSQL container and require Docker. When Docker is unavailable, only those tests are skipped; unit and mocked-controller tests still run. The application and integration tests no longer use an embedded database. Testcontainers is pinned to the 1.21.x line to support newer Docker Engine versions; it is a test-only dependency.
