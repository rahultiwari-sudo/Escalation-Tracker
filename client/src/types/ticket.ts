export type Priority = "Critical" | "High" | "Normal";
export type Status = "Open" | "In Progress" | "Waiting" | "Closed";

export interface Ticket {
  id: string;
  subject: string;
  requester_name: string | null;
  requester_email: string | null;
  account_name: string | null;
  am_owner: string | null;
  team: string | null;
  priority: Priority;
  status: Status;
  category: string | null;
  description: string | null;
  gmail_thread_id: string | null;
  created_at: string;
  sla_deadline: string | null;
  first_response_at: string | null;
  closed_at: string | null;
  breached: 0 | 1;
  last_updated_at: string;
}

export interface TicketEvent {
  id: number;
  ticket_id: string;
  event_type: string;
  actor: string | null;
  detail: string | null;
  created_at: string;
}

export interface TicketThread {
  id: number;
  ticket_id: string;
  gmail_message_id: string;
  sender: string | null;
  snippet: string | null;
  received_at: string | null;
  direction: string;
}

export interface StatsSummary {
  open: number;
  breached: number;
  closedThisWeek: number;
  avgResolutionHours: number | null;
}
