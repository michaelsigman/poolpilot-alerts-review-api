import { useEffect, useState } from "react";
import CaseDetail from "./CaseDetail";
import "./App.css";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function App() {
  const [openCases, setOpenCases] = useState([]);
  const [resolvedCases, setResolvedCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [activeTab, setActiveTab] = useState("open");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCases() {
      try {
        const [openRes, resolvedRes] = await Promise.all([
          fetch(`${API_BASE}/cases/open`),
          fetch(`${API_BASE}/cases/resolved`),
        ]);

        const openJson = await openRes.json();
        const resolvedJson = await resolvedRes.json();

        setOpenCases(openJson);
        setResolvedCases(resolvedJson);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load cases", err);
        setLoading(false);
      }
    }

    loadCases();
  }, []);

  if (selectedCaseId) {
    return (
      <CaseDetail
        caseId={selectedCaseId}
        onBack={() => setSelectedCaseId(null)}
      />
    );
  }

  return (
    <div className="app">
      <h1>PoolPilot – Alert Review</h1>

      <div className="tabs">
        <button
          className={activeTab === "open" ? "active" : ""}
          onClick={() => setActiveTab("open")}
        >
          Open Cases ({openCases.length})
        </button>
        <button
          className={activeTab === "resolved" ? "active" : ""}
          onClick={() => setActiveTab("resolved")}
        >
          Resolved Cases ({resolvedCases.length})
        </button>
      </div>

      {loading && <p>Loading cases…</p>}

      {!loading && (
        <table>
          <thead>
            <tr>
              <th>System</th>
              <th>Body</th>
              <th>Issue</th>
              <th>Status</th>
              {activeTab === "open" && <th>Minutes Open</th>}
            </tr>
          </thead>
          <tbody>
            {activeTab === "open" &&
              openCases.map((c) => (
                <tr
                  key={c.case_id}
                  onClick={() => setSelectedCaseId(c.case_id)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{c.system_name}</td>
                  <td>{c.body_type}</td>
                  <td>{c.issue_type}</td>
                  <td>{c.status}</td>
                  <td>{c.minutes_open}</td>
                </tr>
              ))}

            {activeTab === "resolved" &&
              resolvedCases.map((c) => (
                <tr
                  key={c.case_id}
                  onClick={() => setSelectedCaseId(c.case_id)}
                  style={{ cursor: "pointer" }}
                >
                  <td>{c.system_name}</td>
                  <td>{c.body_type}</td>
                  <td>{c.issue_type}</td>
                  <td>{c.status}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
