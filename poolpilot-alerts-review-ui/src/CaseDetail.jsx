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
     1️⃣ Load case metadata
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
     2️⃣ Load snapshots AFTER case loads
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
     3️⃣ Resolve case (SAFE)
  ================================ */
  async function resolveCase() {
    if (!window.confirm("Mark this case as resolved?")) return;

    setResolving(true);
    try {
      await fetch(
        `${API_BASE}/cases/${caseData.case_id}/resolve`,
        { method: "POST" }
      );

      // Reload updated case state
      const res = await fetch(`${API_BASE}/cases/${caseData.case_id}`);
      const updated = await res.json();
      setCaseData(updated);
    } catch (e) {
      console.error("Failed to resolve case", e);
      alert("Failed to resolve case");
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
            marginTop: 10,
            marginBottom: 20,
            background: "#d9534f",
            color: "white",
            padding: "8px 14px",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            opacity: resolving ? 0.6 : 1,
          }}
        >
          {resolving ? "Resolving…" : "Resolve Case"}
        </button>
      )}

      <h3>Snapshots</h3>

      {snapshots.length === 0 && <p>LOADING...</p>}

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
              const highlightSpa =
                isSpa && s.spa_heater === 1 && s.spa_pump === 1;

              const highlightPool =
                isPool && s.pool_heater === 1 && s.filter_pump === 1;

              return (
                <tr
                  key={i}
                  style={{
                    background:
                      highlightSpa || highlightPool
                        ? "#fdecea"
                        : "transparent",
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
