import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import CaseDetail from "./CaseDetail";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function App() {
  const [cases, setCases] = useState([]);
  const [tab, setTab] = useState("open");
  const navigate = useNavigate();

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    const res = await fetch(`${API_BASE}/cases`);
    const data = await res.json();
    setCases(data);
  }

  const openCases = cases.filter(
    (c) => c.status === "open" || c.status === "observing"
  );

  const resolvedCases = cases.filter(
    (c) => c.status === "resolved"
  );

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div style={{ padding: 20 }}>
            <h1>PoolPilot – Alert Review</h1>

            {/* Tabs */}
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => setTab("open")}
                style={{ marginRight: 10 }}
              >
                Open Cases ({openCases.length})
              </button>

              <button onClick={() => setTab("resolved")}>
                Resolved Cases ({resolvedCases.length})
              </button>
            </div>

            {/* Cases Table */}
            <table
              border="1"
              cellPadding="6"
              style={{
                borderCollapse: "collapse",
                width: "100%",
              }}
            >
              <thead>
                <tr>
                  <th>System</th>
                  <th>Body</th>
                  <th>Issue</th>
                  <th>Status</th>
                  <th>Minutes Open</th>
                </tr>
              </thead>

              <tbody>
                {(tab === "open" ? openCases : resolvedCases).map((c) => (
                  <tr
                    key={c.case_id}
                    onClick={() => navigate(`/cases/${c.case_id}`)}
                    style={{ cursor: "pointer" }}
                  >
                    <td>{c.system_name}</td>
                    <td>{c.body_type}</td>
                    <td>{c.issue_type}</td>
                    <td>{c.status}</td>
                    <td>{c.minutes_open}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      />

      <Route path="/cases/:caseId" element={<CaseDetail />} />
    </Routes>
  );
}
