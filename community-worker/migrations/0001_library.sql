CREATE TABLE levels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  level TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX levels_created_at ON levels(created_at DESC, id DESC);
