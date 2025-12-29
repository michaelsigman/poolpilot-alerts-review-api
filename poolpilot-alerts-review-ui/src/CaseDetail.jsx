import { useEffect, useState } from "react";

const API_BASE = "http://localhost:3001"; // adjust if needed

export default function CaseDetail({ caseData, onBack }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSnapshots();
  }, [caseData.case_id]);

  async function fetchSnapshots() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/cases/${caseData.case_id}/snapshots`
      );
      const data = await res.json();
      setSnapshots(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load snapshots", err);
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={onBack}>← Back</button>

      <h3>{caseData.system_name}</h3>
      <p><strong>Agency:</strong> {caseData.agency_name || "—"}</p>
      <p><strong>Issue:</strong> {caseData.issue_type}</p>
      <p><strong>Status:</strong> {caseData.status}</p>
      <p><strong>Opened:</strong> {formatDate(caseData.opened_at)}</p>

      <h4>Snapshots</h4>

      {loading && <div>Loading snapshots…</div>}

      {!loading && snapshots.length === 0 && (
        <div>No snapshot data.</div>
      )}

      {!loading && snapshots.length > 0 && (
        <div style={{ maxHeight: 400, overflowY: "auto" }}>
          <table border="1" cellPadding="6" cellSpacing="0" width="100%">
            <thead style={{ position: "sticky", top: 0, background: "#eee" }}>
              <tr>
                <th>Time (PST)</th>
                <th>Air °F</th>
                <th>Pool °F</th>
                <th>Spa °F</th>
                <th>Set Pool</th>
                <th>Set Spa</th>
                <th>Heater</th>
                <th>Pump</th>
                <th>Service</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s, idx) => (
                <tr key={idx}>
                  <td>{formatDate(s.snapshot_ts || s.snapshot_pst)}</td>
                  <td>{s.air_temp ?? "—"}</td>
                  <td>{s.pool_temp ?? "—"}</td>
                  <td>{s.spa_temp ?? "—"}</td>
                  <td>{s.set_point_pool ?? "—"}</td>
                  <td>{s.set_point_spa ?? "—"}</td>
                  <td>{s.pool_heater || s.spa_heater ? "ON" : "OFF"}</td>
                  <td>{s.filter_pump || s.spa_pump ? "ON" : "OFF"}</td>
                  <td>{s.service_mode ? "YES" : "NO"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
