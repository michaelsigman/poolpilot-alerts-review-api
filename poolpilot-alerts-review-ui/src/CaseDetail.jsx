import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function CaseDetail() {
  const { caseId } = useParams(); // ✅ FIX

  const [caseData, setCaseData] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // -------- Case --------
        const caseRes = await fetch(`${API_BASE}/cases/${caseId}`);
        const caseJson = await caseRes.json();

        console.log("📦 Case response:", caseJson);

        if (!caseRes.ok || caseJson?.error) {
          throw new Error(caseJson?.error || "Case not found");
        }

        setCaseData(caseJson);

        // -------- Snapshots --------
        const snapRes = await fetch(
          `${API_BASE}/cases/${caseId}/snapshots`
        );
        const snapJson = await snapRes.json();

        console.log("📸 Snapshots:", snapJson);
        setSnapshots(Array.isArray(snapJson) ? snapJson : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [caseId]);

  if (loading) return <p>Loading case…</p>;
  if (error) return <p style={{ color: "red" }}>Error: {error}</p>;
  if (!caseData) return <p>No case data.</p>;

  return (
    <div style={{ padding: 20 }}>
      <h2>{caseData.system_name}</h2>

      <p><strong>Issue:</strong> {caseData.issue_type}</p>
      <p><strong>Status:</strong> {caseData.status}</p>
      <p><strong>Minutes Open:</strong> {caseData.minutes_open}</p>

      <h3>Temperature Comparison</h3>
      <table border="1" cellPadding="6">
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

      <h3>Snapshots ({snapshots.length})</h3>

      {snapshots.length === 0 ? (
        <p>No snapshots found.</p>
      ) : (
        <table border="1" cellPadding="6" width="100%">
          <thead>
            <tr>
              <th>Time</th>
              <th>Pool</th>
              <th>Spa</th>
              <th>Air</th>
              <th>Set</th>
              <th>Heater</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s, i) => (
              <tr key={i}>
                <td>{new Date(s.snapshot_ts).toLocaleString()}</td>
                <td>{s.pool_temp ?? "—"}</td>
                <td>{s.spa_temp ?? "—"}</td>
                <td>{s.air_temp ?? "—"}</td>
                <td>{s.set_point_pool ?? "—"}</td>
                <td>{s.pool_heater ? "ON" : "OFF"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
