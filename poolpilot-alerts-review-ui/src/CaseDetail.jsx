import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function CaseDetail() {
  const { case_id } = useParams();
  const navigate = useNavigate();
  const [c, setCase] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/cases/${case_id}`)
      .then(res => res.json())
      .then(setCase)
      .catch(console.error);
  }, [case_id]);

  if (!c) return <div>Loading…</div>;

  return (
    <div className="container">
      <button onClick={() => navigate(-1)}>← Back</button>

      <h2>{c.system_name}</h2>
      <p><strong>Issue:</strong> {c.issue_type}</p>
      <p><strong>Status:</strong> {c.status}</p>
      <p><strong>Minutes Open:</strong> {c.minutes_open}</p>

      <h3>Temperature Comparison</h3>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Start</th>
            <th>Current</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Pool</td>
            <td>{c.start_pool_temp ?? "—"}°F</td>
            <td>{c.last_pool_temp ?? "—"}°F</td>
          </tr>
          <tr>
            <td>Spa</td>
            <td>{c.start_spa_temp ?? "—"}°F</td>
            <td>{c.last_spa_temp ?? "—"}°F</td>
          </tr>
        </tbody>
      </table>

      <h3>Human Review</h3>
      <p>
        Verdict: <strong>{c.human_verdict ?? "Not reviewed"}</strong>
      </p>
    </div>
  );
}
