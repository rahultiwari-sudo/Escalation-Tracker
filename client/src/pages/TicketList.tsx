import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTickets } from "../api/tickets";
import type { Ticket } from "../types/ticket";

export default function TicketList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchTickets(statusFilter ? { status: statusFilter } : undefined)
      .then(setTickets)
      .catch(console.error);
  }, [statusFilter]);

  return (
    <div>
      <h2>Tickets</h2>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ marginBottom: 16, padding: 6 }}>
        <option value="">All statuses</option>
        <option value="Open">Open</option>
        <option value="In Progress">In Progress</option>
        <option value="Waiting">Waiting</option>
        <option value="Closed">Closed</option>
      </select>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Subject</th>
            <th>Priority</th>
            <th>Status</th>
            <th>AM</th>
            <th>SLA Deadline</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td>{t.subject}</td>
              <td><span className={`badge ${t.priority}`}>{t.priority}</span></td>
              <td>
                {t.status}
                {t.breached ? <span className="badge breached" style={{ marginLeft: 6 }}>SLA BREACH</span> : null}
              </td>
              <td>{t.am_owner ?? "—"}</td>
              <td>{t.sla_deadline ? new Date(t.sla_deadline).toLocaleString() : "—"}</td>
              <td><Link to={`/tickets/${t.id}`}>View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
