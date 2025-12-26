import { Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CaseDetail from "./CaseDetail";
import "./App.css";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function App() {
  const [cases, setCases] = useState([]);
  const [counts, setCounts] = useState({ open_count: 0, resolved_count: 0 });
  const [activeTab, setActiveTab] = useState("open");
  const navigate = useNavigate();

  // Load counts once
  useEffect(() => {
    fetch(`${API_BASE}/cases/counts`)
      .then(res => res.json())
      .then(setCounts)
      .catch(console.error);
  }, []);

  // Load cases by tab
  useEffect(() => {
    fetch(`${API_BASE}/cases?status=${activeTab}`)
      .then(res => res.json())
      .then(setCases)
      .catch(console.error);
  }, [activeTab]);

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="container">
            <h1>PoolPilot – Alert Review</h1>

            {/* Tabs */}
            <div className="tabs">
              <button
                className={activeTab === "open" ? "active" : ""}
                onClick={() => setActiveTab("open")}
              >
                Open Cases ({counts.open_count})
              </button>
              <button
                className={activeTab === "resolved" ? "active" : ""}
                onClick={() => setActiveTab("resolved")}
              >
                Resolved Cases ({counts.resolved_count})
              </button>
            </div>

            {/* Table */}
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
                {cases.map(c => (
                  <tr
                    key={c.case_id}
                    onClick={() => navigate(`/cases/${c.case_id}`)}
                    className="clickable"
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

      <Route path="/cases/:case_id" element={<CaseDetail />} />
    </Routes>
  );
}
