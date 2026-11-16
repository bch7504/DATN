-- Input: existing app.users. Output: Student/Teacher username equals their full email.
-- Preserve UUID, email, password, role and resource references; revoke refresh tokens
-- only for renamed accounts. Cross-account identifier conflicts abort the transaction.
-- Forward-only. Admin usernames and registration email-domain rules stay unchanged.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM app.users account
        JOIN app.users other
          ON other.id <> account.id
         AND LOWER(other.username) = LOWER(account.email)
        WHERE account.role IN ('STUDENT', 'TEACHER')
          AND account.username IS DISTINCT FROM account.email
    ) THEN
        RAISE EXCEPTION 'Email conflicts with another account login; resolve identities before migration'
            USING ERRCODE = '23505';
    END IF;
END
$$;

ALTER TABLE app.users ALTER COLUMN username TYPE VARCHAR(254);

WITH renamed AS (
    UPDATE app.users
       SET username = email, updated_at = NOW()
     WHERE role IN ('STUDENT', 'TEACHER')
       AND username IS DISTINCT FROM email
    RETURNING id
)
UPDATE app.refresh_tokens token
   SET revoked_at = NOW()
  FROM renamed
 WHERE token.user_id = renamed.id
   AND token.revoked_at IS NULL;
