import db from "../db/connection.js";

export interface SlaRule {
  priority: string;
  threshold_hours: number;
}

export function getSlaThresholdHours(priority: string): number {
  const rule = db
    .prepare(`SELECT threshold_hours FROM sla_rules WHERE priority = ?`)
    .get(priority) as { threshold_hours: number } | undefined;
  return rule?.threshold_hours ?? 48; // default to the loosest tier
}

export function computeSlaDeadline(priority: string, createdAt: Date = new Date()): string {
  const hours = getSlaThresholdHours(priority);
  const deadline = new Date(createdAt.getTime() + hours * 60 * 60 * 1000);
  return deadline.toISOString();
}

/**
 * Scans all open tickets and flags any past their SLA deadline.
 * Intended to be run on a cron schedule (see services/cron.ts).
 * Returns the list of newly-breached ticket IDs.
 */
export function checkSlaBreaches(): string[] {
  const nowIso = new Date().toISOString();

  const overdue = db
    .prepare(
      `SELECT id FROM tickets
       WHERE status NOT IN ('Closed')
       AND breached = 0
       AND sla_deadline IS NOT NULL
       AND sla_deadline < ?`
    )
    .all(nowIso) as { id: string }[];

  const markBreach = db.prepare(
    `UPDATE tickets SET breached = 1, last_updated_at = datetime('now') WHERE id = ?`
  );
  const logEvent = db.prepare(
    `INSERT INTO ticket_events (ticket_id, event_type, actor, detail) VALUES (?, 'sla_breach', 'system', 'SLA deadline passed')`
  );

  const tx = db.transaction((ids: string[]) => {
    for (const { id } of overdue) {
      markBreach.run(id);
      logEvent.run(id);
    }
  });
  tx(overdue.map((o) => o.id));

  return overdue.map((o) => o.id);
}
