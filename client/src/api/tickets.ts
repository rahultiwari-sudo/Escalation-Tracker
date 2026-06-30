import type { Ticket, StatsSummary } from "../types/ticket";

const BASE = "/api/tickets";

export async function fetchTickets(filters?: Record<string, string>): Promise<Ticket[]> {
  const params = new URLSearchParams(filters);
  const res = await fetch(`${BASE}?${params}`);
  if (!res.ok) throw new Error("Failed to fetch tickets");
  return res.json();
}

export async function fetchTicket(id: string) {
  const res = await fetch(`${BASE}/${id}`);
  if (!res.ok) throw new Error("Failed to fetch ticket");
  return res.json();
}

export async function fetchSummary(): Promise<StatsSummary> {
  const res = await fetch(`${BASE}/stats/summary`);
  if (!res.ok) throw new Error("Failed to fetch summary");
  return res.json();
}

export async function updateTicket(id: string, fields: Partial<Ticket>) {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error("Failed to update ticket");
  return res.json();
}

export async function createTicket(payload: Record<string, unknown>) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create ticket");
  return res.json();
}
