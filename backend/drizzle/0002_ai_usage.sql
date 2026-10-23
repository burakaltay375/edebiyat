CREATE TABLE IF NOT EXISTS ai_usage (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users(id),
  minute_window INTEGER NOT NULL,
  minute_count INTEGER NOT NULL,
  hour_window INTEGER NOT NULL,
  hour_count INTEGER NOT NULL
);
