import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CaseDetail from "./CaseDetail";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function App() {
  const [cases, setCases] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/cases`)
      .then((res) => res.json())
      .then(setCases)
      .catch(console.error);
  }, []);

  const openCases = cases.filter((c) => c.status === "open");
  const resolvedCases = cases.filter((c) => c.status === "resolved");

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div style={{ padding: 20 }}>
            <h1>PoolPilot – Alert Review</h1>

            <h2>Open Cases ({openCases.length})</h2>
            <CaseTable cases={openCases} onClick={navigate} />

            <h2>Resolved Cases ({resolvedCases.length})</h2>
            <CaseTable cases={resolvedCases} onClick={navigate} />
          </div>
        }
      />

      {/* IMPORTANT: caseId (not case_id) */}
      <Route path="/cases/:caseId" element={<CaseDetail />} />
    </Routes>
  );
}

function CaseTable({ cases, onClick }) {
  if (cases.length === 0) return <p>None</p>;

  return (
    <table border="1" cellPadding="6" width="100%">
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
        {cases.map((c) => (
          <tr
            key={c.case_id}
            style={{ cursor: "pointer" }}
            onClick={() => onClick(`/cases/${c.case_id}`)}
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
  );
}
