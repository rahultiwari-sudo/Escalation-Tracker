import db from "../db/connection.js";

/**
 * Generates the next ticket ID in the format SG-YYYYMMDD-XXX,
 * matching the original Apps Script ticketing convention.
 */
export function generateTicketId(): string {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD

  const row = db
    .prepare(
      `SELECT id FROM tickets WHERE id LIKE ? ORDER BY id DESC LIMIT 1`
    )
    .get(`SG-${datePart}-%`) as { id: string } | undefined;

  let nextSeq = 1;
  if (row) {
    const lastSeq = parseInt(row.id.split("-")[2], 10);
    nextSeq = lastSeq + 1;
  }

  const seqPart = String(nextSeq).padStart(3, "0");
  return `SG-${datePart}-${seqPart}`;
}
