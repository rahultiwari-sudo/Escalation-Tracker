-- Escalation Tracker schema
-- Mirrors the original 22-column Sheet but normalized into related tables.

CREATE TABLE IF NOT EXISTS sla_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  priority TEXT UNIQUE NOT NULL,         -- e.g. 'Critical', 'High', 'Normal'
  threshold_hours INTEGER NOT NULL,      -- 48 / 24 / 12 from original sheet
  description TEXT
);

CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,                   -- SG-YYYYMMDD-XXX
  subject TEXT NOT NULL,
  requester_name TEXT,
  requester_email TEXT,
  account_name TEXT,                     -- seller / client name
  am_owner TEXT,                         -- assigned AM
  team TEXT,                             -- e.g. Onboarding, CS, Payments
  priority TEXT NOT NULL DEFAULT 'Normal',
  status TEXT NOT NULL DEFAULT 'Open',   -- Open, In Progress, Waiting, Closed
  category TEXT,                         -- e.g. Billing, Performance, Technical
  description TEXT,
  gmail_thread_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  sla_deadline TEXT,
  first_response_at TEXT,
  closed_at TEXT,
  breached INTEGER NOT NULL DEFAULT 0,   -- 0/1 flag, set by SLA checker
  last_updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ticket_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  sender TEXT,
  snippet TEXT,
  received_at TEXT,
  direction TEXT DEFAULT 'inbound'       -- inbound / outbound
);

CREATE TABLE IF NOT EXISTS ticket_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,              -- created, status_change, assigned, sla_breach, closed, comment
  actor TEXT,                            -- who made the change
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_sla_deadline ON tickets(sla_deadline);
CREATE INDEX IF NOT EXISTS idx_threads_ticket ON ticket_threads(ticket_id);
CREATE INDEX IF NOT EXISTS idx_events_ticket ON ticket_events(ticket_id);

INSERT OR IGNORE INTO sla_rules (priority, threshold_hours, description) VALUES
  ('Critical', 12, 'Critical escalations - 12hr SLA'),
  ('High', 24, 'High priority - 24hr SLA'),
  ('Normal', 48, 'Standard escalations - 48hr SLA');
