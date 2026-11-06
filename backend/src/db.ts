import Database from 'better-sqlite3'

const schema = `
  CREATE TABLE IF NOT EXISTS catalog (
    sku TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0)
  ) STRICT;

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    paypal_order_id TEXT NOT NULL UNIQUE,
    paypal_capture_id TEXT UNIQUE,
    status TEXT NOT NULL CHECK (status IN ('CREATED','AWAITING_APPROVAL','CAPTURED','FAILED')),
    total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
    currency TEXT NOT NULL DEFAULT 'USD' CHECK (currency = 'USD'),
    approval_url TEXT,
    created_at TEXT NOT NULL
  ) STRICT;

  CREATE TABLE IF NOT EXISTS order_lines (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    sku TEXT NOT NULL REFERENCES catalog(sku),
    name TEXT NOT NULL,
    qty INTEGER NOT NULL CHECK (qty > 0),
    unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
    lot_number TEXT
  ) STRICT;

  CREATE TABLE IF NOT EXISTS recalls (
    id TEXT PRIMARY KEY,
    notice_text TEXT NOT NULL,
    extraction_json TEXT NOT NULL,
    sku TEXT,
    lot_prefix TEXT,
    lot_start INTEGER,
    lot_end INTEGER,
    status TEXT NOT NULL CHECK (status IN ('DRAFT','APPROVED','COMPLETED')),
    created_at TEXT NOT NULL,
    approved_plan_json TEXT
  ) STRICT;

  CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    recall_id TEXT NOT NULL REFERENCES recalls(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt > 0),
    paypal_request_id TEXT NOT NULL UNIQUE,
    paypal_refund_id TEXT,
    status TEXT NOT NULL CHECK (status IN ('INITIATED','PENDING','COMPLETED','FAILED','CANCELLED')),
    error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    attempt_submitted_at TEXT,
    UNIQUE(recall_id, order_id)
  ) STRICT;

  CREATE INDEX IF NOT EXISTS order_lines_by_order ON order_lines(order_id);
  CREATE INDEX IF NOT EXISTS refunds_by_order ON refunds(order_id, status);
  CREATE TABLE IF NOT EXISTS demo_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    seed_key TEXT NOT NULL
  ) STRICT;
`

export function openDb(path: string) {
  const db = new Database(path)
  try {
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
    db.exec(schema)
    return db
  } catch (error) {
    db.close()
    throw error
  }
}

export type Db = ReturnType<typeof openDb>
