
-- This makes sure that foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

--Create your tables with SQL commands here (watch out for slight syntactical differences with SQLite vs MySQL)
--Insert default data (if necessary here)

--Events table for organiser and attendee pages
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT,
  event_time TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  published_at TEXT,
  status TEXT DEFAULT 'draft',
  tickets_full INTEGER DEFAULT 0,
  tickets_full_total INTEGER DEFAULT 0,
  tickets_concession INTEGER DEFAULT 0,
  tickets_concession_total INTEGER DEFAULT 0,
  price_full REAL DEFAULT 0.00,
  price_concession REAL DEFAULT 0.00,
  updated_at TEXT
);

--Inserting data for the events
INSERT INTO events (
  title,
  description,
  event_date,
  event_time,
  tickets_full,
  price_full,
  tickets_concession,
  price_concession,
  status,
  tickets_full_total,
  tickets_concession_total,
  created_at,
  published_at,
  updated_at
) VALUES
('Beginner Hip-Hop', 'Learn the basics of Hip-Hop', '2025-07-13', '12.30', 20, 20.00, 10, 15.00, 'published', 20, 10, '2025-06-01 10:00:00', '2025-06-10 12:00:00', NULL),
('Ballet Lessons', 'Sign-up for ballet lessons', '2025-07-24', '18.00', 25, 45.00, 15, 75.00, 'published', 25, 15, '2025-06-15 11:00:00', '2025-06-20 14:00:00', NULL),
('Intermediate Wacking', 'Sign-up to learn battles from some of the best wackers', '2025-08-04', '20.00', 20, 25.00, 15, 15.00, 'draft', 20, 15, '2025-06-25 15:00:00', NULL, '2025-06-25 15:00:00');


--Site settings table (stores name + description shown to organiser and attendee)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL
);

--Insert default row for testing
INSERT OR IGNORE INTO settings (id, name, description)
VALUES (1, 'Dance Academy 101', 'Move to the beat');

--Bookings table for the tickets
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  name TEXT,
  email TEXT,
  tickets_full INTEGER DEFAULT 0,
  tickets_concession INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id)
);

COMMIT;