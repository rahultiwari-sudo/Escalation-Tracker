import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchTicket, updateTicket } from "../api/tickets";

export default function TicketDetail() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);

  const load = () => {
    if (id) fetchTicket(id).then(setData).catch(console.error);
  };

  useEffect(load, [id]);

  if (!data) return <p>Loading…</p>;

  const handleStatusChange = async (status: string) => {
    await updateTicket(id!, { status: status as any });
    load();
  };

  return (
    <div>
      <h2>{data.id} — {data.subject}</h2>
      <p style={{ color: "var(--gray-600)" }}>{data.description}</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <select value={data.status} onChange={(e) => handleStatusChange(e.target.value)}>
          <option>Open</option>
          <option>In Progress</option>
          <option>Waiting</option>
          <option>Closed</option>
        </select>
        <span className={`badge ${data.priority}`}>{data.priority}</span>
        {data.breached ? <span className="badge breached">SLA BREACH</span> : null}
      </div>

      <h3>Event History</h3>
      <table>
        <thead><tr><th>Time</th><th>Type</th><th>Actor</th><th>Detail</th></tr></thead>
        <tbody>
          {data.events.map((e: any) => (
            <tr key={e.id}>
              <td>{new Date(e.created_at).toLocaleString()}</td>
              <td>{e.event_type}</td>
              <td>{e.actor}</td>
              <td>{e.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.threads?.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>Gmail Thread</h3>
          <table>
            <thead><tr><th>Time</th><th>Sender</th><th>Snippet</th></tr></thead>
            <tbody>
              {data.threads.map((t: any) => (
                <tr key={t.id}>
                  <td>{t.received_at ? new Date(t.received_at).toLocaleString() : "—"}</td>
                  <td>{t.sender}</td>
                  <td>{t.snippet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
