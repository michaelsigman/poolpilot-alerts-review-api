import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function CaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCase();
    loadSnapshots();
  }, [caseId]);

  async function loadCase() {
    const res = await fetch(`${API_BASE}/cases/${caseId}`);
    const data = await res.json();
    setCaseData(data);
  }

  async function loadSnapshots() {
    const res = await fetch(`${API_BASE}/cases/${caseId}/snapshots`);
    const data = await res.json();
    setSnapshots(data.snapshots || []);
    setLoading(false);
  }

  if (loading || !caseData) {
    return <div style={{ padding: 20 }}>Loading case…</div>;
  }

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate("/")} style={{ marginBottom: 16 }}>
        ← Back to cases
      </button>

      <h2>{caseData.system_name}</h2>
      <p><b>Issue:</b> {caseData.issue_type}</p>
      <p><b>Status:</b> {caseData.status}</p>
      <p><b>Minutes Open:</b> {caseData.minutes_open}</p>

      {/* ---------------------------
          Temperature Summary
      ---------------------------- */}
      <h3>Temperature Comparison</h3>
      <table border="1" cellPadding="6" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th></th>
            <th>Start</th>
            <th>Current</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Pool</td>
            <td>{caseData.start_pool_temp ?? "—"}°F</td>
            <td>{caseData.last_pool_temp ?? "—"}°F</td>
          </tr>
          <tr>
            <td>Spa</td>
            <td>{caseData.start_spa_temp ?? "—"}°F</td>
            <td>{caseData.last_spa_temp ?? "—"}°F</td>
          </tr>
        </tbody>
      </table>

      {/* ---------------------------
          Snapshots Table
      ---------------------------- */}
      <h3 style={{ marginTop: 30 }}>
        Snapshots ({snapshots.length})
      </h3>

      {snapshots.length === 0 ? (
        <p>No snapshots found for this case.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            border="1"
            cellPadding="6"
            style={{
              borderCollapse: "collapse",
              width: "100%",
              fontSize: 12,
            }}
          >
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Pool Temp</th>
                <th>Spa Temp</th>
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
              {snapshots.map((s, idx) => (
                <tr key={idx}>
                  <td>{new Date(s.snapshot_ts).toLocaleString()}</td>
                  <td>{s.pool_temp ?? "—"}</td>
                  <td>{s.spa_temp ?? "—"}</td>
                  <td>{s.set_point_pool ?? "—"}</td>
                  <td>{s.set_point_spa ?? "—"}</td>
                  <td>{s.pool_heater ? "ON" : "OFF"}</td>
                  <td>{s.spa_heater ? "ON" : "OFF"}</td>
                  <td>{s.filter_pump ? "ON" : "OFF"}</td>
                  <td>{s.spa_pump ? "ON" : "OFF"}</td>
                  <td>{s.service_mode ? "YES" : "NO"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---------------------------
          Human Review (future)
      ---------------------------- */}
      <h3 style={{ marginTop: 30 }}>Human Review</h3>
      <p><b>Verdict:</b> {caseData.human_verdict || "Not reviewed"}</p>
    </div>
  );
}
