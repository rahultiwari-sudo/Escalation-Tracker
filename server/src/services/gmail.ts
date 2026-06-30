import { google } from "googleapis";
import db from "../db/connection.js";
import { generateTicketId } from "./ticketId.js";
import { computeSlaDeadline } from "./sla.js";

/**
 * Gmail intake service.
 *
 * This replaces the Apps Script trigger from the original sheet-based system.
 * It polls a labeled inbox (e.g. "Escalations") for new threads and creates
 * tickets automatically, attaching the Gmail thread for later reference.
 *
 * SETUP REQUIRED (not yet wired in this scaffold):
 *  1. Create a Google Cloud project, enable the Gmail API.
 *  2. Create OAuth2 credentials (or a service account w/ domain-wide delegation
 *     if running unattended against a shared inbox).
 *  3. Set env vars: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN,
 *     GMAIL_LABEL (defaults to "Escalations").
 *  4. Call startGmailPolling() from index.ts once credentials are in place.
 *
 * Until those env vars are set, polling is a no-op so the rest of the app
 * runs fine without Gmail configured.
 */

const REQUIRED_ENV = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN"];

function isGmailConfigured(): boolean {
  return REQUIRED_ENV.every((key) => !!process.env[key]);
}

function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  return google.gmail({ version: "v1", auth: oauth2Client });
}

function inferPriority(subject: string, snippet: string): string {
  const text = `${subject} ${snippet}`.toLowerCase();
  if (text.includes("urgent") || text.includes("critical")) return "Critical";
  if (text.includes("escalation") || text.includes("breach")) return "High";
  return "Normal";
}

async function processThread(gmail: ReturnType<typeof getGmailClient>, threadId: string) {
  const existing = db
    .prepare(`SELECT ticket_id FROM ticket_threads WHERE gmail_thread_id = ? LIMIT 1`)
    .get(threadId);
  if (existing) return; // already tracked

  const thread = await gmail.users.threads.get({ userId: "me", id: threadId });
  const firstMsg = thread.data.messages?.[0];
  if (!firstMsg) return;

  const headers = firstMsg.payload?.headers || [];
  const subject = headers.find((h) => h.name === "Subject")?.value || "(no subject)";
  const from = headers.find((h) => h.name === "From")?.value || "unknown";
  const snippet = firstMsg.snippet || "";

  const priority = inferPriority(subject, snippet);
  const ticketId = generateTicketId();
  const slaDeadline = computeSlaDeadline(priority);

  db.prepare(
    `INSERT INTO tickets (id, subject, requester_email, priority, status, description, gmail_thread_id, sla_deadline)
     VALUES (?, ?, ?, ?, 'Open', ?, ?, ?)`
  ).run(ticketId, subject, from, priority, snippet, threadId, slaDeadline);

  db.prepare(
    `INSERT INTO ticket_threads (ticket_id, gmail_thread_id, sender, snippet, received_at, direction)
     VALUES (?, ?, ?, ?, datetime('now'), 'inbound')`
  ).run(ticketId, threadId, from, snippet);

  db.prepare(
    `INSERT INTO ticket_events (ticket_id, event_type, actor, detail)
     VALUES (?, 'created', 'gmail-intake', 'Auto-created from Gmail thread')`
  ).run(ticketId);

  console.log(`[Gmail] Created ticket ${ticketId} from thread ${threadId}`);
}

export async function pollGmailInbox() {
  if (!isGmailConfigured()) {
    console.log("[Gmail] Skipping poll — credentials not configured yet.");
    return;
  }

  const gmail = getGmailClient();
  const label = process.env.GMAIL_LABEL || "Escalations";

  const list = await gmail.users.threads.list({
    userId: "me",
    q: `label:${label} is:unread`,
    maxResults: 25,
  });

  const threads = list.data.threads || [];
  for (const t of threads) {
    if (t.id) await processThread(gmail, t.id);
  }
}

export function startGmailPolling(intervalMinutes = 5) {
  if (!isGmailConfigured()) {
    console.log(
      "[Gmail] GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN not set — polling disabled."
    );
    return;
  }
  pollGmailInbox().catch((err) => console.error("[Gmail] Poll error:", err));
  setInterval(() => {
    pollGmailInbox().catch((err) => console.error("[Gmail] Poll error:", err));
  }, intervalMinutes * 60 * 1000);
  console.log(`[Gmail] Polling started (every ${intervalMinutes} min).`);
}
