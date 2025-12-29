import { useEffect, useState } from "react";
import CaseDetail from "./CaseDetail";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function App() {
  const [cases, setCases] = useState([]);
  const [tab, setTab] = useState("open");
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllCases();
  }, []);

  async function fetchAllCases() {
    setLoading(true);
    try {
      const [openRes, resolvedRes] = await Promise.all([
        fetch(`${API_BASE}/cases/open`),
        fetch(`${API_BASE}/cases/resolved`)
      ]);

      const openCases = await openRes.json();
      const resolvedCases = await resolvedRes.json();

      const merged = [
        ...(Array.isArray(openCases) ? openCases : []),
        ...(Array.isArray(resolvedCases) ? resolvedCases : [])
      ];

      setCases(merged);
    } catch (err) {
      console.error("Failed to fetch cases", err);
      setCases([]);
    } finally {
      setLoading(false);
    }
  }

  function filterCases() {
    if (tab === "open") {
      return cases.filter(c => c.status === "open");
    }
    if (tab === "resolved") {
      return cases.filter(c => c.status === "resolved");
    }
    if (tab === "capped") {
      return cases.filter(c => c.issue_type?.includes("CAPPED"));
    }
    return [];
  }

  function formatDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-US", {
      timeZone: "America/Los_Angeles"
    });
  }

  if (selectedCase) {
    return (
      <CaseDetail
        caseData={selectedCase}
        onBack={() => setSelectedCase(null)}
      />
    );
  }

  const openCount = cases.filter(c => c.status === "open").length;
  const resolvedCount = cases.filter(c => c.status === "resolved").length;
  const cappedCount = cases.filter(c =>
    c.issue_type?.includes("CAPPED")
  ).length;

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h2>PoolPilot – Alert Review</h2>

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setTab("open")}>
          Open ({openCount})
        </button>{" "}
        <button onClick={() => setTab("resolved")}>
          Resolved ({resolvedCount})
        </button>{" "}
        <button onClick={() => setTab("capped")}>
          Heater Capped ({cappedCount})
        </button>
      </div>

      {loading && <p>Loading cases…</p>}

      {!loading && filterCases().length === 0 && (
        <p>No cases to display.</p>
      )}

      {!loading && filterCases().length > 0 && (
        <table border="1" cellPadding="6" cellSpacing="0" width="100%">
          <thead>
            <tr>
              <th>System</th>
              <th>Body</th>
              <th>Issue</th>
              <th>Status</th>
              <th>Opened At (PST)</th>
              <th>Minutes Open</th>
            </tr>
          </thead>
          <tbody>
            {filterCases().map(c => (
              <tr
                key={c.case_id}
                style={{ cursor: "pointer" }}
                onClick={() => setSelectedCase(c)}
              >
                <td>{c.system_name || "—"}</td>
                <td>{c.body_type}</td>
                <td>{c.issue_type}</td>
                <td>{c.status}</td>
                <td>{formatDate(c.opened_at)}</td>
                <td>{c.minutes_open ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
