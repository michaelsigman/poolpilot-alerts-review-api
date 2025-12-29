import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function CaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadCase() {
      try {
        const caseRes = await fetch(`${API_BASE}/cases/${caseId}`);
        const caseJson = await caseRes.json();

        if (!caseRes.ok || caseJson.error) {
          throw new Error(caseJson?.error || "Case not found");
        }

        setCaseData(caseJson);

        const snapRes = await fetch(
          `${API_BASE}/cases/${caseId}/snapshots`
        );
        const snapJson = await snapRes.json();

        setSnapshots(Array.isArray(snapJson) ? snapJson : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadCase();
  }, [caseId]);

  if (loading) return <div style={{ padding: 20 }}>Loading case…</div>;
  if (error) return <div style={{ padding: 20, color: "red" }}>Error: {error}</div>;
  if (!caseData) return <div style={{ padding: 20 }}>Case not available.</div>;

  const isSpa = caseData.body_type === "spa";
  const isPool = caseData.body_type === "pool";

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate("/")}>← Back to cases</button>

      <h2 style={{ marginTop: 10 }}>{caseData.system_name}</h2>

      <p><strong>Issue:</strong> {caseData.issue_type}</p>
      <p><strong>Status:</strong> {caseData.status}</p>
      <p><strong>Minutes Open:</strong> {caseData.minutes_open}</p>

      {/* ----------------------- */}
      {/* Temperature Comparison */}
      {/* ----------------------- */}
      <h3>Temperature Comparison</h3>
      <table border="1" cellPadding="6">
        <thead>
          <tr>
            <th></th>
            <th>Start</th>
            <th>Current</th>
          </tr>
        </thead>
        <tbody>
          {isPool && (
            <tr>
              <td>Pool</td>
              <td>{caseData.start_pool_temp ?? "—"}°F</td>
              <td>{caseData.last_pool_temp ?? "—"}°F</td>
            </tr>
          )}
          {isSpa && (
            <tr>
              <td>Spa</td>
              <td>{caseData.start_spa_temp ?? "—"}°F</td>
              <td>{caseData.last_spa_temp ?? "—"}°F</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ----------------------- */}
      {/* Snapshot Timeline */}
      {/* ----------------------- */}
      <h3 style={{ marginTop: 30 }}>
        Snapshots ({snapshots.length})
      </h3>

      {snapshots.length === 0 ? (
        <p>No snapshots found for this case.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table border="1" cellPadding="6" width="100%">
            <thead>
              <tr>
                <th>Time (PST)</th>
                <th>Air °F</th>

                {isPool && (
                  <>
                    <th>Pool °F</th>
                    <th>Pool Set</th>
                    <th>Pool Heater</th>
                    <th>Filter Pump</th>
                  </>
                )}

                {isSpa && (
                  <>
                    <th>Spa °F</th>
                    <th>Spa Set</th>
                    <th>Spa Heater</th>
                    <th>Spa Pump</th>
                  </>
                )}

                <th>Service Mode</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s, i) => (
                <tr key={i}>
                  <td>{s.snapshot_ts_pst || "—"}</td>
                  <td>{s.air_temp ?? "—"}</td>

                  {isPool && (
                    <>
                      <td>{s.pool_temp ?? "—"}</td>
                      <td>{s.set_point_pool ?? "—"}</td>
                      <td>{s.pool_heater ? "ON" : "OFF"}</td>
                      <td>{s.filter_pump ? "ON" : "OFF"}</td>
                    </>
                  )}

                  {isSpa && (
                    <>
                      <td>{s.spa_temp ?? "—"}</td>
                      <td>{s.set_point_spa ?? "—"}</td>
                      <td>{s.spa_heater ? "ON" : "OFF"}</td>
                      <td>{s.spa_pump ? "ON" : "OFF"}</td>
                    </>
                  )}

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
