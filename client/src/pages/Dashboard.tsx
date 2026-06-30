import { useEffect, useState } from "react";
import { fetchSummary } from "../api/tickets";
import type { StatsSummary } from "../types/ticket";

export default function Dashboard() {
  const [stats, setStats] = useState<StatsSummary | null>(null);

  useEffect(() => {
    fetchSummary().then(setStats).catch(console.error);
  }, []);

  return (
    <div>
      <h2>Dashboard</h2>
      {!stats ? (
        <p>Loading…</p>
      ) : (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="value">{stats.open}</div>
            <div className="label">Open Tickets</div>
          </div>
          <div className="stat-card">
            <div className="value" style={{ color: "var(--red)" }}>{stats.breached}</div>
            <div className="label">SLA Breached</div>
          </div>
          <div className="stat-card">
            <div className="value">{stats.closedThisWeek}</div>
            <div className="label">Closed This Week</div>
          </div>
          <div className="stat-card">
            <div className="value">{stats.avgResolutionHours ?? "—"}</div>
            <div className="label">Avg Resolution (hrs)</div>
          </div>
        </div>
      )}
      <p style={{ color: "var(--gray-600)", fontSize: 14 }}>
        Tickets are created automatically from the Gmail "Escalations" label, or manually via the Tickets page.
      </p>
    </div>
  );
}
