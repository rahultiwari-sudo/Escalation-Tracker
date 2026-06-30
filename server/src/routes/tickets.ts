import { Router } from "express";
import { z } from "zod";
import db from "../db/connection.js";
import { generateTicketId } from "../services/ticketId.js";
import { computeSlaDeadline } from "../services/sla.js";

export const ticketsRouter = Router();

const createTicketSchema = z.object({
  subject: z.string().min(1),
  requester_name: z.string().optional(),
  requester_email: z.string().optional(),
  account_name: z.string().optional(),
  am_owner: z.string().optional(),
  team: z.string().optional(),
  priority: z.enum(["Critical", "High", "Normal"]).default("Normal"),
  category: z.string().optional(),
  description: z.string().optional(),
});

// GET /api/tickets - list with optional filters
ticketsRouter.get("/", (req, res) => {
  const { status, priority, am_owner, team } = req.query as Record<string, string | undefined>;

  let query = "SELECT * FROM tickets WHERE 1=1";
  const params: any[] = [];

  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  if (priority) {
    query += " AND priority = ?";
    params.push(priority);
  }
  if (am_owner) {
    query += " AND am_owner = ?";
    params.push(am_owner);
  }
  if (team) {
    query += " AND team = ?";
    params.push(team);
  }
  query += " ORDER BY created_at DESC";

  const tickets = db.prepare(query).all(...params);
  res.json(tickets);
});

// GET /api/tickets/:id - single ticket with thread + event history
ticketsRouter.get("/:id", (req, res) => {
  const ticket = db.prepare("SELECT * FROM tickets WHERE id = ?").get(req.params.id);
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const threads = db
    .prepare("SELECT * FROM ticket_threads WHERE ticket_id = ? ORDER BY received_at ASC")
    .all(req.params.id);
  const events = db
    .prepare("SELECT * FROM ticket_events WHERE ticket_id = ? ORDER BY created_at ASC")
    .all(req.params.id);

  res.json({ ...ticket, threads, events });
});

// POST /api/tickets - manual creation (web form path)
ticketsRouter.post("/", (req, res) => {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const data = parsed.data;
  const id = generateTicketId();
  const slaDeadline = computeSlaDeadline(data.priority);

  db.prepare(
    `INSERT INTO tickets (id, subject, requester_name, requester_email, account_name, am_owner, team, priority, status, category, description, sla_deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, ?, ?)`
  ).run(
    id,
    data.subject,
    data.requester_name ?? null,
    data.requester_email ?? null,
    data.account_name ?? null,
    data.am_owner ?? null,
    data.team ?? null,
    data.priority,
    data.category ?? null,
    data.description ?? null,
    slaDeadline
  );

  db.prepare(
    `INSERT INTO ticket_events (ticket_id, event_type, actor, detail) VALUES (?, 'created', 'manual', 'Created via web form')`
  ).run(id);

  res.status(201).json({ id });
});

// PATCH /api/tickets/:id - update status, assignment, etc.
const updateTicketSchema = z.object({
  status: z.enum(["Open", "In Progress", "Waiting", "Closed"]).optional(),
  am_owner: z.string().optional(),
  priority: z.enum(["Critical", "High", "Normal"]).optional(),
  team: z.string().optional(),
});

ticketsRouter.patch("/:id", (req, res) => {
  const parsed = updateTicketSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const existing = db.prepare("SELECT * FROM tickets WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Ticket not found" });

  const fields = parsed.data;
  const setClauses: string[] = [];
  const values: any[] = [];

  for (const [key, value] of Object.entries(fields)) {
    setClauses.push(`${key} = ?`);
    values.push(value);
  }
  if (setClauses.length === 0) return res.status(400).json({ error: "No fields to update" });

  setClauses.push("last_updated_at = datetime('now')");
  if (fields.status === "Closed") setClauses.push("closed_at = datetime('now')");

  values.push(req.params.id);
  db.prepare(`UPDATE tickets SET ${setClauses.join(", ")} WHERE id = ?`).run(...values);

  db.prepare(
    `INSERT INTO ticket_events (ticket_id, event_type, actor, detail) VALUES (?, 'status_change', 'user', ?)`
  ).run(req.params.id, JSON.stringify(fields));

  res.json({ ok: true });
});

// GET /api/tickets/stats/summary - dashboard numbers
ticketsRouter.get("/stats/summary", (_req, res) => {
  const open = db.prepare("SELECT COUNT(*) c FROM tickets WHERE status != 'Closed'").get() as { c: number };
  const breached = db.prepare("SELECT COUNT(*) c FROM tickets WHERE breached = 1 AND status != 'Closed'").get() as { c: number };
  const closedThisWeek = db
    .prepare(
      "SELECT COUNT(*) c FROM tickets WHERE status = 'Closed' AND closed_at >= datetime('now', '-7 days')"
    )
    .get() as { c: number };
  const avgResolutionHours = db
    .prepare(
      `SELECT AVG((julianday(closed_at) - julianday(created_at)) * 24) avg_hours
       FROM tickets WHERE status = 'Closed' AND closed_at IS NOT NULL`
    )
    .get() as { avg_hours: number | null };

  res.json({
    open: open.c,
    breached: breached.c,
    closedThisWeek: closedThisWeek.c,
    avgResolutionHours: avgResolutionHours.avg_hours
      ? Math.round(avgResolutionHours.avg_hours * 10) / 10
      : null,
  });
});
