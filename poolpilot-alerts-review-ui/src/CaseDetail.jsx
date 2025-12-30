import { useEffect, useState } from "react";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function CaseDetail({ caseId, onBack }) {
  const [caseData, setCaseData] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCase();
  }, [caseId]);

  async function loadCase() {
    setLoading(true);
    try {
      const [caseRes, snapRes] = await Promise.all([
        fetch(`${API_BASE}/cases/${caseId}`),
        fetch(`${API_BASE}/cases/${caseId}/snapshots`)
      ]);

      const caseJson = await caseRes.json();
      const snapJson = await snapRes.json();

      setCaseData(caseJson);
      setSnapshots(Array.isArray(snapJson) ? snapJson : []);
    } catch (err) {
      console.error("Failed to load case detail", err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d)) return "—";
    return d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  }

  if (loading) {
    return (
      <div style={{ padding: 20 }}>
        <button onClick={onBack}>← Back</button>
        <p>Loading case…</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div style={{ padding: 20 }}>
        <button onClick={onBack}>← Back</button>
        <p>Failed to load case.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={onBack}>← Back</button>

      <h3>{caseData.system_name}</h3>
      <p><strong>Agency:</strong> {caseData.agency_name || "—"}</p>
      <p><strong>Issue:</strong> {caseData.issue_type}</p>
      <p><strong>Status:</strong> {caseData.status}</p>
      <p><strong>Opened:</strong> {formatDate(caseData.opened_at)}</p>
      <p><strong>Resolved:</strong> {formatDate(caseData.resolved_at)}</p>
      <p><strong>Minutes Open:</strong> {caseData.minutes_open}</p>

      <h4>Snapshots ({snapshots.length})</h4>

      {snapshots.length === 0 && <p>No snapshot data.</p>}

      {snapshots.length > 0 && (
        <table border="1" cellPadding="6" width="100%">
          <thead>
            <tr>
              <th>Time (PST)</th>
              <th>Air °F</th>
              <th>Pool °F</th>
              <th>Spa °F</th>
              <th>Pool Set</th>
              <th>Spa Set</th>
              <th>Pool Heater</th>
              <th>Spa Heater</th>
              <th>Filter Pump</th>
              <th>Spa Pump</th>
              <th>Service Mode</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s, i) => (
              <tr key={i}>
                <td>{formatDate(s.snapshot_pst)}</td>
                <td>{s.air_temp ?? "—"}</td>
                <td>{s.pool_temp ?? "—"}</td>
                <td>{s.spa_temp ?? "—"}</td>
                <td>{s.set_point_pool ?? "—"}</td>
                <td>{s.set_point_spa ?? "—"}</td>
                <td>{s.pool_heater}</td>
                <td>{s.spa_heater}</td>
                <td>{s.filter_pump}</td>
                <td>{s.spa_pump}</td>
                <td>{s.service_mode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
