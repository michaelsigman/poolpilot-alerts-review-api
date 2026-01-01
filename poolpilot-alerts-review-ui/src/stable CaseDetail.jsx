import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

/* ================================
   Helpers
================================ */
function normalizeTimestamp(ts) {
  if (!ts) return null;
  if (typeof ts === "string") return ts;
  if (typeof ts === "object" && ts.value) return ts.value;
  return null;
}

function formatPST(ts) {
  const n = normalizeTimestamp(ts);
  if (!n) return "—";
  const d = new Date(n);
  return isNaN(d)
    ? "—"
    : d.toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        dateStyle: "short",
        timeStyle: "medium",
      });
}

const heaterLabel = v =>
  v === 1 ? "On" : v === 3 ? "On (Standby)" : "Off";

const pumpLabel = v => (v === 1 ? "On" : "Off");

export default function CaseDetail() {
  const { case_id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  /* ================================
     Fetch case metadata
  ================================ */
  useEffect(() => {
    async function loadCase() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/cases/${case_id}`);
        const data = await res.json();
        setCaseData(data);
      } catch (e) {
        console.error("Failed to load case", e);
      } finally {
        setLoading(false);
      }
    }
    loadCase();
  }, [case_id]);

  /* ================================
     Fetch snapshots AFTER case loads
  ================================ */
  useEffect(() => {
    if (!caseData?.case_id) return;

    async function loadSnapshots() {
      try {
        const res = await fetch(
          `${API_BASE}/cases/${caseData.case_id}/snapshots`
        );
        const data = await res.json();
        setSnapshots(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load snapshots", e);
        setSnapshots([]);
      }
    }

    loadSnapshots();
  }, [caseData]);

  /* ================================
     Resolve case handler
  ================================ */
  async function resolveCase() {
    const ok = window.confirm(
      "Mark this case as resolved?\n\nIf the issue persists, a new case will be created automatically."
    );
    if (!ok) return;

    setResolving(true);
    try {
      const res = await fetch(
        `${API_BASE}/cases/${caseData.case_id}/resolve`,
        { method: "POST" }
      );
      const data = await res.json();

      if (data.ok) {
        navigate(-1); // back to dashboard
      } else {
        alert("Failed to resolve case");
      }
    } catch (e) {
      console.error(e);
      alert("Error resolving case");
    } finally {
      setResolving(false);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading case…</div>;
  if (!caseData) return <div style={{ padding: 20 }}>Case not found</div>;

  const isSpa = caseData.body_type === "spa";
  const isPool = caseData.body_type === "pool";

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)}>← Back</button>

      <h2>{caseData.system_name}</h2>

      <p><strong>Agency:</strong> {caseData.agency_name}</p>
      <p><strong>Issue:</strong> {caseData.issue_type}</p>
      <p><strong>Status:</strong> {caseData.status}</p>

      {caseData.status === "open" && (
        <button
          onClick={resolveCase}
          disabled={resolving}
          style={{
            marginTop: 12,
            padding: "8px 14px",
            background: "#c0392b",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {resolving ? "Resolving…" : "Resolve Case"}
        </button>
      )}

      <h3 style={{ marginTop: 24 }}>Snapshots</h3>

      {snapshots.length === 0 && <p>Loading Snapshots...</p>}

      {snapshots.length > 0 && (
        <table border="1" cellPadding="6" width="100%">
          <thead>
            <tr>
              <th>Time</th>
              <th>Air</th>

              {isSpa && (
                <>
                  <th>Spa Temp</th>
                  <th>Spa Set</th>
                  <th>Spa Heater</th>
                  <th>Spa Pump</th>
                </>
              )}

              {isPool && (
                <>
                  <th>Pool Temp</th>
                  <th>Pool Set</th>
                  <th>Pool Heater</th>
                  <th>Filter Pump</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s, i) => {
              const highlight =
                (isSpa && s.spa_heater === 1 && s.spa_pump === 1) ||
                (isPool && s.pool_heater === 1 && s.filter_pump === 1);

              return (
                <tr
                  key={i}
                  style={{
                    backgroundColor: highlight ? "#fdecea" : "transparent",
                  }}
                >
                  <td>{formatPST(s.snapshot_ts)}</td>
                  <td>{s.air_temp ?? "—"}</td>

                  {isSpa && (
                    <>
                      <td>{s.spa_temp ?? "—"}</td>
                      <td>{s.set_point_spa ?? "—"}</td>
                      <td>{heaterLabel(s.spa_heater)}</td>
                      <td>{pumpLabel(s.spa_pump)}</td>
                    </>
                  )}

                  {isPool && (
                    <>
                      <td>{s.pool_temp ?? "—"}</td>
                      <td>{s.set_point_pool ?? "—"}</td>
                      <td>{heaterLabel(s.pool_heater)}</td>
                      <td>{pumpLabel(s.filter_pump)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
