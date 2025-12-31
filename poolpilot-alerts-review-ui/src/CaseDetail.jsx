import { useEffect, useState } from "react";
import CaseDetail from "./CaseDetail";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

/* ================================
   Timestamp helpers
================================ */
function normalizeTimestamp(ts) {
  if (!ts) return null;
  if (typeof ts === "string") return ts;
  if (typeof ts === "object" && ts.value) return ts.value;
  return null;
}

function formatPST(ts) {
  const normalized = normalizeTimestamp(ts);
  if (!normalized) return "—";

  const d = new Date(normalized);
  if (isNaN(d.getTime())) return "—";

  return d.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/* ================================
   URL helpers
================================ */
function getAgencyIdFromUrl() {
  return new URLSearchParams(window.location.search).get("agency_id");
}

export default function App() {
  const [cases, setCases] = useState([]);
  const [tab, setTab] = useState("open");
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);

  const agencyId = getAgencyIdFromUrl();

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  async function fetchCases() {
    setLoading(true);
    try {
      const url = agencyId
        ? `${API_BASE}/cases?agencyId=${agencyId}`   // ✅ FIX
        : `${API_BASE}/cases`;

      console.log("FETCH:", url);

      const res = await fetch(url);
      const data = await res.json();
      setCases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch cases", err);
      setCases([]);
    } finally {
      setLoading(false);
    }
  }

  function filteredCases() {
    if (tab === "open") return cases.filter(c => c.status === "open");
    if (tab === "resolved") return cases.filter(c => c.status === "resolved");
    if (tab === "capped") return cases.filter(c => c.issue_type?.includes("CAPPED"));
    return cases;
  }

  const agencyMeta = cases[0] || {};

  if (selectedCase) {
    return (
      <CaseDetail
        caseData={selectedCase}
        onBack={() => setSelectedCase(null)}
      />
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h2>PoolPilot – Alert Review</h2>

      {agencyId ? (
        <div style={{ marginBottom: 12 }}>
          <strong>Agency:</strong> {agencyMeta.agency_name || "—"}<br />
          {agencyMeta.agency_email && (
            <>
              <strong>Email:</strong> {agencyMeta.agency_email}<br />
            </>
          )}
          {agencyMeta.agency_phone && (
            <>
              <strong>Phone:</strong> {agencyMeta.agency_phone}
            </>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <strong>Admin View – All Agencies</strong>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setTab("open")}>
          Open ({cases.filter(c => c.status === "open").length})
        </button>{" "}
        <button onClick={() => setTab("resolved")}>
          Resolved ({cases.filter(c => c.status === "resolved").length})
        </button>{" "}
        <button onClick={() => setTab("capped")}>
          Heater Capped ({cases.filter(c => c.issue_type?.includes("CAPPED")).length})
        </button>
      </div>

      {loading && <p>Loading cases…</p>}

      {!loading && filteredCases().length === 0 && (
        <p>No cases to display.</p>
      )}

      {!loading && filteredCases().length > 0 && (
        <table border="1" cellPadding="6" cellSpacing="0" width="100%">
          <thead>
            <tr>
              <th>System</th>
              <th>Agency</th>
              <th>Body</th>
              <th>Issue</th>
              <th>Status</th>
              <th>Opened (PST)</th>
              <th>Resolved (PST)</th>
              <th>Minutes Open</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases().map(c => (
              <tr
                key={c.case_id}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedCase(c)}
              >
                <td>{c.system_name}</td>
                <td>{c.agency_name || "—"}</td>
                <td>{c.body_type}</td>
                <td>{c.issue_type}</td>
                <td>{c.status}</td>
                <td>{formatPST(c.opened_at)}</td>
                <td>{formatPST(c.resolved_at)}</td>
                <td>{c.minutes_open ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
