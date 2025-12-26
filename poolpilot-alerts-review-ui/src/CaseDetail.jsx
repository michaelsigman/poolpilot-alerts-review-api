import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

export default function CaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/cases`)
      .then(res => res.json())
      .then(rows => rows.find(r => r.case_id === caseId))
      .then(setData)
      .catch(err => console.error(err));
  }, [caseId]);

  if (!data) return <p>Loading case…</p>;

  const isResolved = data.status === "resolved";

  return (
    <div style={{ marginTop: 24 }}>
      <button onClick={() => navigate("/")}>← Back</button>

      <h3>{data.system_name}</h3>
      <p><strong>Issue:</strong> {data.issue_type}</p>
      <p><strong>Status:</strong> {data.status}</p>
      <p><strong>Minutes Open:</strong> {data.minutes_open}</p>

      <hr />

      <h4>Temperature Comparison</h4>
      <table cellPadding={6} border="1">
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
            <td>{fmt(data.start_pool_temp)}</td>
            <td>{fmt(data.last_pool_temp)}</td>
          </tr>
          <tr>
            <td>Spa</td>
            <td>{fmt(data.start_spa_temp)}</td>
            <td>{fmt(data.last_spa_temp)}</td>
          </tr>
        </tbody>
      </table>

      <hr />

      {isResolved ? (
        <ResolvedSummary data={data} />
      ) : (
        <HumanReviewForm caseId={caseId} />
      )}
    </div>
  );
}

function HumanReviewForm({ caseId }) {
  const [verdict, setVerdict] = useState("");
  const [suppressHours, setSuppressHours] = useState("");

  const submit = async () => {
    await fetch(`${API_BASE}/cases/${caseId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        human_verdict: verdict,
        expected_behavior: verdict === "expected_behavior",
        suppress_hours: suppressHours || null
      })
    });

    alert("Saved");
  };

  return (
    <>
      <h4>Human Review</h4>

      <select value={verdict} onChange={e => setVerdict(e.target.value)}>
        <option value="">— Select —</option>
        <option value="expected_behavior">Expected behavior (do not re-alert)</option>
        <option value="needs_technician">Needs technician</option>
        <option value="false_positive">False positive</option>
      </select>

      <div style={{ marginTop: 8 }}>
        Suppress alerts for{" "}
        <input
          type="number"
          value={suppressHours}
          onChange={e => setSuppressHours(e.target.value)}
          style={{ width: 60 }}
        />{" "}
        hours
      </div>

      <button style={{ marginTop: 12 }} onClick={submit}>
        Save Decision
      </button>
    </>
  );
}

function ResolvedSummary({ data }) {
  return (
    <>
      <h4>Resolution Summary</h4>
      <p><strong>Classification:</strong> {data.classification}</p>
      <p><strong>Resolved At:</strong> {data.resolved_at ?? "—"}</p>
      <p><strong>Resolution Reason:</strong> {data.resolution_reason ?? "Auto-resolved"}</p>
    </>
  );
}

function fmt(v) {
  return v === null || v === undefined ? "—" : `${v}°F`;
}
