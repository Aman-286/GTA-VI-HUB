ALTER TABLE users ADD COLUMN email TEXT;
CREATE UNIQUE INDEX users_email_unique ON users(email) WHERE email IS NOT NULL;
CREATE TABLE credentials (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 password_hash TEXT NOT NULL,
 recovery_hash TEXT NOT NULL
);
