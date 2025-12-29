import { useEffect, useState } from "react";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

function heaterLabel(value) {
  if (value === 1) return "ON";
  if (value === 3) return "STANDBY";
  return "OFF";
}

function unwrap(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "object" && "value" in v) return v.value;
  return v;
}

function formatDateTime(v) {
  const raw = unwrap(v);
  if (!raw) return "";

  const date = new Date(raw);
  if (isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export default function CaseDetail({ caseId, onBack }) {
  const [caseData, setCaseData] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const caseRes = await fetch(`${API_BASE}/cases/${caseId}`);
        const caseJson = await caseRes.json();

        const snapRes = await fetch(
          `${API_BASE}/cases/${caseId}/snapshots`
        );
        const snapJson = await snapRes.json();

        if (!Array.isArray(snapJson)) {
          throw new Error("Snapshots response is not an array");
        }

        setCaseData(caseJson);
        setSnapshots(snapJson);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load case detail", err);
        setError(err.message);
        setLoading(false);
      }
    }

    load();
  }, [caseId]);

  if (loading) return <p>Loading case…</p>;

  if (error) {
    return (
      <div className="case-detail">
        <button onClick={onBack}>← Back to cases</button>
        <p style={{ color: "red" }}>
          <b>Error:</b> {error}
        </p>
      </div>
    );
  }

  if (!caseData) return <p>Case not found</p>;

  const isSpa = caseData.body_type === "spa";

  return (
    <div className="case-detail">
      <button onClick={onBack}>← Back to cases</button>

      {/* ===== Case Header ===== */}
      <h2>{caseData.system_name}</h2>

      <div style={{ marginBottom: "12px" }}>
        <p>
          <b>Agency:</b>{" "}
          {caseData.agency_name || <i>Unknown</i>}
        </p>
        <p><b>Issue:</b> {caseData.issue_type}</p>
        <p><b>Status:</b> {caseData.status}</p>
        <p><b>Minutes Open:</b> {caseData.minutes_open}</p>
      </div>

      <h3>Snapshots ({snapshots.length})</h3>

      {snapshots.length === 0 && <p>No snapshots found.</p>}

      {snapshots.length > 0 && (
        <div
          style={{
            maxHeight: "60vh",
            overflowY: "auto",
            border: "1px solid #ddd",
          }}
        >
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={thStyle}>Time (PST)</th>
                <th style={thStyle}>Air °F</th>
                {isSpa ? (
                  <>
                    <th style={thStyle}>Spa °F</th>
                    <th style={thStyle}>Spa Set</th>
                    <th style={thStyle}>Spa Heater</th>
                    <th style={thStyle}>Spa Pump</th>
                  </>
                ) : (
                  <>
                    <th style={thStyle}>Pool °F</th>
                    <th style={thStyle}>Pool Set</th>
                    <th style={thStyle}>Pool Heater</th>
                    <th style={thStyle}>Filter Pump</th>
                  </>
                )}
                <th style={thStyle}>Service Mode</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s, i) => (
                <tr key={i}>
                  <td>{formatDateTime(s.snapshot_pst)}</td>
                  <td>{unwrap(s.air_temp)}</td>

                  {isSpa ? (
                    <>
                      <td>{unwrap(s.spa_temp)}</td>
                      <td>{unwrap(s.set_point_spa)}</td>
                      <td>{heaterLabel(s.spa_heater)}</td>
                      <td>{s.spa_pump ? "ON" : "OFF"}</td>
                    </>
                  ) : (
                    <>
                      <td>{unwrap(s.pool_temp)}</td>
                      <td>{unwrap(s.set_point_pool)}</td>
                      <td>{heaterLabel(s.pool_heater)}</td>
                      <td>{s.filter_pump ? "ON" : "OFF"}</td>
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

const thStyle = {
  position: "sticky",
  top: 0,
  background: "#f7f7f7",
  zIndex: 2,
  padding: "8px",
  borderBottom: "1px solid #ccc",
  textAlign: "left",
};
