import { useEffect, useMemo, useState } from "react";
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
   URL helper
================================ */
function getAgencyIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("agency_id");
}

export default function App() {
  const [cases, setCases] = useState([]);
  const [tab, setTab] = useState("open");
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);

  const agencyId = getAgencyIdFromUrl();

  /* ================================
     Fetch ALL cases (single source)
  ================================ */
  useEffect(() => {
    async function fetchCases() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/cases`);
        const data = await res.json();
        setCases(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch cases", err);
        setCases([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCases();
  }, []);

  /* ================================
     Agency scoping (STRICT)
  ================================ */
  const agencyScopedCases = useMemo(() => {
    if (!agencyId) return cases;
    return cases.filter(c => c.agency_id === agencyId);
  }, [cases, agencyId]);

  /* ================================
     Tab filtering
  ================================ */
  const visibleCases = useMemo(() => {
    if (tab === "open") {
      return agencyScopedCases.filter(c => c.status === "open");
    }
    if (tab === "resolved") {
      return agencyScopedCases.filter(c => c.status === "resolved");
    }
    if (tab === "capped") {
      return agencyScopedCases.filter(c =>
        c.issue_type?.includes("CAPPED")
      );
    }
    return agencyScopedCases;
  }, [agencyScopedCases, tab]);

  /* ================================
     Agency header info
  ================================ */
  const agencyInfo = useMemo(() => {
    if (!agencyId || agencyScopedCases.length === 0) return null;
    const c = agencyScopedCases[0];
    return {
      name: c.agency_name,
      email: c.agency_email,
      phone: c.agency_phone,
    };
  }, [agencyId, agencyScopedCases]);

  /* ================================
     Case detail view
  ================================ */
  if (selectedCase) {
    return (
      <CaseDetail
        caseData={selectedCase}
        onBack={() => setSelectedCase(null)}
      />
    );
  }

  /* ================================
     Render
  ================================ */
  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h2>PoolPilot – Alert Review</h2>

      {/* Header */}
      {agencyId ? (
        <div style={{ marginBottom: 12 }}>
          <strong>Agency:</strong> {agencyInfo?.name || "—"}
          <br />
          {agencyInfo?.email && (
            <>
              <strong>Email:</strong> {agencyInfo.email}
              <br />
            </>
          )}
          {agencyInfo?.phone && (
            <>
              <strong>Phone:</strong> {agencyInfo.phone}
            </>
          )}
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <strong>Admin View – All Agencies</strong>
        </div>
      )}

      {/* Tabs */}
      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setTab("open")}>
          Open ({agencyScopedCases.filter(c => c.status === "open").length})
        </button>{" "}
        <button onClick={() => setTab("resolved")}>
          Resolved ({agencyScopedCases.filter(c => c.status === "resolved").length})
        </button>{" "}
        <button onClick={() => setTab("capped")}>
          Heater Capped (
          {agencyScopedCases.filter(c =>
            c.issue_type?.includes("CAPPED")
          ).length}
          )
        </button>
      </div>

      {loading && <p>Loading cases…</p>}

      {!loading && visibleCases.length === 0 && (
        <p>No cases to display.</p>
      )}

      {!loading && visibleCases.length > 0 && (
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
            {visibleCases.map(c => (
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
