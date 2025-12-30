import { useEffect, useState } from "react";
import CaseDetail from "./CaseDetail";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function App() {
  const [cases, setCases] = useState([]);
  const [tab, setTab] = useState("all");
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCases();
  }, []);

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

  function filteredCases() {
    if (tab === "open") return cases.filter(c => c.status === "open");
    if (tab === "resolved") return cases.filter(c => c.status === "resolved");
    if (tab === "capped") return cases.filter(c => c.issue_type?.includes("CAPPED"));
    return cases;
  }

  function formatDate(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    if (isNaN(d)) return "—";
    return d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  }

  if (selectedCaseId) {
    return (
      <CaseDetail
        caseId={selectedCaseId}
        onBack={() => setSelectedCaseId(null)}
      />
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h2>PoolPilot – Alert Review</h2>

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setTab("all")}>
          All ({cases.length})
        </button>{" "}
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
        <table border="1" cellPadding="6" width="100%">
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
                onClick={() => setSelectedCaseId(c.case_id)}
              >
                <td>{c.system_name}</td>
                <td>{c.agency_name || "—"}</td>
                <td>{c.body_type}</td>
                <td>{c.issue_type}</td>
                <td>{c.status}</td>
                <td>{formatDate(c.opened_at)}</td>
                <td>{formatDate(c.resolved_at)}</td>
                <td>{c.minutes_open}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
