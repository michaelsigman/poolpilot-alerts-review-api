import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

function getAgencyIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("agency_id");
}

export default function App() {
  const [cases, setCases] = useState([]);
  const [tab, setTab] = useState("open");
  const [loading, setLoading] = useState(true);

  const agencyId = getAgencyIdFromUrl();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCases();
  }, [agencyId]);

  async function fetchCases() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cases`);
      const data = await res.json();
      setCases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function filteredCases() {
    let filtered = cases;

    if (agencyId) {
      filtered = filtered.filter(c => c.agency_id === agencyId);
    }

    if (tab === "open") {
      filtered = filtered.filter(c => c.status === "open");
    }
    if (tab === "resolved") {
      filtered = filtered.filter(c => c.status === "resolved");
    }

    return filtered;
  }

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        background: "#f5f7fb",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 10,
          padding: 24,
          boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
        }}
      >
        <h2 style={{ marginTop: 0 }}>PoolPilot – Alert Review</h2>

        <div style={{ marginBottom: 16, color: "#555" }}>
          {agencyId ? (
            <strong>Agency View</strong>
          ) : (
            <strong>Admin View – All Agencies</strong>
          )}
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: 20 }}>
          <button
            onClick={() => setTab("open")}
            style={{
              padding: "8px 14px",
              marginRight: 8,
              borderRadius: 6,
              border: "1px solid #ddd",
              background: tab === "open" ? "#2563eb" : "#fff",
              color: tab === "open" ? "#fff" : "#333",
              cursor: "pointer",
            }}
          >
            Open
          </button>

          <button
            onClick={() => setTab("resolved")}
            style={{
              padding: "8px 14px",
              borderRadius: 6,
              border: "1px solid #ddd",
              background: tab === "resolved" ? "#2563eb" : "#fff",
              color: tab === "resolved" ? "#fff" : "#333",
              cursor: "pointer",
            }}
          >
            Resolved
          </button>
        </div>

        {loading && <p>Loading…</p>}

        {!loading && (
          <table
            width="100%"
            cellPadding="10"
            style={{
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th>System</th>
                <th>Agency</th>
                <th>Body</th>
                <th>Issue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases().map(c => (
                <tr
                  key={c.case_id}
                  onClick={() =>
                    navigate(
                      `/cases/${c.case_id}${agencyId ? `?agency_id=${agencyId}` : ""}`
                    )
                  }
                  style={{
                    cursor: "pointer",
                    borderBottom: "1px solid #eee",
                  }}
                  onMouseEnter={e =>
                    (e.currentTarget.style.background = "#f8fafc")
                  }
                  onMouseLeave={e =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td>{c.system_name}</td>
                  <td>{c.agency_name}</td>
                  <td>{c.body_type}</td>
                  <td>{c.issue_type}</td>
                  <td>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: 6,
                        fontSize: 12,
                        background:
                          c.status === "open" ? "#fee2e2" : "#dcfce7",
                        color:
                          c.status === "open" ? "#991b1b" : "#166534",
                      }}
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
