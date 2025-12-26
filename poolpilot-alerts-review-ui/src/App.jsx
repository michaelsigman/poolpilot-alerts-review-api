import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CaseDetail from "./CaseDetail";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function App() {
  const [cases, setCases] = useState([]);
  const [activeTab, setActiveTab] = useState("open");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/cases`)
      .then(res => res.json())
      .then(setCases)
      .catch(err => console.error("Failed to load cases", err));
  }, []);

  const openCases = cases.filter(c => c.status === "open");
  const resolvedCases = cases.filter(c => c.status === "resolved");

  const visibleCases = activeTab === "open" ? openCases : resolvedCases;

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h2>PoolPilot – Alert Review</h2>

      {/* Tabs */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={() => setActiveTab("open")}
          style={tabStyle(activeTab === "open")}
        >
          Open Cases ({openCases.length})
        </button>

        <button
          onClick={() => setActiveTab("resolved")}
          style={tabStyle(activeTab === "resolved")}
        >
          Resolved Cases ({resolvedCases.length})
        </button>
      </div>

      <Routes>
        <Route
          path="/"
          element={
            <CaseTable
              cases={visibleCases}
              onSelect={c => navigate(`/cases/${c.case_id}`)}
            />
          }
        />

        <Route path="/cases/:caseId" element={<CaseDetail />} />
      </Routes>
    </div>
  );
}

function CaseTable({ cases, onSelect }) {
  return (
    <table width="100%" cellPadding={8} border="1">
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
        {cases.map(c => (
          <tr
            key={c.case_id}
            style={{ cursor: "pointer" }}
            onClick={() => onSelect(c)}
          >
            <td>{c.system_name}</td>
            <td>{c.body_type}</td>
            <td>{c.issue_type}</td>
            <td>{c.status}</td>
            <td>{c.minutes_open ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function tabStyle(active) {
  return {
    padding: "6px 12px",
    marginRight: 8,
    fontWeight: active ? "bold" : "normal",
    cursor: "pointer"
  };
}
