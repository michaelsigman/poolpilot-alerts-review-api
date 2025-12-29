import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import CaseDetail from "./CaseDetail";
import "./App.css";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function App() {
  const [cases, setCases] = useState([]);
  const [tab, setTab] = useState("open");
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_BASE}/cases`)
      .then(res => res.json())
      .then(setCases)
      .catch(console.error);
  }, []);

  const openCases = cases.filter(c => c.status === "open");
  const resolvedCases = cases.filter(c => c.status === "resolved");

  const visible =
    tab === "open" ? openCases : resolvedCases;

  return (
    <div className="container">
      <h1>PoolPilot – Alert Review</h1>

      <div className="tabs">
        <button
          className={tab === "open" ? "active" : ""}
          onClick={() => setTab("open")}
        >
          Open Cases ({openCases.length})
        </button>

        <button
          className={tab === "resolved" ? "active" : ""}
          onClick={() => setTab("resolved")}
        >
          Resolved Cases ({resolvedCases.length})
        </button>
      </div>

      <Routes>
        <Route
          path="/"
          element={
            <table>
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
                {visible.map(c => (
                  <tr
                    key={c.case_id}
                    onClick={() => navigate(`/cases/${c.case_id}`)}
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
          }
        />

        <Route path="/cases/:case_id" element={<CaseDetail />} />
      </Routes>
    </div>
  );
}
